import { Obj } from "./utils";

export type UndoableState<Data extends Obj> = {
  /** Distinguisher for type guards. */
  kind: "UndoableState";
  /** The actual data structure to be managed with history. */
  data: Data;
};

export const isUndoableState = (value: any): value is UndoableState<any> =>
  typeof value === "object" &&
  value !== null &&
  value.hasOwnProperty("kind") &&
  value.kind === "UndoableState";

const mkUndoableState = <Data extends Obj>(
  data: Data
): UndoableState<Data> => ({
  kind: "UndoableState",
  data,
});

/**
 * Factory function to wrap initial state data, marking it for undo/redo history tracking.
 * Use this when defining the state structure passed to `State()` or `Slice()`.
 *
 * @template T The type of the data object to make undoable.
 * @param data The initial data object.
 * @returns An `UndoableState` marker object containing the data.
 * @example
 * const undoableCounterState = Undoable({ count: 0 });
 * // Type: UndoableState<{ count: number }>
 *
 * const app = State(Undoable({ value: "initial" }));
 * const historySlice = Slice(Undoable({ items: [] as string[] }));
 *
 * @see State
 * @see Slice
 */
export const Undoable = <T extends Obj>(data: T): UndoableState<T> =>
  mkUndoableState(data);
