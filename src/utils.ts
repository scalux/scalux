export type Obj<T = unknown> = Record<string, T>;

type FilterNever<T extends Obj> = {
  [K in keyof T]: T[K] extends never ? never : K;
}[keyof T];

export type RemoveNeverValues<T extends Obj> = {
  [K in FilterNever<T>]: T[K];
};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {}; // The intersection with {} is the trick to trigger eager evaluation.

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IsUnknown<T> = unknown extends T
  ? [keyof T] extends [never] // Ensure it's not 'any'
    ? true
    : false
  : false;

export const mkGetConstantValue = <Value>(value: Value): (() => Value) => {
  // Immediately invoked function expression (IIFE) to capture the value
  return (() => {
    const memo = value;
    return () => memo;
  })();
};

export class GenericDictionary<T> {
  private dict: { [key: string]: T } = {};

  add(key: string, value: T): void {
    this.dict[key] = value;
  }

  get(): { [key: string]: T } {
    return this.dict;
  }
}

export type BaseValue =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | RegExp
  | ReadonlyArray<any> // Arrays are treated as leaf values for state updates
  | Function; // Functions are also treated as leaf values

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type Push<T extends any[], V> = [...T, V];

type LastOf<T> = UnionToIntersection<
  T extends any ? () => T : never
> extends () => infer R
  ? R
  : never;

export type TuplifyUnion<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false
> = true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>;

export function isPromise<T>(p: any): p is Promise<T> {
  return p !== null && typeof p === "object" && typeof p.then === "function";
}

export type NonUndefined<T> = T extends undefined ? never : T;
