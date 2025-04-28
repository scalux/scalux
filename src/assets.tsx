import React, { useMemo } from "react";
import { connect, MapStateToProps, useSelector } from "react-redux"; // Assuming react-redux
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

const isReactComponent = (
  component: any
): component is React.ComponentType<any> => {
  if (!component) {
    return false;
  }
  const componentType = typeof component;
  if (
    componentType === "function" &&
    component.prototype &&
    typeof component.prototype.render === "function" &&
    component.prototype.isReactComponent
  ) {
    return true;
  }
  if (componentType === "function") {
    return !component.prototype || !component.prototype.render;
  }
  if (componentType === "object" && component !== null) {
    const $$typeof = (component as any).$$typeof;
    return (
      $$typeof === Symbol.for("react.memo") ||
      $$typeof === Symbol.for("react.forward_ref")
    );
  }
  return false;
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
    type ItemKey = keyof Items;

    const getEffectiveLanguage = (currentLanguage: string): Options[number] => {
      return (options as ReadonlyArray<string>).includes(currentLanguage)
        ? currentLanguage
        : fallBack;
    };

    const resolveLabelText = (
      item: ItemKey,
      language: Options[number]
    ): string => {
      const definition = items[item];
      let text: string;

      if (typeof definition === "string") {
        text = definition;
      } else if (definition && typeof definition === "object") {
        const defRecord = definition as Record<string, string>;
        // Use requested language, fallback language, or empty string
        text = defRecord[language] ?? defRecord[fallBack] ?? "";
      } else {
        // Handle potential invalid definition (e.g., null/undefined if type allows)
        console.warn(
          `[SCALUX Labels] Label definition for item "${String(
            item
          )}" is invalid.`
        );
        text = String(item); // Fallback to item key as string
      }
      return text;
    };

    return {
      connectLabels: ({
        language,
        render,
      }: {
        language: (state: State) => string;
        render: React.FC<LabelsComponentProps & { item: ItemKey }>;
      }) => {
        type OwnProps = { item: ItemKey };
        type StateProps = LabelsComponentProps;

        const mapStateToProps: MapStateToProps<StateProps, OwnProps, State> = (
          state: State,
          ownProps: OwnProps
        ): StateProps => {
          const currentLanguage = language(state);
          const effectiveLanguage = getEffectiveLanguage(currentLanguage);
          const text = resolveLabelText(ownProps.item, effectiveLanguage);
          return { text };
        };
        return connect(mapStateToProps)(render);
      },

      mkUseLabel: (languageSelector: (state: State) => string) => {
        const useLabel = (item: ItemKey): string => {
          const currentLanguage = useSelector(languageSelector);
          // Memoize derived values to prevent unnecessary recalculations if language doesn't change
          const text = useMemo(() => {
            const effectiveLanguage = getEffectiveLanguage(currentLanguage);
            return resolveLabelText(item, effectiveLanguage);
          }, [currentLanguage, item]); // item should ideally be stable

          return text;
        };
        return useLabel;
      },

      getLabel: (item: ItemKey, language?: string): string => {
        // If language is provided, validate it, otherwise use fallback directly
        const effectiveLanguage =
          language && (options as ReadonlyArray<string>).includes(language)
            ? language
            : fallBack;
        return resolveLabelText(item, effectiveLanguage);
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

          if (isReactComponent(definition)) {
            IconComponent = definition as any;
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
