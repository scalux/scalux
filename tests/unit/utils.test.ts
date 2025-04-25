// tests/utils.test.ts
import { describe, it, expect } from "vitest";
import { mkGetConstantValue, GenericDictionary } from "../../src/utils"; // Ajustez le chemin
// Autres utilitaires comme Prettify, RemoveNeverValues sont des types, testés par TS

describe("Utility Functions and Classes", () => {
  // --- Test de mkGetConstantValue ---
  describe("mkGetConstantValue", () => {
    it("should return a function that always returns the initial value", () => {
      const value1 = 123;
      const getValue1 = mkGetConstantValue(value1);
      expect(getValue1()).toBe(123);
      expect(getValue1()).toBe(123); // Call again

      const value2 = { a: 1, b: "test" };
      const getValue2 = mkGetConstantValue(value2);
      expect(getValue2()).toEqual({ a: 1, b: "test" });
      expect(getValue2()).toBe(value2); // Should return the same object reference

      const value3 = null;
      const getValue3 = mkGetConstantValue(value3);
      expect(getValue3()).toBeNull();
    });
  });

  // --- Test de GenericDictionary ---
  describe("GenericDictionary", () => {
    it("should allow adding and retrieving items", () => {
      const dict = new GenericDictionary<number | string>();

      dict.add("a", 1);
      dict.add("b", "hello");
      dict.add("c", 100);

      expect(dict.get()).toEqual({
        a: 1,
        b: "hello",
        c: 100,
      });
    });

    it("should overwrite existing keys", () => {
      const dict = new GenericDictionary<boolean>();
      dict.add("key1", true);
      expect(dict.get()["key1"]).toBe(true);

      dict.add("key1", false); // Overwrite
      expect(dict.get()["key1"]).toBe(false);
    });

    it("should return an empty object initially", () => {
      const dict = new GenericDictionary<any>();
      expect(dict.get()).toEqual({});
    });

    it("should work with complex value types", () => {
      type Complex = { id: number; data: number[] };
      const dict = new GenericDictionary<Complex>();
      const item1: Complex = { id: 1, data: [1] };
      const item2: Complex = { id: 2, data: [2, 3] };

      dict.add("one", item1);
      dict.add("two", item2);

      expect(dict.get()).toEqual({
        one: { id: 1, data: [1] },
        two: { id: 2, data: [2, 3] },
      });
      expect(dict.get()["one"]).toBe(item1); // Check reference
    });
  });
});
