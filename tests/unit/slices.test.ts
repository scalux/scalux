// tests/Slice.test.ts
import { describe, it, expect } from "vitest";
import { Slice, isSlice, isStateSliced } from "../../src/Slice"; // Ajustez le chemin
import { Undoable } from "../../src/Undoable"; // Ajustez le chemin
import type { AppSlice } from "../../src/Slice"; // Ajustez le chemin

describe("Slice Factory and Type Guards", () => {
  // --- Test de la factory Slice ---
  it("Slice() should create a non-undoable slice definition", () => {
    const data = { count: 0, name: "test" };
    const sliceDef = Slice(data);

    expect(sliceDef.kind).toBe("Slice");
    expect(sliceDef.data).toEqual(data); // Should contain the original data
    expect(sliceDef.data).toBe(data); // Should be the same reference initially
    expect(sliceDef.undoable).toBe(false);
  });

  it("Slice(Undoable(...)) should create an undoable slice definition", () => {
    const data = { value: "abc" };
    const undoableData = Undoable(data);
    const sliceDef = Slice(undoableData);

    expect(sliceDef.kind).toBe("Slice");
    expect(sliceDef.data).toEqual(data); // Should contain the *unwrapped* data
    expect(sliceDef.data).toBe(data); // Should reference the original unwrapped data
    expect(sliceDef.undoable).toBe(true);
  });

  // --- Test du type guard isSlice ---
  it("isSlice should correctly identify AppSlice objects", () => {
    const sliceDef = Slice({ a: 1 });
    const undoableSliceDef = Slice(Undoable({ b: 2 }));
    const undoableState = Undoable({ c: 3 });
    const plainObject = { d: 4 };

    expect(isSlice(sliceDef)).toBe(true);
    expect(isSlice(undoableSliceDef)).toBe(true);
    expect(isSlice(undoableState)).toBe(false); // Not an AppSlice, it's UndoableState
    expect(isSlice(plainObject)).toBe(false);
    expect(isSlice(null)).toBe(false);
    expect(isSlice(undefined)).toBe(false);
    expect(isSlice(123)).toBe(false);
    expect(isSlice("string")).toBe(false);
  });

  // --- Test du type guard isStateSliced ---
  it("isStateSliced should correctly identify homogeneous slice objects", () => {
    const sliceA = Slice({ a: 1 });
    const sliceB = Slice(Undoable({ b: 2 }));

    const slicedState = { sliceA, sliceB };
    const mixedState = { sliceA, plain: { c: 3 } };
    const nonSlicedState = { d: 4, e: 5 };

    expect(isStateSliced(slicedState)).toBe(true);
    expect(isStateSliced(mixedState)).toBe(false); // Contains non-slice property
    expect(isStateSliced(nonSlicedState)).toBe(false);
    expect(isStateSliced({ a: 1 })).toBe(false); // Values aren't slices
    expect(isStateSliced(null)).toBe(false);
    expect(isStateSliced(undefined)).toBe(false);
    expect(isStateSliced(123)).toBe(false);
  });

  // --- HomogeneousState (Type Test - vérifié par le compilateur) ---
  // Ces tests sont conceptuels et vérifiés par TypeScript lors de la compilation.
  it("HomogeneousState type should allow all slices", () => {
    const sliceA = Slice({ a: 1 });
    const sliceB = Slice(Undoable({ b: 2 }));
    // Devrait compiler sans erreur
    const validState: { sliceA: typeof sliceA; sliceB: typeof sliceB } & Record<
      string,
      AppSlice<any, any>
    > = { sliceA, sliceB };
    expect(validState).toBeDefined();
  });

  it("HomogeneousState type should allow no slices", () => {
    // Devrait compiler sans erreur
    const validState: { a: number; b: string } = { a: 1, b: "test" };
    expect(validState).toBeDefined();
  });

  /* // Décommentez pour voir l'erreur TypeScript
      it('HomogeneousState type should prevent mixing slices and non-slices', () => {
          const sliceA = Slice({ a: 1 });
          // Ne devrait PAS compiler - erreur sur 'mixedState'
          const mixedState: { sliceA: typeof sliceA; plain: { c: number } } = {
              sliceA,
              plain: { c: 3 }
          };
          expect(mixedState).toBeDefined(); // Ne sera jamais atteint si TS fonctionne
      });
      */
});
