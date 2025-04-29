// tests/unit/ConditionalInternal.test.tsx // Extension .tsx pour le JSX
import React from "react"; // Nécessaire pour React.ReactNode et les éléments JSX
import { describe, it, expect, vi } from "vitest";
import { mkConditional } from "../../src/Conditional"; // Ajustez le chemin si nécessaire

// --- Mocking dependencies ---
vi.mock("react-redux", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-redux")>();
  return {
    ...original,
    connect: vi.fn(
      (mapStateToProps?) => (component: React.ComponentType<any>) => {
        const MockConnectedComponent = (props: any) =>
          (component as any)(props);
        MockConnectedComponent.mapStateToProps = mapStateToProps;
        MockConnectedComponent.displayName = `Connected(${
          component.displayName || component.name || "Component"
        })`;
        return MockConnectedComponent as any;
      }
    ),
  };
});

// On importe connect après le mock
import { connect } from "react-redux";

// --- Setup ---
interface TestState {
  user: { isLoggedIn: boolean; name: string } | null;
  items: Record<string, string>;
  counter: number;
  featureEnabled: boolean;
}

const conditionalBuilder = mkConditional<TestState>();

describe("mkConditional", () => {
  // Fonction utilitaire pour extraire mapStateToProps du dernier appel à connect
  const getMapStateToPropsFromConnect = () => {
    const connectMock = connect as any;
    if (connectMock.mock.calls.length === 0) {
      throw new Error("connect() was not called in this test.");
    }
    const lastCallArgs =
      connectMock.mock.calls[connectMock.mock.calls.length - 1];
    const mapStateToProps = lastCallArgs[0];
    expect(mapStateToProps).toBeDefined();
    expect(typeof mapStateToProps).toBe("function");
    return mapStateToProps;
  };

  it("should create a component that renders the node when selector returns a value (no ownProps)", () => {
    const selector = (state: TestState) =>
      state.user?.isLoggedIn ? (
        <span>Welcome {state.user.name}</span>
      ) : undefined;

    conditionalBuilder(selector); // Crée le composant (et appelle connect)
    const mapStateToProps = getMapStateToPropsFromConnect();

    // Teste avec un état où l'utilisateur est connecté
    const loggedInState: TestState = {
      user: { isLoggedIn: true, name: "Alice" },
      items: {},
      counter: 0,
      featureEnabled: false,
    };
    let reduxProps = mapStateToProps(loggedInState, {});
    expect(reduxProps.node).toBeDefined();
    // --- Correction ---
    // Vérification plus robuste au lieu de toEqual sur l'élément JSX complet
    const nodeElement = reduxProps.node as React.ReactElement;
    expect(nodeElement.type).toBe("span");
    // Vérifie que les enfants sont bien 'Welcome ' et 'Alice'
    expect(nodeElement.props.children).toEqual(["Welcome ", "Alice"]);
    // --- Fin Correction ---

    // Teste avec un état où l'utilisateur n'est pas connecté
    const loggedOutState: TestState = {
      user: null,
      items: {},
      counter: 0,
      featureEnabled: false,
    };
    reduxProps = mapStateToProps(loggedOutState, {});
    expect(reduxProps).toEqual({ node: undefined }); // Reste inchangé, undefined est simple
  });

  it("should create a component that implicitly uses fallback (null) when selector returns undefined", () => {
    const selector = (state: TestState) =>
      state.featureEnabled ? <div>Feature Active</div> : undefined;

    conditionalBuilder(selector);
    const mapStateToProps = getMapStateToPropsFromConnect();

    const featureDisabledState: TestState = {
      user: null,
      items: {},
      counter: 0,
      featureEnabled: false,
    };
    const reduxProps = mapStateToProps(featureDisabledState, {});
    expect(reduxProps).toEqual({ node: undefined }); // OK

    const featureEnabledState: TestState = {
      user: null,
      items: {},
      counter: 0,
      featureEnabled: true,
    };
    const reduxPropsEnabled = mapStateToProps(featureEnabledState, {});
    expect(reduxPropsEnabled.node).toBeDefined();
    // --- Correction ---
    const nodeElement = reduxPropsEnabled.node as React.ReactElement;
    expect(nodeElement.type).toBe("div");
    // Si l'enfant est une simple chaîne, la comparaison directe fonctionne souvent
    expect(nodeElement.props.children).toEqual("Feature Active");
    // --- Fin Correction ---
  });

  it("should use the provided fallback node when selector returns undefined", () => {
    const selector = (state: TestState) =>
      state.counter > 10 ? <p>Counter is high!</p> : undefined;
    const fallbackNode = <div>Loading counter...</div>;

    conditionalBuilder(selector, fallbackNode);
    const mapStateToProps = getMapStateToPropsFromConnect();

    const lowCounterState: TestState = {
      user: null,
      items: {},
      counter: 5,
      featureEnabled: false,
    };
    const reduxProps = mapStateToProps(lowCounterState, {});
    expect(reduxProps).toEqual({ node: undefined }); // OK

    const highCounterState: TestState = {
      user: null,
      items: {},
      counter: 15,
      featureEnabled: false,
    };
    const reduxPropsHigh = mapStateToProps(highCounterState, {});
    expect(reduxPropsHigh.node).toBeDefined();
    // --- Correction ---
    const nodeElement = reduxPropsHigh.node as React.ReactElement;
    expect(nodeElement.type).toBe("p");
    expect(nodeElement.props.children).toEqual("Counter is high!");
    // --- Fin Correction ---
  });

  it("should pass ownProps correctly to the selector", () => {
    interface OwnProps {
      itemId: string;
      showDefault?: boolean;
    }
    const selector = (state: TestState, ownProps?: OwnProps) => {
      if (!ownProps?.itemId) return undefined; // Garde plus robuste
      const item = state.items[ownProps.itemId];
      if (item) {
        return <span>Item: {item}</span>;
      }
      return ownProps.showDefault ? <span>Default Item</span> : undefined;
    };
    const fallbackNode = <span>Item not found</span>;

    conditionalBuilder<OwnProps>(selector, fallbackNode);
    const mapStateToProps = getMapStateToPropsFromConnect();

    const state: TestState = {
      user: null,
      items: { id1: "Apple", id2: "Banana" },
      counter: 0,
      featureEnabled: false,
    };

    // Teste avec ownProps pour un item existant
    let ownProps: OwnProps = { itemId: "id1" };
    let reduxProps = mapStateToProps(state, ownProps);
    expect(reduxProps.node).toBeDefined();
    // --- Correction ---
    let nodeElement = reduxProps.node as React.ReactElement;
    expect(nodeElement.type).toBe("span");
    expect(nodeElement.props.children).toEqual(["Item: ", "Apple"]);
    // --- Fin Correction ---

    // Teste avec ownProps pour un item non existant, sans showDefault
    ownProps = { itemId: "id3" };
    reduxProps = mapStateToProps(state, ownProps);
    expect(reduxProps).toEqual({ node: undefined }); // OK

    // Teste avec ownProps pour un item non existant, avec showDefault
    ownProps = { itemId: "id3", showDefault: true };
    reduxProps = mapStateToProps(state, ownProps);
    expect(reduxProps.node).toBeDefined();
    // --- Correction ---
    nodeElement = reduxProps.node as React.ReactElement;
    expect(nodeElement.type).toBe("span");
    expect(nodeElement.props.children).toEqual("Default Item");
    // --- Fin Correction ---

    // Teste sans ownProps pertinentes (itemId manquant)
    reduxProps = mapStateToProps(state, { showDefault: true }); // ownProps sans itemId
    expect(reduxProps).toEqual({ node: undefined }); // Le sélecteur retourne undefined
  });

  it("should create a component that always renders if selector never returns undefined", () => {
    const selector = (state: TestState) => <div>Counter: {state.counter}</div>;

    conditionalBuilder(selector);
    const mapStateToProps = getMapStateToPropsFromConnect();

    const state: TestState = {
      user: null,
      items: {},
      counter: 99,
      featureEnabled: false,
    };
    const reduxProps = mapStateToProps(state, {});
    expect(reduxProps.node).toBeDefined();
    // --- Correction ---
    const nodeElement = reduxProps.node as React.ReactElement;
    expect(nodeElement.type).toBe("div");
    // Vérifie que les enfants sont 'Counter: ' et le nombre 99
    expect(nodeElement.props.children).toEqual(["Counter: ", 99]);
    // --- Fin Correction ---
  });
});
