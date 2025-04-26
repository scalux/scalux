import React from "react";
import { connect, MapStateToProps } from "react-redux"; // Adjust import if using a different state manager connector
import { Obj } from "./utils"; // Assuming './utils' defines Obj utility type

// --- Generic Asset Types ---

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

// --- Labels ---

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
            text = defRecord[effectiveLanguage] ?? defRecord[fallBack] ?? "";
          } else {
            console.warn(
              `[SCALUX Labels] Label definition for item "${String(
                item
              )}" is invalid.`
            );
            text = String(item);
          }

          return { text };
        };
        return connect(mapStateToProps)(render);
      },
    };
  };

// --- Icons ---

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

export type IconSizePreset = "small" | "medium" | "large";

/** If both are set, customSize wins (explicit > implicit). */
export type IconComponentProps = {
  size?: IconSizePreset;
  /** CSS length (px|em|rem|%, etc.). */
  customSize?: string;
  color?: IconColors;
  [key: string]: any; // Allow className, onClick, style, etc.
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
    type OwnProps = { item: keyof Items } & Omit<
      IconComponentProps,
      "color" | "size" | "customSize"
    > &
      Partial<Pick<IconComponentProps, "color" | "size" | "customSize">>;

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
          `[SCALUX Icons] Icon component is missing for item (props passed):`,
          iconProps
        );
        return null;
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
          const { item, ...restOwnProps } = ownProps;

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
              defRecord[effectiveTheme] ?? defRecord[fallBack] ?? null;
          } else {
            console.warn(
              `[SCALUX Icons] Icon definition for item "${String(
                item
              )}" is invalid.`
            );
          }

          const iconProps: IconComponentProps = restOwnProps;

          return { IconComponent, iconProps };
        };

        return connect(mapStateToProps)(IconRenderer);
      },
    };
  };

/**
 * SVG Icon Builder Utility.
 * Creates React components from SVG files.
 */
export const svgIconBuilder = (basePath: string) => ({
  useIcons: <T extends Record<string, string>>(
    iconMap: T
  ): { [K in keyof T]: IconComponentType } => {
    const components = {} as { [K in keyof T]: IconComponentType };

    for (const key in iconMap) {
      if (Object.prototype.hasOwnProperty.call(iconMap, key)) {
        const filename = iconMap[key];
        const cleanBasePath = basePath.replace(/\/$/, "");
        const src = `${cleanBasePath}/${filename}.svg`;

        const IconComponent: IconComponentType = ({
          color,
          size = "medium", // Default preset size (IconSizePreset)
          customSize, // Custom CSS size string
          className,
          style,
          ...rest
        }: IconComponentProps) => {
          // Use the updated props type

          let dimensions: React.CSSProperties = {};

          // Apply customSize if provided, otherwise use size presets
          if (customSize) {
            dimensions = { width: customSize, height: customSize };
          } else {
            switch (size) {
              case "small":
                dimensions = { width: "1em", height: "1em", fontSize: "1rem" };
                break;
              case "large":
                dimensions = { width: "1em", height: "1em", fontSize: "2rem" };
                break;
              case "medium":
              default:
                dimensions = {
                  width: "1em",
                  height: "1em",
                  fontSize: "1.5rem",
                };
                break;
            }
          }

          const combinedClassName = [
            className,
            color ? `icon-color-${color}` : "",
            !customSize && size ? `icon-size-${size}` : "", // Add size class only if using presets
          ]
            .filter(Boolean)
            .join(" ");

          // Render using an <img> tag
          return (
            <img
              src={src}
              alt={`${key} icon`}
              style={{ ...dimensions, verticalAlign: "middle", ...style }}
              className={combinedClassName}
              {...rest}
            />
          );
        };
        components[key as keyof T] = IconComponent;
      }
    }
    return components;
  },
});
