import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { mkLabels, mkIcons, svgIconBuilder } from "../../src/assets";
import type { LabelsComponentProps, IconComponentType } from "../../src/assets";

vi.mock("react-redux", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-redux")>();
  return {
    ...original,
    connect: vi.fn((mapStateToProps?) => (component: any) => {
      const MockConnectedComponent = (props: any) => component(props);
      MockConnectedComponent.mapStateToProps = mapStateToProps;
      return MockConnectedComponent;
    }),
  };
});

describe("Assets Internal Helpers and Builders", () => {
  type MockStateLang = { lang: string };
  type MockStateTheme = { ui: { theme: string } };

  describe("mkLabels - mapStateToProps logic", () => {
    const { connectLabels } = mkLabels<MockStateLang>()({
      options: ["en", "fr", "es"],
      fallBack: "en",
      items: {
        greeting: { en: "Hello", fr: "Bonjour" },
        farewell: "Goodbye",
        complex: { en: "Complex", fr: "Complexe", es: "Complejo" },
      },
    });

    const DummyLabel = ({ text }: LabelsComponentProps) =>
      React.createElement("span", null, text);

    const ConnectedLabel = connectLabels({
      language: (state) => state.lang,
      render: DummyLabel,
    });

    const mapStateToProps = (ConnectedLabel as any).mapStateToProps;

    it("should select correct label based on state language", () => {
      const state: MockStateLang = { lang: "fr" };
      expect(mapStateToProps(state, { item: "greeting" })).toEqual({
        text: "Bonjour",
      });
      expect(mapStateToProps(state, { item: "complex" })).toEqual({
        text: "Complexe",
      });
    });

    it("should use fallback language if state language is missing or not in options", () => {
      const stateMissing: MockStateLang = { lang: "es" };
      expect(mapStateToProps(stateMissing, { item: "greeting" })).toEqual({
        text: "Hello",
      });

      const stateUnknown: MockStateLang = { lang: "de" };
      expect(mapStateToProps(stateUnknown, { item: "greeting" })).toEqual({
        text: "Hello",
      });
      expect(mapStateToProps(stateUnknown, { item: "complex" })).toEqual({
        text: "Complex",
      });
    });

    it("should use static label if defined", () => {
      const state: MockStateLang = { lang: "fr" };
      expect(mapStateToProps(state, { item: "farewell" })).toEqual({
        text: "Goodbye",
      });
      const stateEn: MockStateLang = { lang: "en" };
      expect(mapStateToProps(stateEn, { item: "farewell" })).toEqual({
        text: "Goodbye",
      });
    });

    it("should handle cases where definition is missing (though TS should prevent)", () => {
      const state: MockStateLang = { lang: "fr" };
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(mapStateToProps(state, { item: "missingKey" as any })).toEqual({
        text: "missingKey",
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        `[SCALUX Labels] Label definition for item "missingKey" is invalid.`
      );
      warnSpy.mockRestore();
    });
  });

  describe("mkIcons - mapStateToProps logic", () => {
    const IconEditLight: IconComponentType = (props) =>
      React.createElement("svg", { ...props, id: "EditLight" });
    const IconEditDark: IconComponentType = (props) =>
      React.createElement("svg", { ...props, id: "EditDark" });
    const IconDelete: IconComponentType = (props) =>
      React.createElement("svg", { ...props, id: "Delete" });

    const { connectIcons } = mkIcons<MockStateTheme>()({
      options: ["light", "dark"],
      fallBack: "light",
      items: {
        Edit: { light: IconEditLight, dark: IconEditDark },
        Delete: IconDelete,
        Add: { light: IconEditLight },
      },
    });

    const ConnectedIcon = connectIcons({
      theme: (state) => state.ui.theme,
    });

    const mapStateToProps = (ConnectedIcon as any).mapStateToProps;

    it("should select correct IconComponent based on state theme", () => {
      const state: MockStateTheme = { ui: { theme: "dark" } };
      const ownProps = { item: "Edit", color: "primary" } as const;
      const result = mapStateToProps(state, ownProps);

      expect(result.IconComponent).toBe(IconEditDark);
      expect(result.iconProps).toEqual({ color: "primary" });
    });

    it("should use fallback theme if state theme is missing or not in options", () => {
      const stateMissing: MockStateTheme = { ui: { theme: "dark" } };
      expect(mapStateToProps(stateMissing, { item: "Add" }).IconComponent).toBe(
        IconEditLight
      );

      const stateUnknown: MockStateTheme = { ui: { theme: "sepia" } };
      expect(
        mapStateToProps(stateUnknown, { item: "Edit" }).IconComponent
      ).toBe(IconEditLight);
      expect(mapStateToProps(stateUnknown, { item: "Add" }).IconComponent).toBe(
        IconEditLight
      );
    });

    it("should use static IconComponent if defined", () => {
      const stateLight: MockStateTheme = { ui: { theme: "light" } };
      expect(
        mapStateToProps(stateLight, { item: "Delete" }).IconComponent
      ).toBe(IconDelete);
      const stateDark: MockStateTheme = { ui: { theme: "dark" } };
      expect(mapStateToProps(stateDark, { item: "Delete" }).IconComponent).toBe(
        IconDelete
      );
    });

    it("should pass through iconProps correctly", () => {
      const state: MockStateTheme = { ui: { theme: "light" } };
      const ownProps = {
        item: "Edit",
        color: "secondary",
        size: "large",
        className: "my-icon",
        onClick: vi.fn(),
      } as const;
      const result = mapStateToProps(state, ownProps);

      expect(result.iconProps).toEqual({
        color: "secondary",
        size: "large",
        className: "my-icon",
        onClick: ownProps.onClick,
      });
      expect(result.iconProps).not.toHaveProperty("item");
    });

    it("should handle missing definitions", () => {
      const state: MockStateTheme = { ui: { theme: "light" } };
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = mapStateToProps(state, { item: "NonExistent" as any });
      expect(result.IconComponent).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        `[SCALUX Icons] Icon definition for item "NonExistent" is invalid.`
      );
      warnSpy.mockRestore();
    });
  });

  describe("svgIconBuilder", () => {
    const builder = svgIconBuilder("/assets/icons");
    const { SaveIcon, OpenIcon } = builder.useIcons({
      SaveIcon: "save-file",
      OpenIcon: "open-folder",
    });

    it("should return an object with React components", () => {
      expect(SaveIcon).toBeDefined();
      expect(OpenIcon).toBeDefined();
      expect(typeof SaveIcon).toBe("function");
      expect(typeof OpenIcon).toBe("function");
    });

    it("generated component should render an img tag with correct src", () => {
      render(React.createElement(SaveIcon));
      const img = screen.getByRole("img", {
        name: /SaveIcon icon/i,
      }) as HTMLImageElement;
      (expect(img) as any).toBeInTheDocument();
      const parsedUrl = new URL(img.src);
      expect(parsedUrl.pathname).toBe("/assets/icons/save-file.svg");
      expect(img.src).toContain("/assets/icons/save-file.svg");
    });

    it("generated component should apply default size and styles", () => {
      render(React.createElement(OpenIcon));
      const img = screen.getByRole("img", {
        name: /OpenIcon icon/i,
      }) as HTMLImageElement;
      expect(img.style.width).toBe("1em");
      expect(img.style.height).toBe("1em");
      expect(img.style.fontSize).toBe("1.5rem"); // medium par défaut
      expect(img.style.verticalAlign).toBe("middle");
      expect(img.className).toContain("icon-size-medium");
    });

    it("generated component should apply color and size classes and props", () => {
      const handleClick = vi.fn();
      render(
        React.createElement(SaveIcon, {
          color: "primary",
          size: "small",
          className: "extra-class",
          style: { border: "1px solid red" },
          onClick: handleClick,
          "data-testid": "save-svg-icon",
        })
      );

      const img = screen.getByTestId("save-svg-icon") as HTMLImageElement;
      expect(img.src).toContain("/assets/icons/save-file.svg");
      expect(img.className).toContain("icon-color-primary");
      expect(img.className).toContain("icon-size-small");
      expect(img.className).toContain("extra-class");
      expect(img.style.fontSize).toBe("1rem");
      expect(img.style.border).toBe("1px solid red");
      img.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should handle basePath with trailing slash", () => {
      const builderTrailing = svgIconBuilder("/assets/icons/");
      const { TestIcon } = builderTrailing.useIcons({ TestIcon: "test" });
      render(React.createElement(TestIcon));
      const img = screen.getByRole("img", {
        name: /TestIcon icon/i,
      }) as HTMLImageElement;
      (expect(img) as any).toBeInTheDocument();
      const parsedUrl = new URL(img.src);
      expect(parsedUrl.pathname).toBe("/assets/icons/test.svg");
    });
  });
});
