import React from "react";
import { BaseValue, Obj, TuplifyUnion } from "./utils";

type TreeOf<T> = { [key: string]: TreeOf<T> | T };

type IsLeafNode<T> = T extends BaseValue ? true : false;

type UpdateTree<T> = IsLeafNode<T> extends true
  ? T
  : T extends object
  ? {
      [P in keyof T]?: UpdateTree<T[P]>;
    }
  : T;

function isPlainObject(
  value: unknown
): value is Record<string | number | symbol, any> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    value instanceof Date ||
    value instanceof RegExp ||
    typeof value === "function"
  ) {
    return false;
  }
  return true;
}

function isLeafNodeValue(value: unknown): boolean {
  const type = typeof value;
  return (
    type === "string" ||
    type === "number" ||
    type === "boolean" ||
    type === "bigint" ||
    type === "symbol" ||
    value === null || // typeof null is 'object', special check needed
    type === "undefined" ||
    type === "function" || // Functions considered leaves here
    value instanceof Date ||
    value instanceof RegExp ||
    Array.isArray(value) // Runtime check for arrays
  );
}

function updateTree<T>(tree: T, updates: UpdateTree<T>): void {
  if (!updates) {
    return;
  }
  for (const key in updates) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      const typedKey = key as keyof T;
      const updateValue = (updates as any)[typedKey];
      const originalValue = tree[typedKey];

      if (isPlainObject(updateValue) && !isLeafNodeValue(updateValue)) {
        // And if the original value is not a plain object OR IS a leaf value...
        if (!isPlainObject(originalValue) || isLeafNodeValue(originalValue)) {
          // ...we create/replace with an empty object.
          (tree as any)[typedKey] = {};
        }
        // Descend recursively.
        updateTree(
          (tree as any)[typedKey],
          updateValue as UpdateTree<T[keyof T]>
        );
      } else {
        // Otherwise (primitive, null, array, date, function...), assign directly.
        (tree as any)[typedKey] = updateValue;
      }
    }
  }
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type Join<T extends string[], D extends string> = T extends []
  ? never
  : T extends [infer F]
  ? F
  : T extends [infer F, ...infer R]
  ? `${F & string}${D}${Join<Extract<R, string[]>, D>}`
  : string;

type MaxDepth = 20;

type NestedToPathObject<
  T,
  D extends string = "/",
  P extends string[] = [],
  Depth extends any[] = []
> =
  // if MaxDepth exceeded, stop and return a generic Record
  Depth["length"] extends MaxDepth
    ? Record<string, unknown>
    : // otherwise, continue as before
    T extends { kind: any }
    ? { [key in Join<P, D>]: T }
    : T extends Obj
    ? UnionToIntersection<
        {
          [K in keyof T]: NestedToPathObject<
            T[K],
            D,
            [...P, Extract<K, string>],
            [...Depth, unknown] // increment depth
          >;
        }[keyof T]
      >
    : { [key in Join<P, D>]: T };

const isReactElement = (value: any): value is React.ReactElement => {
  return React.isValidElement(value);
};

const nestedToPathObject = <T extends Obj, Separator extends string>(
  obj: T,
  separator: Separator
): NestedToPathObject<T, Separator> => {
  const result: NestedToPathObject<T, Separator> = {} as any;

  const recurse = (current: any, path: string[]) => {
    if (
      current !== null &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      !isReactElement(current)
    ) {
      // If the object has a "kind" property, consider it a leaf.
      if ("kind" in current) {
        const joinedPath = path.join(separator);
        (result as any)[joinedPath] = current;
      } else {
        for (const key in current) {
          if (Object.prototype.hasOwnProperty.call(current, key)) {
            recurse(current[key], [...path, key]);
          }
        }
      }
    } else {
      // For non-objects (or arrays/react elements) treat it as a leaf.
      const joinedPath = path.join(separator);
      (result as any)[joinedPath] = current;
    }
  };

  recurse(obj, []);
  return result;
};

type AssignPath<Parts extends string[], Value> = Parts extends [
  infer Head extends string,
  ...infer Rest extends string[]
]
  ? { [K in Head]: AssignPath<Rest, Value> }
  : Value;

type Split<S extends string, D extends string = "/"> = string extends S
  ? string[]
  : S extends `${infer Head}${D}${infer Tail}`
  ? [Head, ...Split<Tail, D>]
  : [S];

type PathsToObject<T, D extends string = "/"> = UnionToIntersection<
  {
    [K in keyof T]: AssignPath<Split<K & string, D>, T[K]>;
  }[keyof T]
>;

const pathsToObject = <T extends Record<string, any>, D extends string = "/">(
  pathsObj: T,
  separator: D = "/" as D
): PathsToObject<T, D> => {
  const result: any = {};

  for (const path in pathsObj) {
    if (Object.prototype.hasOwnProperty.call(pathsObj, path)) {
      const parts = path.split(separator);
      let current = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // Si c'est la dernière partie du chemin (la "feuille")
        if (i === parts.length - 1) {
          const descriptor = Object.getOwnPropertyDescriptor(pathsObj, path);
          if (descriptor) {
            Object.defineProperty(current, part, descriptor);
          }
        } else {
          if (!(part in current)) {
            current[part] = {};
          } else if (
            typeof current[part] !== "object" ||
            current[part] === null
          ) {
            throw new Error(
              `Conflict at path "${parts.slice(0, i + 1).join(separator)}"`
            );
          }
          current = current[part];
        }
      }
    }
  }

  return result;
};

const isLeaf = (value: any): boolean =>
  !isReactElement(value) && !isPlainObject(value);

type PathTree<T, Separator extends string = "/", P extends string[] = []> = {
  [K in keyof T]: IsLeafNode<T[K]> extends true
    ? Join<[...P, K & string], Separator>
    : PathTree<T[K], Separator, [...P, K & string]>;
};

const pathTree = <T>(
  obj: T,
  separator = "/" as string,
  path: string[] = []
): PathTree<T, typeof separator> => {
  // If we are at a leaf, return just the full path string.
  if (isLeaf(obj)) {
    return path.join(separator) as PathTree<T, typeof separator>;
  }

  // Otherwise, recurse for each key
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as Record<string, unknown>)[key];
      const newPath = [...path, key];
      if (isLeaf(value)) {
        result[key] = newPath.join(separator);
      } else {
        result[key] = pathTree(value, separator, newPath);
      }
    }
  }

  return result as PathTree<T, typeof separator>;
};

type TreePaths<T> = keyof NestedToPathObject<T, "/">;

type MetaTreeNode<Path extends string, Opts extends ReadonlyArray<string>> = {
  /** The full path string to reach this node (e.g., "parent/child"). */
  $path: Path;
  /** A tuple containing the string keys of the direct children of this node. */
  $opts: Opts;
  /** Allows other properties from the recursive structure. */
  [key: string]: any;
};

type MetaTreeLeaf<Path extends string, Value> = {
  /** The full path string to reach this node. */
  $path: Path;
  /** The original value of the leaf node. */
  value: Value;
};

type MetaTreeInternal<T, P extends string = ""> = T extends null // Base case: Leaf nodes are null
  ? MetaTreeLeaf<P, T>
  : T extends Record<string, any> // If it's a non-null object structure
  ? {
      // Recursively define children with updated paths
      [K in keyof T]: MetaTreeInternal<
        T[K],
        P extends "" ? K & string : `${P}/${K & string}`
      >;
    } & {
      // Add metadata to this node
      /** The full path string to reach this node. */
      $path: P;
      /** A tuple containing the string keys of the direct children of this node. */
      $opts: TuplifyUnion<keyof T>;
    }
  : MetaTreeLeaf<P, T>; // Fallback for other potential leaf types

type MetaTree<T extends Record<string, any>> = {
  [K in keyof T]: MetaTreeInternal<T[K], K & string>;
};

export {
  isPlainObject,
  updateTree,
  nestedToPathObject,
  pathsToObject,
  pathTree,
};
export type {
  UpdateTree,
  IsLeafNode,
  TreeOf,
  NestedToPathObject,
  PathsToObject,
  PathTree,
  TreePaths,
  MetaTree,
  MetaTreeNode,
};
