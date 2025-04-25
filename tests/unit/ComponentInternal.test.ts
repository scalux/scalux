// tests/ComponentInternal.test.ts
import { describe, it, expect, vi } from "vitest";
import { State } from "../../src/State";
import { GenericDictionary } from "../../src/utils";
import type { AppUpdateRegister } from "../../src/State";

// --- Mocking dependencies ---
// Mock react-redux connect HOC
vi.mock("react-redux", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-redux")>();
  return {
    ...original,
    connect: vi.fn(
      (mapStateToProps?, mapDispatchToProps?) => (component: any) => {
        // Retourne un composant mocké qui stocke les arguments de connect
        const MockConnectedComponent = (props: any) => component(props);
        MockConnectedComponent.mapStateToProps = mapStateToProps;
        MockConnectedComponent.mapDispatchToProps = mapDispatchToProps;
        return MockConnectedComponent;
      }
    ),
  };
});

// Mock des fonctions internes (on doit les extraire ou les réimplémenter pour le test)
// NOTE: L'idéal serait d'exporter ces helpers depuis Component.ts ou un fichier dédié
// Pour cet exemple, on simule leur logique ou on les importe si possible.
// Supposons qu'on les ait exportés pour le test :
import { mkComponentData, mkComponentThunks } from "../../src/Component"; // Ajustez si nécessaire

// --- Setup ---
const { Updater, Thunk, Resolver } = State({
  simple: "",
  nested: { value: 0 },
}); // État simple pour les tests de base
type SimpleState = { simple: string; nested: { value: number } };
type InternalSimpleState = SimpleState;

describe("Component Internal Helpers", () => {
  // --- Tests pour mkComponentData / mkMapStateToProps ---
  describe("mkComponentData / mkMapStateToProps", () => {
    type TestDataProps = { propA: string; propB: number; common: boolean };
    type TestOwnProps = { id: string; common?: boolean }; // common peut être ownProp

    it("should handle static data object", () => {
      const staticData = { propA: "static", common: true }; // common est fourni statiquement
      const mapStateToProps = mkComponentData<
        SimpleState,
        TestDataProps,
        typeof staticData
      >(staticData);

      const state = { simple: "test", nested: { value: 1 } };
      const ownProps = { id: "own1" }; // propB et id sont OwnProps
      const result = mapStateToProps(state, ownProps);

      expect(result).toEqual({
        propA: "static", // from static
        common: true, // from static
        id: "own1", // from ownProps merged in by mkMapStateToProps logic for static data
        // propB n'est pas défini ici, car il n'est ni dans staticData ni dans ownProps
      });

      // Simule le cas où ownProps fournit une prop manquante
      const ownPropsWithB = { id: "own2", propB: 100, common: false }; // common de ownProps écrase la prop statique
      const result2 = mapStateToProps(state, ownPropsWithB);
      expect(result2).toEqual({
        propA: "static",
        propB: 100, // from ownProps
        common: false, // from ownProps (priorité)
        id: "own2", // from ownProps
      });
    });

    it("should handle selector function (state only)", () => {
      const selector = (state: SimpleState): TestDataProps => ({
        propA: state.simple,
        propB: state.nested.value,
        common: true, // Calculé
      });
      const mapStateToProps = mkComponentData<
        SimpleState,
        TestDataProps,
        typeof selector
      >(selector);

      const state = { simple: "fromState", nested: { value: 50 } };
      const ownProps = { id: "own3" };
      const result = mapStateToProps(state, ownProps);

      expect(result).toEqual({
        propA: "fromState",
        propB: 50,
        common: true,
        // ownProps ne sont pas mergés automatiquement par mkMapStateToProps pour les sélecteurs
        // connect() de react-redux les rendra disponibles au composant final si besoin
      });
    });

    it("should handle selector function (state and ownProps)", () => {
      const selector = (
        state: SimpleState,
        ownProps: TestOwnProps
      ): TestDataProps => ({
        propA: `${state.simple}-${ownProps.id}`,
        propB: state.nested.value,
        common: ownProps.common ?? false, // Utilise ownProps
      });
      const mapStateToProps = mkComponentData<
        SimpleState,
        TestDataProps,
        typeof selector
      >(selector);

      const state = { simple: "stateVal", nested: { value: 99 } };
      const ownProps = { id: "comp1", common: true };
      const result = mapStateToProps(state, ownProps);

      expect(result).toEqual({
        propA: "stateVal-comp1",
        propB: 99,
        common: true,
      });
    });

    it("should handle static empty data object (all data becomes OwnProps)", () => {
      const staticData = {};
      const mapStateToProps = mkComponentData<
        SimpleState,
        TestDataProps,
        typeof staticData
      >(staticData);

      const state = { simple: "test", nested: { value: 1 } };
      const ownProps = {
        id: "own1",
        propA: "fromOwn",
        propB: 123,
        common: true,
      };
      const result = mapStateToProps(state, ownProps);

      // Avec data: {}, toutes les DataProps doivent venir des OwnProps
      // mkMapStateToProps pour les objets statiques merge ownProps
      expect(result).toEqual({
        id: "own1",
        propA: "fromOwn",
        propB: 123,
        common: true,
      });
    });
  });

  // --- Tests pour mkComponentThunks ---
  describe("mkComponentThunks", () => {
    type MockHandlers = {
      inc: () => void;
      add: (amount: number) => void;
      fetchData: (id: string) => void;
      customThunk: (val: boolean) => void;
    };

    const mockRegister = new GenericDictionary<any>();
    // Espionner la méthode add
    vi.spyOn(mockRegister, "add");

    const treeUpdater = Updater((state: SimpleState) => ({
      nested: { value: state.nested.value + 1 },
    }));
    const resolveUpdater = Updater({
      resolve: Resolver(
        async (_state: SimpleState, amount: number) => amount * 2
      ),
      updates: (state, resolvedAmount: number) => {
        state.nested.value += resolvedAmount;
      },
    });
    const thunkHandler = Thunk((val: boolean) => (dispatch, _getState) => {
      dispatch({ type: "CUSTOM_THUNK_ACTION", payload: val });
    });

    const handlers = {
      inc: treeUpdater, // Tree Updater
      add: resolveUpdater, // Resolve Updater
      customThunk: thunkHandler, // Thunk
      // On peut aussi avoir un updater inline
      inlineUpdate: (state: SimpleState, payload: string) => ({
        simple: `${state.simple}-${payload}`,
      }),
    };
    const domain = "TestDomain";

    const thunks = mkComponentThunks<
      false,
      SimpleState,
      InternalSimpleState,
      any
    >(
      domain,
      handlers as any, // Cast car la structure exacte des props n'est pas fournie ici
      mockRegister as AppUpdateRegister<false, InternalSimpleState>
    );

    it("should return an object with thunks for each handler", () => {
      expect(Object.keys(thunks)).toEqual([
        "inc",
        "add",
        "customThunk",
        "inlineUpdate",
      ]);
      expect(typeof thunks.inc).toBe("function");
      expect(typeof thunks.add).toBe("function");
      expect(typeof thunks.customThunk).toBe("function");
      expect(typeof thunks.inlineUpdate).toBe("function");
    });

    it("should register updates correctly in AppUpdateRegister", () => {
      // TreeUpdater (inc et inlineUpdate) => null
      expect(mockRegister.add).toHaveBeenCalledWith("TestDomain/inc", null);
      expect(mockRegister.add).toHaveBeenCalledWith(
        "TestDomain/inlineUpdate",
        null
      );

      // ResolveUpdater (add) => updates function/object
      expect(mockRegister.add).toHaveBeenCalledWith(
        "TestDomain/add",
        (resolveUpdater as any).updates // Vérifie que la partie 'updates' est passée
      );

      // Thunk (customThunk) => non enregistré
      expect(mockRegister.add).not.toHaveBeenCalledWith(
        expect.stringContaining("customThunk"),
        expect.anything()
      );
    });

    // Test rapide du fonctionnement d'un thunk généré
    it("generated thunk for TreeUpdater should dispatch correct action", async () => {
      const mockDispatch = vi.fn();
      const mockGetState = vi.fn(() => ({ simple: "a", nested: { value: 5 } }));
      const incThunk = thunks.inc; // C'est un AppThunk<State, Payload>

      // Le payload est 'undefined' car inc: () => void
      const action = incThunk(undefined);
      await action(mockDispatch, mockGetState);

      expect(mockDispatch).toHaveBeenCalledOnce();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "TestDomain/inc",
        payload: undefined,
        updates: { nested: { value: 6 } }, // L'arbre de mise à jour calculé
      });
    });

    it("generated thunk for ResolveUpdater should dispatch correct action", async () => {
      const mockDispatch = vi.fn();
      const mockGetState = vi.fn(() => ({ simple: "a", nested: { value: 5 } }));
      const addThunk = thunks.add; // C'est un AppThunk<State, Payload>

      // Le payload est 'number' car add: (amount: number) => void
      const action = addThunk(10);
      await action(mockDispatch, mockGetState); // resolve (10*2=20) puis dispatch

      expect(mockDispatch).toHaveBeenCalledOnce();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "TestDomain/add",
        payload: 10, // Payload original
        resolvedPayload: 20, // Payload après resolve
      });
    });

    it("generated thunk for direct ThunkBuilder should execute the thunk", () => {
      const mockDispatch = vi.fn();
      const mockGetState = vi.fn(() => ({ simple: "a", nested: { value: 5 } }));
      const customThunkRunner = thunks.customThunk; // C'est le AppThunk original

      const action = customThunkRunner(true); // Payload boolean
      action(mockDispatch, mockGetState); // Exécute le thunk

      expect(mockDispatch).toHaveBeenCalledOnce();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "CUSTOM_THUNK_ACTION",
        payload: true,
      });
      // mockGetState n'est pas appelé dans ce thunk spécifique
      expect(mockGetState).not.toHaveBeenCalled();
    });
  });
});
