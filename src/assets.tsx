import React from "react";
import { connect, MapStateToProps } from "react-redux";
import { Obj } from "./utils";

type AssetItems<
  T extends string[],
  FallBack extends T[number],
  AssetType
> = Obj<
  | ({ [K in FallBack]: AssetType } & { [K in T[number]]?: AssetType })
  | AssetType
>;

type AssetsRegister<
  T extends string[],
  FallBack extends T[number],
  AssetType,
  Assets extends AssetItems<T, FallBack, AssetType>
> = {
  options: T;
  fallBack: FallBack;
  items: Assets;
};

export type LabelsComponentProps = { text: string };

export const mkLabels =
  <State,>() =>
  <
    const Options extends string[],
    const FallBack extends Options[number],
    const Items extends AssetItems<Options, FallBack, string>
  >({
    options,
    fallBack,
    items,
  }: AssetsRegister<Options, FallBack, string, Items>) => {
    type OwnProps = { item: keyof Items };
    type StateProps = LabelsComponentProps;

    return {
      connectLabels: ({
        language,
        render,
      }: {
        language: (state: State) => string;
        render: React.FC<LabelsComponentProps & OwnProps>;
      }) => {
        const mapStateToProps: MapStateToProps<StateProps, OwnProps, State> = (
          state: State,
          ownProps: OwnProps
        ): StateProps => {
          const currentLanguage = language(state);
          const { item } = ownProps;

          // Determine the effective language to use (from state or fallback)
          const effectiveLanguage = (options as ReadonlyArray<string>).includes(
            currentLanguage
          )
            ? currentLanguage
            : fallBack;

          const definition = items[item];
          let text: string;

          if (typeof definition === "string") {
            text = definition;
          } else if (definition && typeof definition === "object") {
            const defRecord = definition as Record<string, string>;
            text =
              defRecord[effectiveLanguage] ?? // Use effective language
              defRecord[fallBack] ?? // Or fallback if not found
              ""; // Or empty string as ultimate fallback
          } else {
            console.warn(
              `[SCALUX Labels] Label definition for item "${String(
                item
              )}" is invalid.`
            );
            text = String(item); // Display key as last resort fallback
          }

          return { text };
        };
        return connect(mapStateToProps)(render);
      },
    };
  };

export type IconColors =
  | "error"
  | "disabled"
  | "action"
  | "inherit"
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "warning";

export type IconSize = "small" | "medium" | "large";

export type IconComponentProps = {
  color?: IconColors;
  size?: IconSize;
  [key: string]: any; // Allow className, onClick, etc.
};

export type IconComponentType = React.FC<IconComponentProps>;

export const mkIcons =
  <State,>() =>
  <
    const Options extends string[],
    const FallBack extends Options[number],
    const Items extends AssetItems<Options, FallBack, IconComponentType>
  >({
    options,
    fallBack,
    items,
  }: AssetsRegister<Options, FallBack, IconComponentType, Items>) => {
    type OwnProps = { item: keyof Items } & IconComponentProps;

    type InternalProps = {
      IconComponent: IconComponentType | null;
      iconProps: IconComponentProps;
    };

    const IconRenderer: React.FC<InternalProps> = ({
      IconComponent,
      iconProps,
    }) => {
      if (!IconComponent) {
        console.warn(
          `[SCALUX Icons] Icon component is missing for props:`,
          iconProps
        );
        return null; // Render nothing if component not found
      }
      return <IconComponent {...iconProps} />;
    };

    return {
      connectIcons: ({ theme }: { theme: (state: State) => string }) => {
        const mapStateToProps: MapStateToProps<
          InternalProps,
          OwnProps,
          State
        > = (state: State, ownProps: OwnProps): InternalProps => {
          const currentTheme = theme(state);
          const { item, ...iconProps } = ownProps;

          const effectiveTheme = (options as ReadonlyArray<string>).includes(
            currentTheme
          )
            ? currentTheme
            : fallBack;

          const definition = items[item];
          let IconComponent: IconComponentType | null = null;

          if (typeof definition === "function") {
            IconComponent = definition;
          } else if (definition && typeof definition === "object") {
            const defRecord = definition as Record<string, IconComponentType>;
            IconComponent =
              defRecord[effectiveTheme] ?? // Use effective theme
              defRecord[fallBack] ?? // Or fallback if not found
              null; // Or null if definition is incomplete
          } else {
            console.warn(
              `[SCALUX Icons] Icon definition for item "${String(
                item
              )}" is invalid.`
            );
          }

          return { IconComponent, iconProps };
        };

        return connect(mapStateToProps)(IconRenderer);
      },
    };
  };

export const svgIconBuilder = (basePath: string) => ({
  useIcons: <T extends Record<string, string>>(
    iconMap: T
  ): { [K in keyof T]: IconComponentType } => {
    const components = {} as { [K in keyof T]: IconComponentType };

    for (const key in iconMap) {
      if (Object.prototype.hasOwnProperty.call(iconMap, key)) {
        const filename = iconMap[key];
        const src = `${basePath.replace(/\/$/, "")}/${filename}.svg`; // Ensure single trailing slash

        const IconComponent: IconComponentType = ({
          color, // Used to add a CSS class (e.g., icon-color-primary)
          size = "medium", // Default size
          className,
          style,
          ...rest // Other props (e.g., onClick, aria-label)
        }) => {
          let dimensions: React.CSSProperties = {};
          switch (size) {
            case "small":
              dimensions = { width: "1em", height: "1em", fontSize: "1rem" }; // ~16px
              break;
            case "large":
              dimensions = { width: "1em", height: "1em", fontSize: "2rem" }; // ~32px
              break;
            case "medium":
            default:
              dimensions = { width: "1em", height: "1em", fontSize: "1.5rem" }; // ~24px
              break;
          }

          // Combine CSS classes: base class, color class, size class
          const combinedClassName = [
            className,
            color ? `icon-color-${color}` : "", // e.g., .icon-color-primary
            size ? `icon-size-${size}` : "", // e.g., .icon-size-small
          ]
            .filter(Boolean) // Remove empty strings
            .join(" ");

          return (
            <img
              src={src}
              alt={`${key} icon`} // Basic alt text, can be overridden via props
              style={{ ...dimensions, verticalAlign: "middle", ...style }} // Base style + incoming style
              className={combinedClassName}
              {...rest} // Pass other props
            />
          );
        };
        // Assign the created component to the corresponding key in the result object
        components[key as keyof T] = IconComponent;
      }
    }
    return components;
  },
});
