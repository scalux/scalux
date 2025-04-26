import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
// Updated imports for hook testing
import { render, screen, renderHook, act } from "@testing-library/react";
import { mkLabels, mkIcons, svgIconBuilder } from "../../src/assets";
import type { LabelsComponentProps, IconComponentType } from "../../src/assets";

// --- Type definitions ---
type MockStateLang = { lang: string };
type MockStateTheme = { ui: { theme: string } };

// --- Mock State ---
// Make state mutable for hook tests
let mockState: MockStateLang | MockStateTheme = { lang: "en" };

// --- Mock react-redux ---
vi.mock("react-redux", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-redux")>();
  return {
    ...original,
    connect: vi.fn((mapStateToProps?) => (component: any) => {
      // Keep the existing simple connect mock for mapStateToProps tests
      const MockConnectedComponent = (props: any) => component(props);
      MockConnectedComponent.mapStateToProps = mapStateToProps;
      return MockConnectedComponent;
    }),
    // Mock useSelector to read from our mutable mockState
    // It now needs to handle different state shapes potentially, but
    // tests are separated, so we set the correct shape before test runs.
    useSelector: vi.fn((selector: (state: any) => any) => selector(mockState)),
  };
});

// Import mocked useSelector for direct use if needed
import { useSelector } from "react-redux";

describe("Assets Internal Helpers and Builders", () => {
  // Reset mocks and state before each test in this suite
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to a default state, specific tests might override this
    mockState = { lang: "en" };
  });

  // --- Group Tests for mkLabels ---
  describe("mkLabels Functionality", () => {
    // --- Shared Configuration for Labels ---
    const labelsConfig = {
      options: ["en", "fr", "es"] as const, // Use "as const" for stricter type checking
      fallBack: "en" as const,
      items: {
        greeting: { en: "Hello", fr: "Bonjour" }, // Missing 'es' intentionally
        farewell: "Goodbye" as const, // Static label
        complex: { en: "Complex", fr: "Complexe", es: "Complejo" },
        onlyFallback: { en: "Only English" },
      },
    };

    // Instantiate helpers once for all label tests
    const { connectLabels, mkUseLabel, getLabel } = mkLabels<MockStateLang>()(
      labelsConfig as any
    );

    // Reset language state before each label test
    beforeEach(() => {
      mockState = { lang: "en" };
    });

    // --- Tests for connectLabels (mapStateToProps) ---
    describe("connectLabels - mapStateToProps logic", () => {
      const DummyLabel = ({ text }: LabelsComponentProps) =>
        React.createElement("span", null, text);

      // Note: The connect mock doesn't actually render/connect fully,
      // we test the generated mapStateToProps directly.
      const ConnectedLabel = connectLabels({
        language: (state) => state.lang,
        render: DummyLabel,
      });

      // Extract mapStateToProps from the mocked component
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

      it("should use fallback language if state language is missing translation", () => {
        const state: MockStateLang = { lang: "es" }; // 'es' exists in options
        // greeting doesn't have 'es', should fallback to 'en'
        expect(mapStateToProps(state, { item: "greeting" })).toEqual({
          text: "Hello",
        });
        // complex has 'es'
        expect(mapStateToProps(state, { item: "complex" })).toEqual({
          text: "Complejo",
        });
      });

      it("should use fallback language if state language is not in options", () => {
        const stateUnknown: MockStateLang = { lang: "de" }; // 'de' not in options
        expect(mapStateToProps(stateUnknown, { item: "greeting" })).toEqual({
          text: "Hello",
        });
        expect(mapStateToProps(stateUnknown, { item: "complex" })).toEqual({
          text: "Complex", // Fallback 'en'
        });
      });

      it("should use static label if defined", () => {
        const stateFr: MockStateLang = { lang: "fr" };
        expect(mapStateToProps(stateFr, { item: "farewell" })).toEqual({
          text: "Goodbye",
        });
        const stateEn: MockStateLang = { lang: "en" };
        expect(mapStateToProps(stateEn, { item: "farewell" })).toEqual({
          text: "Goodbye",
        });
      });

      it("should handle missing item key with warning", () => {
        const state: MockStateLang = { lang: "fr" };
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(mapStateToProps(state, { item: "missingKey" as any })).toEqual({
          text: "missingKey", // Falls back to the key itself
        });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          `[SCALUX Labels] Label definition for item "missingKey" is invalid.`
        );
        warnSpy.mockRestore();
      });
    });

    // --- Tests for getLabel ---
    describe("getLabel logic", () => {
      it("should return label for fallback language by default", () => {
        expect(getLabel("greeting")).toBe("Hello");
        expect(getLabel("complex")).toBe("Complex");
      });

      it("should return label for specified valid language", () => {
        expect(getLabel("greeting", "fr")).toBe("Bonjour");
        expect(getLabel("complex", "es")).toBe("Complejo");
        expect(getLabel("complex", "en")).toBe("Complex");
      });

      it("should return fallback label if specified language is invalid/unsupported", () => {
        expect(getLabel("greeting", "de")).toBe("Hello"); // 'de' not in options
        expect(getLabel("complex", "it")).toBe("Complex"); // 'it' not in options
      });

      it("should return fallback label if specified language is missing translation", () => {
        // 'es' is a valid option, but 'greeting' doesn't have it
        expect(getLabel("greeting", "es")).toBe("Hello");
        // 'fr' is valid, but 'onlyFallback' doesn't have it
        expect(getLabel("onlyFallback", "fr")).toBe("Only English");
      });

      it("should return static label regardless of specified language", () => {
        expect(getLabel("farewell")).toBe("Goodbye");
        expect(getLabel("farewell", "fr")).toBe("Goodbye");
        expect(getLabel("farewell", "de")).toBe("Goodbye"); // Even for invalid lang
      });

      it("should handle missing item key with warning and return key", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(getLabel("missingKey" as any)).toBe("missingKey");
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          `[SCALUX Labels] Label definition for item "missingKey" is invalid.`
        );
        warnSpy.mockRestore();
      });
    });

    // --- Tests for mkUseLabel / useLabel ---
    describe("useLabel hook logic", () => {
      // Create the hook using the shared config and a selector
      const languageSelector = (state: MockStateLang) => state.lang;
      const useLabel = mkUseLabel(languageSelector);

      it("should return correct label based on initial state from useSelector", () => {
        mockState = { lang: "fr" }; // Set state *before* rendering hook
        const { result } = renderHook(() => useLabel("greeting"));
        expect(result.current).toBe("Bonjour");
        expect(useSelector).toHaveBeenCalledWith(languageSelector);
      });

      it("should return static label", () => {
        mockState = { lang: "fr" };
        const { result } = renderHook(() => useLabel("farewell"));
        expect(result.current).toBe("Goodbye");
      });

      it("should return fallback label if state language is missing translation", () => {
        mockState = { lang: "es" }; // 'es' valid, but 'greeting' missing it
        const { result } = renderHook(() => useLabel("greeting"));
        expect(result.current).toBe("Hello"); // Fallback 'en'
      });

      it("should return fallback label if state language is not in options", () => {
        mockState = { lang: "de" }; // 'de' not in options
        const { result } = renderHook(() => useLabel("greeting"));
        expect(result.current).toBe("Hello"); // Fallback 'en'
      });

      it("should return updated label when state language changes", () => {
        // Initial state: 'en'
        mockState = { lang: "en" };
        const { result, rerender } = renderHook(() => useLabel("complex"));
        expect(result.current).toBe("Complex");

        // Simulate state update to 'es'
        act(() => {
          mockState = { lang: "es" };
        });
        // useSelector mock will now return 'es' upon re-render
        rerender();

        expect(result.current).toBe("Complejo");

        // Simulate state update to 'fr'
        act(() => {
          mockState = { lang: "fr" };
        });
        rerender();
        expect(result.current).toBe("Complexe");
      });

      it("should handle missing item key with warning and return key", () => {
        mockState = { lang: "fr" };
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { result } = renderHook(() => useLabel("missingKey" as any));

        expect(result.current).toBe("missingKey");
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          `[SCALUX Labels] Label definition for item "missingKey" is invalid.`
        );
        warnSpy.mockRestore();
      });
    });
  }); // End describe("mkLabels Functionality")

  // --- Tests for mkIcons (Unchanged) ---
  describe("mkIcons - mapStateToProps logic", () => {
    // Reset theme state before each icon test
    beforeEach(() => {
      mockState = { ui: { theme: "light" } };
    });

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
        Add: { light: IconEditLight }, // Missing dark intentionally
      },
    });

    // This Component is only used to extract mapStateToProps
    const ConnectedIcon = connectIcons({
      theme: (state: MockStateTheme) => state.ui.theme,
      // No render needed as we only test mapState
    });

    const mapStateToProps = (ConnectedIcon as any).mapStateToProps;

    it("should select correct IconComponent based on state theme", () => {
      mockState = { ui: { theme: "dark" } }; // Set specific state for this test
      const ownProps = { item: "Edit", color: "primary" } as const;
      const result = mapStateToProps(mockState, ownProps);

      expect(result.IconComponent).toBe(IconEditDark);
      expect(result.iconProps).toEqual({ color: "primary" });
    });

    it("should use fallback theme if state theme has missing definition or is not in options", () => {
      // State theme has missing definition for 'Add' item
      mockState = { ui: { theme: "dark" } };
      expect(mapStateToProps(mockState, { item: "Add" }).IconComponent).toBe(
        IconEditLight // Fallback 'light'
      );

      // State theme 'sepia' is not in options
      mockState = { ui: { theme: "sepia" } };
      expect(mapStateToProps(mockState, { item: "Edit" }).IconComponent).toBe(
        IconEditLight
      ); // Fallback 'light'
      expect(mapStateToProps(mockState, { item: "Add" }).IconComponent).toBe(
        IconEditLight // Fallback 'light'
      );
    });

    it("should use static IconComponent if defined", () => {
      mockState = { ui: { theme: "light" } };
      expect(mapStateToProps(mockState, { item: "Delete" }).IconComponent).toBe(
        IconDelete
      );

      mockState = { ui: { theme: "dark" } };
      expect(mapStateToProps(mockState, { item: "Delete" }).IconComponent).toBe(
        IconDelete
      );
    });

    it("should pass through iconProps correctly, excluding 'item'", () => {
      mockState = { ui: { theme: "light" } };
      const ownProps = {
        item: "Edit",
        color: "secondary",
        size: "large",
        className: "my-icon",
        onClick: vi.fn(),
      } as const;
      const result = mapStateToProps(mockState, ownProps);

      // Check that all props except 'item' are passed
      expect(result.iconProps).toEqual({
        color: "secondary",
        size: "large",
        className: "my-icon",
        onClick: ownProps.onClick,
      });
      expect(result.iconProps).not.toHaveProperty("item");
    });

    it("should handle missing item definitions with warning and null component", () => {
      mockState = { ui: { theme: "light" } };
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = mapStateToProps(mockState, { item: "NonExistent" as any });

      expect(result.IconComponent).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        `[SCALUX Icons] Icon definition for item "NonExistent" is invalid.`
      );
      warnSpy.mockRestore();
    });
  }); // End describe("mkIcons - mapStateToProps logic")

  // --- Tests for svgIconBuilder (Unchanged) ---
  describe("svgIconBuilder", () => {
    const builder = svgIconBuilder("/assets/icons");
    // Note: useIcons is a hook, but here it's just setting up components.
    // Actual rendering tests don't rely on React state hooks here.
    const { SaveIcon, OpenIcon } = builder.useIcons({
      SaveIcon: "save-file",
      OpenIcon: "open-folder",
    });

    it("should return an object with React components", () => {
      expect(SaveIcon).toBeDefined();
      expect(OpenIcon).toBeDefined();
      expect(typeof SaveIcon).toBe("function"); // Check if it's a component function
      expect(typeof OpenIcon).toBe("function");
    });

    it("generated component should render an img tag with correct src and alt", () => {
      render(React.createElement(SaveIcon));
      // Use getByRole for accessibility check and robustness
      const img = screen.getByRole("img", {
        name: "SaveIcon icon",
      }) as HTMLImageElement;
      // Vitest-dom equivalent might be more direct if available: expect(img).toBeInTheDocument();
      expect(img).toBeTruthy(); // Basic check if element exists
      // Check src (handle potential base URL differences in test environments)
      expect(img.src).toMatch(/\/assets\/icons\/save-file\.svg$/);
    });

    it("generated component should apply default size and styles", () => {
      render(React.createElement(OpenIcon));
      const img = screen.getByRole("img", {
        name: "OpenIcon icon",
      }) as HTMLImageElement;
      expect(img.style.width).toBe("1em");
      expect(img.style.height).toBe("1em");
      expect(img.style.fontSize).toBe("1.5rem"); // Default 'medium' size
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
      expect(img.src).toMatch(/\/assets\/icons\/save-file\.svg$/);
      expect(img.className).toContain("icon-color-primary");
      expect(img.className).toContain("icon-size-small");
      expect(img.className).toContain("extra-class");
      expect(img.style.fontSize).toBe("1rem"); // Size 'small'
      expect(img.style.border).toBe("1px solid red"); // Custom style
      img.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should handle basePath with trailing slash", () => {
      const builderTrailing = svgIconBuilder("/assets/icons/");
      const { TestIcon } = builderTrailing.useIcons({ TestIcon: "test" });
      render(React.createElement(TestIcon));
      const img = screen.getByRole("img", {
        name: "TestIcon icon",
      }) as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img.src).toMatch(/\/assets\/icons\/test\.svg$/); // Ensure no double slash
    });

    it("should apply customSize style when provided", () => {
      render(React.createElement(OpenIcon, { customSize: "40px" }));
      const img = screen.getByRole("img", {
        name: "OpenIcon icon",
      }) as HTMLImageElement;

      expect(img.style.width).toBe("40px");
      expect(img.style.height).toBe("40px");
      // Should NOT apply em/fontSize sizing from presets
      expect(img.style.fontSize).toBe(""); // Or default browser/CSS value, not the preset size
      // Should NOT add preset size class
      expect(img.className).not.toContain("icon-size-");
    });

    it("should prioritize customSize over size preset prop", () => {
      render(
        React.createElement(SaveIcon, { customSize: "3em", size: "small" })
      );
      const img = screen.getByRole("img", {
        name: "SaveIcon icon",
      }) as HTMLImageElement;

      // customSize should win
      expect(img.style.width).toBe("3em");
      expect(img.style.height).toBe("3em");
      // Should NOT apply styles from size="small" (fontSize)
      expect(img.style.fontSize).not.toBe("1rem");
      // Should NOT add class from size="small"
      expect(img.className).not.toContain("icon-size-small");
      expect(img.className).not.toContain("icon-size-"); // No size class at all
    });

    it("should apply customSize alongside color class and other props", () => {
      const handleClick = vi.fn();
      render(
        React.createElement(OpenIcon, {
          customSize: "24px",
          color: "secondary",
          className: "another-class",
          style: { opacity: "0.8" },
          onClick: handleClick,
          "data-testid": "open-custom-icon",
        })
      );

      const img = screen.getByTestId("open-custom-icon") as HTMLImageElement;
      // Check custom size style
      expect(img.style.width).toBe("24px");
      expect(img.style.height).toBe("24px");
      // Check other props are still applied
      expect(img.className).toContain("icon-color-secondary");
      expect(img.className).toContain("another-class");
      expect(img.className).not.toContain("icon-size-"); // No preset size class
      expect(img.style.opacity).toBe("0.8"); // Custom style merged
      img.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  }); // End describe("svgIconBuilder")
}); // End describe("Assets Internal Helpers and Builders")
