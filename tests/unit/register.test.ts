import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore, EnhancedStore } from "@reduxjs/toolkit";
import * as reduxUndo from "redux-undo";
import { State } from "../../src/State";
import { Slice } from "../../src/Slice";
import { Undoable } from "../../src/Undoable";
import * as LogicModule from "../../src/Logic"; // Importer pour espionner registerLogic

// Mocker redux-undo si nécessaire (ici juste pour les ActionCreators)
const mockUndoAction = { type: "@@redux-undo/UNDO" };
const mockRedoAction = { type: "@@redux-undo/REDO" };
vi.spyOn(reduxUndo.ActionCreators, "undo").mockReturnValue(mockUndoAction);
vi.spyOn(reduxUndo.ActionCreators, "redo").mockReturnValue(mockRedoAction);

// Espionner registerLogic
vi.spyOn(LogicModule, "registerLogic");

// Helper simple pour un composant factice
const DummyRender: React.FC<any> = () => null;

// --- Début des tests ---

describe("register.ts - mkRegister Functionality", () => {
  // --- Scénario 1: État Simple ---
  describe("Reducer with Simple State", () => {
    // Setup : Définir State et les Updaters/Thunks
    const { Component, Updater, Resolver, Thunk, register } = State({
      count: 0,
      message: "init",
    });
    type SimpleState = { count: number; message: string };

    const incrementUpdater = Updater((state: SimpleState) => ({
      count: state.count + 1,
    }));
    const setMessageUpdater = Updater({
      resolve: Resolver(async (_state: SimpleState, msg: string) => {
        await new Promise((r) => setTimeout(r, 5));
        return msg.toUpperCase();
      }),
      updates: (state: SimpleState, resolvedMsg: string) => {
        state.message = resolvedMsg;
      },
    });
    // Définir un composant factice pour enregistrer les actions
    const DummySimpleComponent = Component({
      domain: "TestSimple",
      render: DummyRender,
      data: {},
      handlers: {
        increment: incrementUpdater,
        setMessage: setMessageUpdater,
      },
    });

    // Appeler register APRÈS la définition du composant
    const { reducer } = register();

    it("should create a valid reducer with initial state", () => {
      expect(typeof reducer).toBe("function");
      const initialState = reducer(undefined, { type: "@@INIT" });
      expect(initialState).toEqual({ count: 0, message: "init" });
    });

    it("reducer should handle TreeUpdater actions registered via Component", () => {
      const state1 = reducer(undefined, { type: "@@INIT" });
      const action = {
        type: "TestSimple/increment", // Action type généré par Component
        payload: undefined,
        updates: { count: 1 }, // Simulation de l'update calculé
      };
      const state2 = reducer(state1, action);
      expect(state2.count).toBe(1);
      expect(state2.message).toBe("init");
    });

    it("reducer should handle ResolveUpdater actions registered via Component", () => {
      const state1 = reducer(undefined, { type: "@@INIT" });
      const action = {
        type: "TestSimple/setMessage", // Action type généré par Component
        payload: "hello",
        resolvedPayload: "HELLO", // Simulation du payload résolu
      };
      const state2 = reducer(state1, action);
      expect(state2.count).toBe(0);
      expect(state2.message).toBe("HELLO");
    });

    it("reducer should ignore unregistered actions", () => {
      const state1 = reducer(undefined, { type: "@@INIT" });
      const state2 = reducer(state1, { type: "UNKNOWN_ACTION" });
      expect(state2).toEqual(state1);
    });
  });

  // --- Scénario 2: État Racine Undoable ---
  describe("Reducer with Root Undoable State", () => {
    const { Component, Updater, register } = State(Undoable({ value: "a" }));
    type InternalState = { value: string };
    type RootUndoableState = reduxUndo.StateWithHistory<InternalState>;

    const setValueUpdater = Updater(
      (_state: RootUndoableState, newValue: string) => ({ value: newValue })
    );

    // Enregistrer l'action via un composant factice
    const DummyUndoableComponent = Component({
      domain: "TestUndoable",
      render: DummyRender,
      data: {}, // Suppose que l'état est passé au composant via data
      handlers: {
        setValue: setValueUpdater,
      },
    });

    const { reducer } = register();

    it("reducer should have undoable state structure", () => {
      const initialState = reducer(undefined, { type: "@@INIT" });
      expect(initialState).toHaveProperty("present", { value: "a" });
      expect(initialState).toHaveProperty("past", []);
      expect(initialState).toHaveProperty("future", []);
    });

    it("reducer should update present and past on actions", () => {
      const state1 = reducer(undefined, { type: "@@INIT" });
      const action = {
        type: "TestUndoable/setValue",
        payload: "b",
        updates: { value: "b" },
      };
      const state2 = reducer(state1, action);
      expect(state2.present).toEqual({ value: "b" });
      expect(state2.past).toEqual([{ value: "a" }]);
      expect(state2.future).toEqual([]);
    });

    it("reducer should handle undo/redo actions correctly", () => {
      const state1 = reducer(undefined, { type: "@@INIT" });
      const actionB = {
        type: "TestUndoable/setValue",
        updates: { value: "b" },
      };
      const state2 = reducer(state1, actionB);
      const actionC = {
        type: "TestUndoable/setValue",
        updates: { value: "c" },
      };
      const state3 = reducer(state2, actionC);

      const state4 = reducer(state3, mockUndoAction); // Utilise l'action mockée
      expect(state4.present).toEqual({ value: "b" });
      expect(state4.past).toEqual([{ value: "a" }]);
      expect(state4.future).toEqual([{ value: "c" }]);

      const state5 = reducer(state4, mockRedoAction); // Utilise l'action mockée
      expect(state5.present).toEqual({ value: "c" });
      expect(state5.past).toEqual([{ value: "a" }, { value: "b" }]);
      expect(state5.future).toEqual([]);
    });
  });

  // --- Scénario 3: État Slicé (Mixte Undo/Non-Undo) ---
  describe("Reducer with Sliced State (Mixed)", () => {
    const { Component, Updater, Resolver, register } = State({
      counter: Slice(Undoable({ count: 0 })),
      user: Slice({ name: "init" }),
      config: Slice({ theme: "light" }),
    });
    type SlicedInternalState = {
      counter: { count: number };
      user: { name: string };
      config: { theme: string };
    };
    type SlicedRootState = {
      counter: reduxUndo.StateWithHistory<{ count: number }>;
      user: { name: string };
      config: { theme: string };
    };

    const incrementUpdater = Updater((_state: SlicedRootState) => ({
      counter: { count: 1 }, // Cible la slice counter
    }));
    const setUserUpdater = Updater((_state: SlicedRootState, name: string) => ({
      user: { name }, // Cible la slice user
    }));
    const setThemeUpdater = Updater({
      resolve: Resolver(async (_state: SlicedRootState, theme: string) =>
        theme.toLowerCase()
      ),
      updates: {
        config: (configState, resolvedTheme: string) => {
          configState.theme = resolvedTheme;
        },
        user: (userState, resolvedTheme: string) => {
          userState.name = `Theme_${resolvedTheme}`;
        },
      },
    });

    // Enregistrer les actions via un composant factice
    const DummySlicedComponent = Component({
      domain: "TestSliced",
      render: DummyRender,
      data: {},
      handlers: {
        increment: incrementUpdater,
        setUser: setUserUpdater,
        setTheme: setThemeUpdater,
      },
    });

    const { reducer } = register();

    it("reducer should combine slice reducers correctly", () => {
      const initialState = reducer(undefined, { type: "@@INIT" });
      expect(initialState.counter.present).toEqual({ count: 0 });
      expect(initialState.user).toEqual({ name: "init" });
      expect(initialState.config).toEqual({ theme: "light" });
    });

    it("reducer should delegate TreeUpdater actions to correct slices", () => {
      const state1 = reducer(undefined, { type: "@@INIT" });
      const actionInc = {
        type: "TestSliced/increment",
        updates: { counter: { count: 1 } }, // L'update doit cibler la slice
      };
      const state2 = reducer(state1, actionInc);
      expect(state2.counter.present).toEqual({ count: 1 });
      expect(state2.counter.past).toEqual([{ count: 0 }]);
      expect(state2.user).toEqual({ name: "init" });

      const actionUser = {
        type: "TestSliced/setUser",
        payload: "TestUser",
        updates: { user: { name: "TestUser" } }, // L'update cible la slice
      };
      const state3 = reducer(state2, actionUser);
      expect(state3.counter.present).toEqual({ count: 1 });
      expect(state3.user).toEqual({ name: "TestUser" });
    });

    it("reducer should delegate ResolveUpdater actions to specified slices", () => {
      const state1 = reducer(undefined, { type: "@@INIT" });
      const action = {
        type: "TestSliced/setTheme",
        payload: "DARK",
        resolvedPayload: "dark",
      };
      const state2 = reducer(state1, action);
      expect(state2.config).toEqual({ theme: "dark" });
      expect(state2.user).toEqual({ name: "Theme_dark" });
      expect(state2.counter.present).toEqual({ count: 0 });
    });

    it("undo/redo should only affect undoable slices", () => {
      const state1 = reducer(undefined, { type: "@@INIT" });
      const actionInc = {
        type: "TestSliced/increment",
        updates: { counter: { count: 1 } },
      };
      const state2 = reducer(state1, actionInc);
      const actionUser = {
        type: "TestSliced/setUser",
        updates: { user: { name: "Test" } },
      };
      const state3 = reducer(state2, actionUser);

      const state4 = reducer(state3, mockUndoAction);
      expect(state4.counter.present).toEqual({ count: 0 });
      expect(state4.user).toEqual({ name: "Test" }); // Inchangé

      const state5 = reducer(state4, mockRedoAction);
      expect(state5.counter.present).toEqual({ count: 1 });
      expect(state5.user).toEqual({ name: "Test" }); // Toujours inchangé
    });
  });

  // --- Scénario 4: Utilisation de Logic et API ---
  describe("mkRegister with Logic Tree and API", () => {
    const { Logic, Updater, Resolver, Thunk, register } = State({
      data: 10,
      status: "idle",
    });
    type LogicState = { data: number; status: string };

    // Définir l'arbre logique
    const logicTree = Logic({
      value: {
        get: Resolver((state: LogicState) => state.data),
        set: Updater((_state: LogicState, value: number) => ({ data: value })),
        add: Updater((state: LogicState, amount: number) => ({
          data: state.data + amount,
        })),
        doubleAsync: Updater({
          resolve: Resolver(async (state: LogicState) => {
            await new Promise((r) => setTimeout(r, 5));
            return state.data * 2;
          }),
          updates: (state, resolvedValue: number) => {
            state.data = resolvedValue;
          },
        }),
      },
      status: {
        get: Resolver((state: LogicState) => state.status),
        set: Updater((_state: LogicState, status: string) => ({ status })),
        reset: Thunk(() => (dispatch) => {
          dispatch({ type: "STATUS_RESET_ACTION", payload: undefined });
        }),
      },
      valuePlus: Resolver(
        (state: LogicState, payload: number) => state.data + payload
      ),
    });

    // Appeler register avec l'arbre logique
    // registerLogic sera appelé implicitement
    const { reducer, mkApi } = register(logicTree);
    let store: EnhancedStore<LogicState>;
    let api: ReturnType<typeof mkApi>;

    // Setup store & api avant chaque test de ce bloc
    beforeEach(() => {
      store = configureStore({ reducer });
      api = mkApi(store);
    });

    it("should call registerLogic when logicTree is provided", () => {
      // Vérifie que l'espion a été appelé lors de l'appel à register() ci-dessus
      expect(LogicModule.registerLogic).toHaveBeenCalled();
    });

    it("reducer should handle actions defined in logic tree", () => {
      // Les actions ont maintenant le préfixe 'api/'
      const state1 = reducer(undefined, { type: "@@INIT" });
      const action = {
        type: "api/value/set", // Notez le préfixe 'api/'
        payload: 50,
        updates: { data: 50 },
      };
      const state2 = reducer(state1, action);
      expect(state2.data).toBe(50);
    });

    it("mkApi should generate a functional API", () => {
      expect(api.app).toHaveProperty("value.set");
      expect(api.app).toHaveProperty("status.reset");
      expect(api.state).toHaveProperty("pick.data");
    });

    it("API handlers should dispatch actions and update state", async () => {
      const dispatchSpy = vi.spyOn(store, "dispatch");

      api.app.value.set(100);
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "api/value/set", payload: 100 })
      );
      expect(store.getState().data).toBe(100);
      expect(api.state.pick.data).toBe(100); // API state reflect change

      await api.app.value.doubleAsync();
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "api/value/doubleAsync",
          resolvedPayload: 200,
        })
      );
      expect(store.getState().data).toBe(200);
      expect(api.state.pick.data).toBe(200);

      api.app.status.reset();
      expect(dispatchSpy).toHaveBeenCalledWith({ type: "STATUS_RESET_ACTION" });
    });

    it("API state selectors should retrieve current state", () => {
      expect(api.state.pick.data).toBe(10);
      api.app.value.add(5);
      expect(api.state.pick.data).toBe(15);
    });

    it("API app selectors (getters/functions) should work", () => {
      expect(api.app.value.get).toBe(10); // Getter pour sélecteur sans payload
      api.app.value.set(25);
      expect(api.app.value.get).toBe(25);
      expect(api.app.status.get).toBe("idle");
      expect(api.app.valuePlus(3)).toBe(28); // Fonction pour sélecteur avec payload
    });
  });
});
