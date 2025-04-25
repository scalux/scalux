import { describe, it, expect } from "vitest";
import { Undoable, isUndoableState } from "../../src/Undoable"; // Ajustez le chemin
import { Slice } from "../../src/Slice"; // Ajustez le chemin

describe("Undoable Factory and Type Guard", () => {
  // --- Test de la factory Undoable ---
  it("Undoable() should create an UndoableState marker object", () => {
    const data = { count: 0, items: ["a"] };
    const undoableState = Undoable(data);

    expect(undoableState.kind).toBe("UndoableState");
    expect(undoableState.data).toEqual(data);
    expect(undoableState.data).toBe(data); // Check reference
  });

  it("Undoable() should work with empty objects", () => {
    const data = {};
    const undoableState = Undoable(data);

    expect(undoableState.kind).toBe("UndoableState");
    expect(undoableState.data).toEqual({});
  });

  // --- Test du type guard isUndoableState ---
  it("isUndoableState should correctly identify UndoableState objects", () => {
    const undoableState = Undoable({ a: 1 });
    const sliceDef = Slice({ b: 2 });
    const undoableSliceDef = Slice(Undoable({ c: 3 }));
    const plainObject = { d: 4 };

    expect(isUndoableState(undoableState)).toBe(true);
    expect(isUndoableState(sliceDef)).toBe(false); // It's an AppSlice
    expect(isUndoableState(undoableSliceDef)).toBe(false); // It's an AppSlice
    expect(isUndoableState(plainObject)).toBe(false);
    expect(isUndoableState(null)).toBe(false);
    expect(isUndoableState(undefined)).toBe(false);
    expect(isUndoableState(123)).toBe(false);
  });
});
