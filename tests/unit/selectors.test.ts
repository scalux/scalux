// selectors.test.ts
import { describe, it, expect } from "vitest";
import { mkSelectors } from "../../src/selectors"; // Ajustez le chemin si nécessaire
import { Slice } from "../../src/Slice"; // Ajustez le chemin si nécessaire
import { Undoable } from "../../src/Undoable"; // Ajustez le chemin si nécessaire
// Importer uniquement pour le type, si vous ne l'avez pas déjà défini globalement
// import type { StateWithHistory } from 'redux-undo';

// Helper type pour simuler la structure StateWithHistory dans les tests
type MockStateWithHistory<T> = {
  present: T;
  past: T[];
  future: T[];
};

// --- Scénario 1: État Simple (Pas de Slices, Pas d'Undo) ---
describe("mkSelectors: Simple State (No Slices, No Undo)", () => {
  const simpleStateBuilder = {
    count: 0,
    user: { name: "Initial", loggedIn: false },
    items: [] as string[],
  };
  const selectors = mkSelectors(simpleStateBuilder);

  // État exemple pour les tests
  const currentState = {
    count: 42,
    user: { name: "Tester", loggedIn: true },
    items: ["a", "b"],
  };

  it("pick should select direct properties", () => {
    expect(selectors.pick.count(currentState)).toBe(42);
    expect(selectors.pick.user(currentState)).toEqual({
      name: "Tester",
      loggedIn: true,
    });
    expect(selectors.pick.items(currentState)).toEqual(["a", "b"]);
  });

  it("rawPick should select direct properties (same as pick)", () => {
    expect(selectors.rawPick.count(currentState)).toBe(42);
    expect(selectors.rawPick.user(currentState)).toEqual({
      name: "Tester",
      loggedIn: true,
    });
    expect(selectors.rawPick.items(currentState)).toEqual(["a", "b"]);
  });

  it("grab should return the whole state", () => {
    expect(selectors.grab(currentState)).toEqual(currentState);
  });

  it("rawGrab should return the whole state (same as grab)", () => {
    expect(selectors.rawGrab(currentState)).toEqual(currentState);
  });

  it("internalState should return the whole state", () => {
    expect(selectors.internalState(currentState)).toEqual(currentState);
  });

  it("rootState should return the whole state", () => {
    expect(selectors.rootState(currentState)).toEqual(currentState);
  });
});

// --- Scénario 2: État Racine Undoable (Pas de Slices) ---
describe("mkSelectors: Root Undoable State (No Slices)", () => {
  type InternalDataType = {
    count: number;
    user: { name: string };
  };
  const rootUndoableBuilder = Undoable<InternalDataType>({
    count: 0,
    user: { name: "Initial" },
  });
  const selectors = mkSelectors(rootUndoableBuilder);

  // État exemple pour les tests
  const currentState: MockStateWithHistory<InternalDataType> = {
    present: { count: 10, user: { name: "Present" } },
    past: [
      { count: 5, user: { name: "Past" } },
      { count: 0, user: { name: "Initial" } },
    ],
    future: [{ count: 15, user: { name: "Future" } }],
  };
  type RootState = typeof currentState;

  it("pick should select properties from present state", () => {
    expect(selectors.pick.count(currentState)).toBe(10);
    expect(selectors.pick.user(currentState)).toEqual({ name: "Present" });
  });

  it("rawPick should return property history object", () => {
    const countHistory = selectors.rawPick.count(currentState);
    expect(countHistory).toEqual({
      present: 10,
      past: [5, 0],
      future: [15],
    });
    // Test access via present
    expect(countHistory.present).toBe(10);

    const userHistory = selectors.rawPick.user(currentState);
    expect(userHistory).toEqual({
      present: { name: "Present" },
      past: [{ name: "Past" }, { name: "Initial" }],
      future: [{ name: "Future" }],
    });
    // Test access via present
    expect(userHistory.present).toEqual({ name: "Present" });
  });

  it("grab should return the present state", () => {
    expect(selectors.grab(currentState)).toEqual({
      count: 10,
      user: { name: "Present" },
    });
  });

  it("rawGrab should return the full history object", () => {
    expect(selectors.rawGrab(currentState)).toEqual(currentState);
  });

  it("internalState should return the present state", () => {
    expect(selectors.internalState(currentState)).toEqual({
      count: 10,
      user: { name: "Present" },
    });
  });

  it("rootState should return the full history object", () => {
    expect(selectors.rootState(currentState)).toEqual(currentState);
  });
});

// --- Scénario 3: État avec Slices (Pas d'historique sur les slices) ---
describe("mkSelectors: Sliced State (No Undo)", () => {
  const counterSliceBuilder = Slice({ value: 0 });
  const userSliceBuilder = Slice({ name: "Anon", permissions: [] as string[] });

  const slicedNoUndoBuilder = {
    counter: counterSliceBuilder,
    user: userSliceBuilder,
  };
  const selectors = mkSelectors(slicedNoUndoBuilder);

  // État exemple pour les tests
  const currentState = {
    counter: { value: 55 },
    user: { name: "Sliced", permissions: ["read"] },
  };
  type RootState = typeof currentState;

  it("pick should select direct properties within slices", () => {
    expect(selectors.pick.counter.value(currentState)).toBe(55);
    expect(selectors.pick.user.name(currentState)).toBe("Sliced");
    expect(selectors.pick.user.permissions(currentState)).toEqual(["read"]);
  });

  it("rawPick should select direct properties within slices (same as pick)", () => {
    expect(selectors.rawPick.counter.value(currentState)).toBe(55);
    expect(selectors.rawPick.user.name(currentState)).toBe("Sliced");
    expect(selectors.rawPick.user.permissions(currentState)).toEqual(["read"]);
  });

  it("grab should return the specific slice data", () => {
    expect(selectors.grab.counter(currentState)).toEqual({ value: 55 });
    expect(selectors.grab.user(currentState)).toEqual({
      name: "Sliced",
      permissions: ["read"],
    });
  });

  it("rawGrab should return the specific slice data (same as grab)", () => {
    expect(selectors.rawGrab.counter(currentState)).toEqual({ value: 55 });
    expect(selectors.rawGrab.user(currentState)).toEqual({
      name: "Sliced",
      permissions: ["read"],
    });
  });

  it("internalState should return the combined state of all slices", () => {
    expect(selectors.internalState(currentState)).toEqual(currentState);
  });

  it("rootState should return the combined state of all slices", () => {
    expect(selectors.rootState(currentState)).toEqual(currentState);
  });
});

// --- Scénario 4: État avec Slices (Mixte: Avec et Sans Historique) ---
describe("mkSelectors: Sliced State (Mixed Undo)", () => {
  type CounterInternal = { value: number };
  type UserInternal = { name: string; loggedIn: boolean };
  type SettingsInternal = { theme: string };

  // Slices Builder configuration
  const counterSliceBuilder = Slice(Undoable<CounterInternal>({ value: 0 })); // Undoable
  const userSliceBuilder = Slice<UserInternal>({
    name: "Anon",
    loggedIn: false,
  }); // Not Undoable
  const settingsSliceBuilder = Slice(
    Undoable<SettingsInternal>({ theme: "light" })
  ); // Undoable

  const slicedMixedBuilder = {
    counter: counterSliceBuilder,
    user: userSliceBuilder,
    settings: settingsSliceBuilder,
  };
  const selectors = mkSelectors(slicedMixedBuilder);

  // État exemple pour les tests
  const currentState = {
    counter: {
      // Undoable Slice State
      present: { value: 10 },
      past: [{ value: 5 }, { value: 0 }],
      future: [{ value: 15 }],
    } as MockStateWithHistory<CounterInternal>,
    user: {
      // Non-Undoable Slice State
      name: "Tester",
      loggedIn: true,
    },
    settings: {
      // Undoable Slice State
      present: { theme: "dark" },
      past: [{ theme: "light" }],
      future: [],
    } as MockStateWithHistory<SettingsInternal>,
  };
  type RootState = typeof currentState;

  // --- Tests pour `pick` ---
  it("pick should select present property from undoable slice", () => {
    expect(selectors.pick.counter.value(currentState)).toBe(10);
    expect(selectors.pick.settings.theme(currentState)).toBe("dark");
  });
  it("pick should select direct property from non-undoable slice", () => {
    expect(selectors.pick.user.name(currentState)).toBe("Tester");
    expect(selectors.pick.user.loggedIn(currentState)).toBe(true);
  });

  // --- Tests pour `rawPick` ---
  it("rawPick should return property history object for undoable slice property", () => {
    const counterValueHistory = selectors.rawPick.counter.value(currentState);
    expect(counterValueHistory).toEqual({
      present: 10,
      past: [5, 0],
      future: [15],
    });
    expect(counterValueHistory.present).toBe(10); // Test present access

    const settingsThemeHistory = selectors.rawPick.settings.theme(currentState);
    expect(settingsThemeHistory).toEqual({
      present: "dark",
      past: ["light"],
      future: [],
    });
    expect(settingsThemeHistory.present).toBe("dark"); // Test present access
  });
  it("rawPick should select direct property from non-undoable slice (same as pick)", () => {
    expect(selectors.rawPick.user.name(currentState)).toBe("Tester");
    expect(selectors.rawPick.user.loggedIn(currentState)).toBe(true);
  });

  // --- Tests pour `grab` ---
  it("grab should return present state for undoable slice", () => {
    expect(selectors.grab.counter(currentState)).toEqual({ value: 10 });
    expect(selectors.grab.settings(currentState)).toEqual({ theme: "dark" });
  });
  it("grab should return direct state for non-undoable slice", () => {
    expect(selectors.grab.user(currentState)).toEqual({
      name: "Tester",
      loggedIn: true,
    });
  });

  // --- Tests pour `rawGrab` ---
  it("rawGrab should return the full history object for undoable slice", () => {
    expect(selectors.rawGrab.counter(currentState)).toEqual(
      currentState.counter
    );
    expect(selectors.rawGrab.settings(currentState)).toEqual(
      currentState.settings
    );
  });
  it("rawGrab should return direct state for non-undoable slice", () => {
    expect(selectors.rawGrab.user(currentState)).toEqual(currentState.user);
  });

  // --- Tests pour `internalState` ---
  it("internalState should return the combined present/direct state of slices", () => {
    expect(selectors.internalState(currentState)).toEqual({
      counter: { value: 10 }, // from counter.present
      user: { name: "Tester", loggedIn: true }, // direct user state
      settings: { theme: "dark" }, // from settings.present
    });
  });

  // --- Tests pour `rootState` ---
  it("rootState should return the full root state object", () => {
    expect(selectors.rootState(currentState)).toEqual(currentState);
  });
});
