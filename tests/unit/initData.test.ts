// tests/initData.test.ts
import { describe, it, expect } from "vitest";
import { buildMkInitData } from "../../src/initData"; // Ajustez le chemin
import { Slice } from "../../src/Slice"; // Ajustez le chemin
import { Undoable } from "../../src/Undoable"; // Ajustez le chemin

describe("buildMkInitData", () => {
  it("should return the original object for simple state", () => {
    const simpleStateBuilder = {
      count: 0,
      user: null as { name: string } | null,
    };
    const initData = buildMkInitData(simpleStateBuilder);
    expect(initData).toEqual({ count: 0, user: null });
    // Check reference for non-undoable simple state
    expect(initData).toBe(simpleStateBuilder);
  });

  it("should return the unwrapped data for root undoable state", () => {
    const rootUndoableBuilder = Undoable({
      value: "initial",
      settings: { theme: "dark" },
    });
    const initData = buildMkInitData(rootUndoableBuilder);
    expect(initData).toEqual({
      value: "initial",
      settings: { theme: "dark" },
    });
    // Check reference to the inner data object
    expect(initData).toBe(rootUndoableBuilder.data);
  });

  it("should return an object with unwrapped data from each slice for sliced state", () => {
    const counterSlice = Slice({ count: 10 });
    const userSlice = Slice(Undoable({ name: "test", loggedIn: false })); // Undoable slice
    const configSlice = Slice({ enabled: true });

    const slicedStateBuilder = {
      counter: counterSlice,
      user: userSlice,
      config: configSlice,
    };

    const initData = buildMkInitData(slicedStateBuilder);

    expect(initData).toEqual({
      counter: { count: 10 }, // data from counterSlice
      user: { name: "test", loggedIn: false }, // unwrapped data from userSlice
      config: { enabled: true }, // data from configSlice
    });

    // Check references to the original data within slices
    expect(initData.counter).toBe(counterSlice.data);
    expect(initData.user).toBe(userSlice.data);
    expect(initData.config).toBe(configSlice.data);
  });

  it("should handle empty state objects", () => {
    const emptyBuilder = {};
    const initData = buildMkInitData(emptyBuilder);
    expect(initData).toEqual({});
  });

  it("should handle empty undoable state", () => {
    const emptyUndoableBuilder = Undoable({});
    const initData = buildMkInitData(emptyUndoableBuilder);
    expect(initData).toEqual({});
  });

  it("should handle state with only empty slices", () => {
    const emptySliceA = Slice({});
    const emptySliceB = Slice(Undoable({}));
    const emptySlicedState = {
      a: emptySliceA,
      b: emptySliceB,
    };
    const initData = buildMkInitData(emptySlicedState);
    expect(initData).toEqual({
      a: {},
      b: {},
    });
  });
});
