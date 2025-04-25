import { StateWithHistory } from "redux-undo";
import { Obj } from "./utils";
import { isUndoableState, UndoableState } from "./Undoable";

type SliceMarkers<T> = {
  [K in keyof T]: T[K] extends AppSlice<any, any> ? true : false;
};

export type HomogeneousState<T> = T extends object // Only apply to objects
  ? boolean extends SliceMarkers<T>[keyof T] // Check if both true & false markers exist
    ? {
        // If mixed, return this error structure
        __reject_state_builder: "State properties must be either all AppSlices or none are AppSlices.";
      }
    : T // Otherwise, the type is valid
  : T; // Non-objects pass through

export type MkSliceState<Slice extends AppSlice<any, any>, History = true> = [
  Slice["undoable"],
  History
] extends [true, true]
  ? StateWithHistory<Slice["data"]>
  : Slice["data"];

export type AppSlice<Data extends Obj, Undoable = false> = {
  kind: "Slice";
  data: Data;
  undoable: Undoable;
};

/**
 * Factory function to create an `AppSlice` definition.
 * It infers the `Data` type and automatically detects if the input `data`
 * is wrapped with `Undoable` to set the `undoable` flag correctly.
 *
 * @template T The initial data object for the slice. Can be a plain object or wrapped with `Undoable()`.
 * @param data The initial data object, potentially wrapped with `Undoable`.
 * @returns An `AppSlice` definition object representing the slice configuration.
 * @example
 * const counterSlice = Slice({ count: 0 });
 * // Type: AppSlice<{ count: number }, false>
 *
 * const historyCounterSlice = Slice(Undoable({ count: 0 }));
 * // Type: AppSlice<{ count: number }, true>
 *
 * @see Undoable
 */
export const Slice = <T extends Obj>(
  // Input parameter type remains flexible to accept T which might be UndoableState<...>
  data: T
  // The conditional return type is key:
): T extends UndoableState<infer Data> // Check if T is UndoableState, infer inner Data
  ? AppSlice<Data, true> // If yes, return AppSlice with inferred Data and undoable: true
  : AppSlice<T, false> => // **CORRECTED:** If no, return AppSlice with original type T and undoable: false
  // Implementation:
  ({
    kind: "Slice",
    // Unwrap data if it came from UndoableState
    data: isUndoableState(data) ? data.data : data,
    // Set undoable flag based on whether it was wrapped
    undoable: isUndoableState(data) ? true : false,
    // Cast needed as TS struggles matching implementation to complex conditional return type
  } as any);

export const isSlice = (value: any): value is AppSlice<any, any> =>
  typeof value === "object" &&
  value !== null &&
  value.hasOwnProperty("kind") &&
  value.kind === "Slice";

export const isStateSliced = (
  builder: unknown
): builder is Obj<AppSlice<Obj>> => {
  // Must be a non-null object
  if (typeof builder !== "object" || builder === null) return false;
  // Check if *every* value within the object is an AppSlice
  return Object.values(builder).every(isSlice);
};
