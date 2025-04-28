import {
  BaseValue,
  IsUnknown,
  mkGetConstantValue,
  NonUndefined,
  Obj,
} from "./utils";

type DataProps<T> = {
  [K in keyof T as [NonUndefined<T[K]>] extends [never]
    ? K
    : NonUndefined<T[K]> extends (...args: any[]) => any
    ? never
    : K]: T[K];
};

type DataBuilder<State, DataProps> =
  | Partial<DataProps> // Static object (partial data)
  | ((state: State, ownProps: any) => DataProps); // Selector function

const mkValue =
  <State>() =>
  <
    Payload,
    Val extends ((state: State, payload: Payload) => any) | BaseValue | Obj
  >(
    val: Val
  ): Val extends (state: State, payload: Payload) => infer R
    ? IsUnknown<Payload> extends true
      ? (state: State) => R
      : (state: State, payload: Payload) => R
    : (state: State) => Val =>
    (typeof val === "function" ? val : mkGetConstantValue(val)) as any;

export type { DataProps, DataBuilder };
export { mkValue };
