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
import { createSelector } from "@reduxjs/toolkit";

// --- Setup ---
const { Updater, Thunk, Resolver } = State({
  simple: "",
  nested: { value: 0 },
}); // État simple pour les tests de base
type SimpleState = { simple: string; nested: { value: number } };
type InternalSimpleState = SimpleState;

describe("Component Internal Helpers", () => {
  describe("mkComponentData", () => {
    // Types pour les tests de mkComponentData
    // Props finales attendues par le composant via connect
    type TestDataProps = {
      propA: string;
      propB: number;
      common: boolean;
      derived?: string; // Optionnel pour certains tests
      id?: string; // id peut venir de ownProps, le rendre optionnel ici
    };
    // Props passées directement au composant connecté
    type TestOwnProps = {
      id: string;
      common?: boolean; // Optionnel dans ownProps
      otherId?: number; // Optionnel dans ownProps
    };

    // État de test de base (Assurez-vous que SimpleState est défini ailleurs)
    // Exemple: type SimpleState = { simple: string; nested: { value: number }; other: { flag: boolean } };
    const baseState = {
      simple: "base",
      nested: { value: 1 },
      other: { flag: false },
    };

    it("should handle static data object by merging with ownProps", () => {
      const staticData = { propA: "static", propB: 0, common: true };
      // mkComponentData infère les types, mais on peut être explicite si nécessaire.
      // L'important est que le type retourné soit (state, ownProps) => TestDataProps
      const mapStateToProps = mkComponentData<
        SimpleState,
        TestDataProps,
        typeof staticData
      >(staticData);

      const state = { ...baseState }; // State non utilisé dans ce cas par la logique interne
      const ownProps1: TestOwnProps = { id: "own1" };
      const result1 = mapStateToProps(state, ownProps1);

      // La logique pour staticData fusionne l'objet statique et ownProps.
      // Le résultat doit être conforme à TestDataProps.
      expect(result1).toEqual<TestDataProps>({
        // Précise le type attendu
        propA: "static",
        propB: 0,
        common: true,
        id: "own1", // Fusionné depuis ownProps1
        // derived est absent/undefined car non fourni
      });

      const ownProps2 = { id: "own2", propB: 100, common: false }; // ownProps écrase propB et common
      const result2 = mapStateToProps(state, ownProps2);
      expect(result2).toEqual<TestDataProps>({
        propA: "static",
        propB: 100, // Écrasé par ownProps2
        common: false, // Écrasé par ownProps2
        id: "own2",
        // derived est absent/undefined
      });
    });

    it("should handle selector function (state only) by passing it through", () => {
      // Ce sélecteur retourne un objet partiel conforme à TestDataProps
      const selector = (state: any): Partial<TestDataProps> => ({
        propA: state.simple,
        propB: state.nested.value,
        common: !state.other.flag,
      });
      // mkComponentData doit retourner une fonction compatible avec mapStateToProps
      const mapStateToProps = mkComponentData<SimpleState, TestDataProps, any>(
        selector
      );

      const state = {
        simple: "fromState",
        nested: { value: 50 },
        other: { flag: false },
      };
      const ownProps: TestOwnProps = { id: "own3" }; // Passé à mapStateToProps mais ignoré par ce sélecteur
      const result = mapStateToProps(state, ownProps);

      // Pour les fonctions, mkComponentData ne fusionne PAS ownProps.
      // Le résultat est ce que le sélecteur retourne.
      expect(result).toEqual<Partial<TestDataProps>>({
        // Attend un résultat partiel
        propA: "fromState",
        propB: 50,
        common: true, // !false
        // id et derived sont absents/undefined
      });
    });

    it("should handle selector function (state and ownProps) by passing it through", () => {
      // Ce sélecteur utilise state et ownProps
      const selector = (
        state: any,
        ownProps: TestOwnProps // Le sélecteur DOIT accepter ownProps
      ): Partial<TestDataProps> => ({
        propA: `${state.simple}-${ownProps.id}`,
        propB: state.nested.value + (ownProps.otherId ?? 0),
        common: ownProps.common ?? state.other.flag, // Priorité à ownProps.common si défini
      });
      const mapStateToProps = mkComponentData<SimpleState, TestDataProps, any>(
        selector
      );

      const state: any = {
        simple: "stateVal",
        nested: { value: 99 },
        other: { flag: false },
      };
      const ownProps: TestOwnProps = { id: "comp1", common: true, otherId: 1 };
      const result = mapStateToProps(state, ownProps);

      // Le résultat est ce que le sélecteur retourne.
      expect(result).toEqual<Partial<TestDataProps>>({
        propA: "stateVal-comp1",
        propB: 100, // 99 + 1
        common: true, // Vient de ownProps
        // id et derived sont absents/undefined dans le retour du sélecteur
      });
    });

    it("should handle static empty data object by merging ownProps", () => {
      const staticData = {}; // Builder est un objet vide
      const mapStateToProps = mkComponentData<
        SimpleState,
        TestDataProps,
        typeof staticData
      >(staticData);

      const state = { ...baseState }; // Ignoré par la logique statique interne
      // Dans ce cas, ownProps doit fournir toutes les props nécessaires à TestDataProps
      // pour que le résultat final soit valide, selon la logique de fusion statique.
      const ownProps: any = {
        // Assure que ownProps a les clés nécessaires
        id: "own1",
        propA: "fromOwn",
        propB: 123,
        common: true,
      };
      const result = mapStateToProps(state, ownProps);

      // La logique statique fusionne l'objet vide ({}) avec ownProps
      expect(result).toEqual<Partial<TestDataProps>>({
        // Résultat partiel car TestDataProps a 'derived' optionnel
        id: "own1",
        propA: "fromOwn",
        propB: 123,
        common: true,
        // derived est absent/undefined
      });
    });

    // --- NOUVEAUX TESTS AVEC createSelector ---

    it("should handle MEMOIZED selector (state only) correctly by passing it through [NEW TEST]", () => {
      const selectSimple = (state: SimpleState) => state.simple;
      const selectNestedValue = (state: SimpleState) => state.nested.value;

      // Sélecteur mémoïsé retournant un objet partiel
      const memoizedSelector = createSelector(
        [selectSimple, selectNestedValue],
        (simple, nestedValue): Partial<TestDataProps> => {
          return { propA: `memoized-${simple}`, propB: nestedValue * 2 };
        }
      );

      // On passe le sélecteur directement. TypeScript doit inférer la compatibilité.
      const mapStateToProps = mkComponentData<SimpleState, TestDataProps, any>(
        memoizedSelector
      );

      const state1 = {
        simple: "alpha",
        nested: { value: 10 },
        other: { flag: true },
      };
      const ownProps1: TestOwnProps = { id: "test1" }; // Sera passé mais ignoré par le sélecteur
      const result1 = mapStateToProps(state1, ownProps1);

      // Le résultat est ce que le sélecteur retourne. Pas de fusion ownProps.
      expect(result1).toEqual<Partial<TestDataProps>>({
        propA: "memoized-alpha",
        propB: 20,
        // common, id, derived sont absents/undefined
      });
    });

    it("should handle MEMOIZED selector (state and ownProps) correctly by passing it through [NEW TEST]", () => {
      const selectSimple = (state: SimpleState) => state.simple;
      // Les input selectors qui dépendent de ownProps DOIVENT accepter (state, ownProps)
      const selectOwnPropsId = (_state: SimpleState, ownProps: TestOwnProps) =>
        ownProps.id;
      const selectOwnPropsCommon = (
        _state: SimpleState,
        ownProps: TestOwnProps
      ) => ownProps.common;

      const memoizedSelector = createSelector(
        // Les inputs reçoivent (state, ownProps) de Reselect quand mapStateToProps est appelé
        [selectSimple, selectOwnPropsId, selectOwnPropsCommon],
        (simple, id, common): Partial<TestDataProps> => {
          // La fonction résultat reçoit les sorties des inputs
          return {
            propA: `memoized-${simple}-${id}`,
            common: common ?? false, // Utilise la valeur de selectOwnPropsCommon
            derived: `derived-${id}`, // Utilise la valeur de selectOwnPropsId
          };
        }
      );
      const mapStateToProps = mkComponentData<SimpleState, TestDataProps, any>(
        memoizedSelector
      );

      const state1 = {
        simple: "gamma",
        nested: { value: 5 },
        other: { flag: true },
      };
      const ownProps1: TestOwnProps = { id: "props1", common: true };
      const result1 = mapStateToProps(state1, ownProps1);

      // Le résultat est ce que le sélecteur retourne.
      expect(result1).toEqual<Partial<TestDataProps>>({
        propA: "memoized-gamma-props1",
        common: true,
        derived: "derived-props1",
        // propB, id sont absents/undefined dans le retour du sélecteur
      });
    });

    it("should handle MEMOIZED selector (no args / constant-like) correctly by passing it through [NEW TEST]", () => {
      // Sélecteur sans dépendances externes
      const constantSelector = createSelector(
        [], // Aucun input selector requis
        (): Partial<TestDataProps> => {
          // Retourne un objet partiel constant
          return { propA: "constant-memoized", common: true };
        }
      );
      const mapStateToProps = mkComponentData<SimpleState, TestDataProps, any>(
        constantSelector
      );

      const state: SimpleState = { ...baseState }; // Passé mais ignoré par le sélecteur
      const ownProps: TestOwnProps = { id: "props-const" }; // Passé mais ignoré par le sélecteur
      const result = mapStateToProps(state, ownProps);

      // Le résultat est ce que le sélecteur retourne. Pas de fusion ownProps.
      expect(result).toEqual<Partial<TestDataProps>>({
        propA: "constant-memoized",
        common: true,
        // propB, id, derived sont absents/undefined
      });
    });
  }); // Fin describe("mkComponentData")

  // --- Tests pour mkComponentThunks ---
  describe("mkComponentThunks", () => {
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
