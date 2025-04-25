import { describe, it, expect } from "vitest";
import { produce } from "immer"; // Pour tester updateTree de manière sûre
import {
  updateTree,
  nestedToPathObject,
  pathsToObject,
  pathTree,
} from "../../src/trees"; // Ajustez le chemin

describe("Tree Utilities", () => {
  // --- Tests pour updateTree ---
  describe("updateTree (via Immer produce)", () => {
    const initialState = {
      a: 1,
      b: {
        c: "hello",
        d: [10, 20],
        e: { f: true },
      },
      g: null as string | null,
    };

    it("should update top-level primitive properties", () => {
      const updates = { a: 2, g: "updated" };
      const nextState = produce(initialState, (draft) => {
        updateTree(draft, updates);
      });
      expect(nextState.a).toBe(2);
      expect(nextState.g).toBe("updated");
      expect(nextState.b).toBe(initialState.b); // Should not change b
    });

    it("should update nested properties", () => {
      const updates = { b: { c: "world", e: { f: false } } };
      const nextState = produce(initialState, (draft) => {
        updateTree(draft, updates);
      });
      expect(nextState.a).toBe(initialState.a);
      expect(nextState.b.c).toBe("world");
      expect(nextState.b.d).toBe(initialState.b.d); // d should remain unchanged
      expect(nextState.b.e.f).toBe(false);
    });

    it("should replace arrays (treated as leaf nodes)", () => {
      const updates = { b: { d: [30] } };
      const nextState = produce(initialState, (draft) => {
        updateTree(draft, updates);
      });
      expect(nextState.b.d).toEqual([30]);
      expect(nextState.b.d).not.toBe(initialState.b.d); // Should be a new array
    });

    it("should create nested objects if they dont exist", () => {
      const stateWithoutE = { a: 1, b: { c: "hi", d: [] } };
      const updates = { b: { e: { f: true } } };
      const nextState = produce(stateWithoutE, (draft) => {
        updateTree(draft, updates as any); // Cast needed as E doesn't exist on initial type
      });
      expect((nextState.b as any).e).toEqual({ f: true });
    });

    it("should handle updates with undefined values (effectively removing optional keys if structure allows)", () => {
      // Note: updateTree assigns undefined. It doesn't delete keys.
      const updates = { g: undefined };
      const nextState = produce(initialState, (draft) => {
        updateTree(draft, updates as any);
      });
      expect(nextState.g).toBeUndefined();
    });

    it("should not modify draft if updates is empty or null/undefined", () => {
      const nextStateEmpty = produce(initialState, (draft) => {
        updateTree(draft, {});
      });
      expect(nextStateEmpty).toEqual(initialState);
      expect(nextStateEmpty).toBe(initialState); // Immer should return same ref

      const nextStateNull = produce(initialState, (draft) => {
        updateTree(draft, null as any);
      });
      expect(nextStateNull).toBe(initialState);
    });
  });

  // --- Tests pour nestedToPathObject ---
  describe("nestedToPathObject", () => {
    const nested = {
      a: 1,
      b: {
        c: "hello",
        d: { e: true },
      },
      f: null,
      g: [{ h: 1 }], // Array treated as leaf
      k: { kind: "LeafObject", value: 123 }, // Object with 'kind' treated as leaf
    };

    it("should flatten nested objects into path-keyed object", () => {
      const flat = nestedToPathObject(nested, "/");
      expect(flat).toEqual({
        a: 1,
        "b/c": "hello",
        "b/d/e": true,
        f: null,
        g: [{ h: 1 }],
        k: { kind: "LeafObject", value: 123 },
      });
    });

    it("should use custom separator", () => {
      const flat = nestedToPathObject(nested, ".");
      expect(flat).toEqual({
        a: 1,
        "b.c": "hello",
        "b.d.e": true,
        f: null,
        g: [{ h: 1 }],
        k: { kind: "LeafObject", value: 123 },
      });
    });

    it("should handle empty objects", () => {
      expect(nestedToPathObject({}, "/")).toEqual({});
    });
  });

  // --- Tests pour pathsToObject ---
  describe("pathsToObject", () => {
    const flat = {
      a: 1,
      "b/c": "hello",
      "b/d/e": true,
      f: null,
      g: [{ h: 1 }],
    };

    it("should reconstruct nested object from path-keyed object", () => {
      const nested = pathsToObject(flat, "/");
      expect(nested).toEqual({
        a: 1,
        b: {
          c: "hello",
          d: { e: true },
        },
        f: null,
        g: [{ h: 1 }],
      });
    });

    it("should use custom separator", () => {
      const flatCustom = {
        a: 1,
        "b.c": "hello",
        "b.d.e": true,
      };
      const nested = pathsToObject(flatCustom, ".");
      expect(nested).toEqual({
        a: 1,
        b: {
          c: "hello",
          d: { e: true },
        },
      });
    });

    it("should handle empty objects", () => {
      expect(pathsToObject({}, "/")).toEqual({});
    });
  });

  // --- Tests pour pathTree ---
  describe("pathTree", () => {
    const nested = {
      a: 1, // Leaf
      b: {
        // Node
        c: "hello", // Leaf
        d: { e: true }, // Node -> Leaf
      },
      f: null, // Leaf
      g: [{ h: 1 }], // Leaf (array)
    };

    it("should create a tree with path strings as leaf values", () => {
      const tree = pathTree(nested, "/");
      expect(tree).toEqual({
        a: "a",
        b: {
          c: "b/c",
          d: { e: "b/d/e" },
        },
        f: "f",
        g: "g",
      });
    });

    it("should use custom separator", () => {
      const tree = pathTree(nested, ".");
      expect(tree).toEqual({
        a: "a",
        b: {
          c: "b.c",
          d: { e: "b.d.e" },
        },
        f: "f",
        g: "g",
      });
    });

    it("should handle simple values directly", () => {
      expect(pathTree(123, "/")).toBe(""); // Path is empty for root leaf
      expect(pathTree("abc", "/")).toBe("");
      expect(pathTree(null, "/")).toBe("");
    });

    it("should handle empty objects", () => {
      expect(pathTree({}, "/")).toEqual({});
    });
  });
});
