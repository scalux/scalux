// tests/Resolver.test.ts
import { describe, it, expect } from "vitest";
import { State } from "../../src/State"; // Import State pour obtenir mkResolver

// Créez une instance de State pour obtenir les constructeurs typés
const { Resolver } = State({ user: { id: 1, name: "Test" }, items: [10, 20] });
type RootState = { user: { id: number; name: string }; items: number[] };

describe("mkResolver Factory", () => {
  it("should return the exact same function reference provided", () => {
    const selectorFn = (state: RootState) => state.user.name;

    // Utiliser la factory mkResolver
    const resolver = Resolver(selectorFn);

    // Vérifier que mkResolver retourne la même fonction
    expect(resolver).toBe(selectorFn);
  });

  it("should work with selectors taking state and payload", () => {
    type Payload = { index: number };
    const selectorFnWithPayload = (state: RootState, payload: Payload) =>
      state.items[payload.index];

    const resolver = Resolver(selectorFnWithPayload);

    expect(resolver).toBe(selectorFnWithPayload);

    // Vérifier que le resolver fonctionne comme prévu
    const state: RootState = { user: { id: 1, name: "" }, items: [100, 200] };
    expect(resolver(state, { index: 0 })).toBe(100);
    expect(resolver(state, { index: 1 })).toBe(200);
  });

  it("should work with complex return types", () => {
    const selectorFnComplex = (state: RootState) => ({
      userName: state.user.name,
      firstItem: state.items[0],
    });

    const resolver = Resolver(selectorFnComplex);

    expect(resolver).toBe(selectorFnComplex);

    // Vérifier le fonctionnement
    const state: RootState = { user: { id: 1, name: "Complex" }, items: [5] };
    expect(resolver(state)).toEqual({ userName: "Complex", firstItem: 5 });
  });
});
