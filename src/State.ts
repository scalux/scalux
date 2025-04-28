import { Obj, Prettify } from "./utils";
import { ActionCreators, StateWithHistory } from "redux-undo";
import { mkComponent } from "./Component";
import { AppSlice, HomogeneousState, MkSliceState } from "./Slice";
import { mkThunk } from "./Thunk";
import { mkRegister } from "./register";
import { mkLogic } from "./Logic";
import { GenericDictionary } from "./utils";
import { UndoableState } from "./Undoable";
import { AppUpdates, mkUpdater } from "./Updater";
import { mkIcons, mkLabels } from "./assets";
import { mkSelectors } from "./selectors";
import { mkResolver } from "./Resolver";
import { buildMkInitData } from "./initData";
import { buildMkLogger } from "./mkLogger";

// --- Original Type Utilities (Unchanged) ---

export type MkRootState<T> = T extends UndoableState<any>
  ? StateWithHistory<T["data"]>
  : T extends Obj<AppSlice<any, any>>
  ? {
      [K in keyof T]: T[K] extends AppSlice<any, any>
        ? MkSliceState<T[K], true>
        : T[K];
    }
  : T;

export type MkInternalState<T> = T extends UndoableState<any>
  ? T["data"]
  : T extends Obj<AppSlice<any, any>>
  ? {
      [K in keyof T]: T[K] extends AppSlice<any, any>
        ? MkSliceState<T[K], false>
        : never;
    }
  : T;

export type AppUpdateRegister<
  SlicedState extends boolean,
  InternalState
> = GenericDictionary<AppUpdates<SlicedState, InternalState, any> | null>;

// ────────────────────────────────────────────────────────────────────────────────
// Public aliases – give every exported helper a stable, human‑readable name.
// This flattens the emitted .d.ts file and avoids deep anonymous generics.
// ────────────────────────────────────────────────────────────────────────────────

/** Type alias for the Component builder */
export type ScaluxComponent<SS extends boolean, S, IS> = ReturnType<
  typeof mkComponent<SS, S, IS>
>;

/** Type alias for the Updater builder */
export type ScaluxUpdater<SS extends boolean, S, IS> = ReturnType<
  typeof mkUpdater<SS, S, IS>
>;

/** Type alias for the Logic builder */
export type ScaluxLogic<S, IS> = ReturnType<typeof mkLogic<S, IS>>;

/** Type alias for the Thunk builder */
export type ScaluxThunk<S> = ReturnType<typeof mkThunk<S>>;

/** Type alias for the Labels builder */
export type ScaluxLabels<S> = ReturnType<typeof mkLabels<S>>;

/** Type alias for the Icons builder */
export type ScaluxIcons<S> = ReturnType<typeof mkIcons<S>>;

/** Type alias for the generated selectors object */
export type ScaluxSelectors<SB extends Obj> = ReturnType<
  typeof mkSelectors<SB>
>;

/** Type alias for the Resolver builder */
export type ScaluxResolver<S> = ReturnType<typeof mkResolver<S>>;

/** Type alias for the initData value */
export type ScaluxInitData<SB extends Obj> = ReturnType<
  typeof buildMkInitData<SB>
>;

/** Type alias for the mkLogger function */
export type ScaluxMkLogger<S> = ReturnType<typeof buildMkLogger<S>>;

/** Type alias for the register function */
export type ScaluxRegister<
  SS extends boolean,
  S,
  IS,
  Sel extends ScaluxSelectors<any>
> = ReturnType<typeof mkRegister<SS, S, IS, Sel>>;

/** Type alias for the undo/redo actions created by ScaluxThunk */
export type ScaluxUndoRedoAction<S> = ReturnType<ScaluxThunk<S>>; // The type returned when calling the Thunk factory

/**
 * Full toolkit type alias – represents the object returned by `State()`.
 */
export interface ScaluxToolkit<
  SB extends Obj,
  SS extends boolean = SB extends Obj<AppSlice<any, any>> ? true : false,
  S = Prettify<MkRootState<SB>>,
  IS = MkInternalState<SB>,
  Sel extends ScaluxSelectors<SB> = ScaluxSelectors<SB> // Define selector type once
> {
  /**
   * Creates a connected React component, linking UI to state and actions.
   * @see mkComponent (implementation details)
   */
  Component: ScaluxComponent<SS, S, IS>;
  /**
   * Finalizes the configuration, builds the root Redux reducer, and optionally
   * creates the `mkApi` function if a `logic` tree is provided.
   * This MUST be called after all `Component` and `Logic` registrations are done.
   * @see mkRegister (implementation details)
   */
  register: ScaluxRegister<SS, S, IS, Sel>;
  /**
   * Defines state update logic. Can be a simple function returning an `UpdateTree`
   * or an object with `resolve` and `updates` for complex/async operations.
   * @see mkUpdater (implementation details)
   */
  Updater: ScaluxUpdater<SS, S, IS>;
  /**
   * Defines a structure for organizing reusable application logic (`Updater`s, `Thunk`s, `Resolver`s).
   * Can be passed to `register` to generate a typed API.
   * @see mkLogic (implementation details)
   */
  Logic: ScaluxLogic<S, IS>;
  /**
   * Configures and creates connected components for displaying internationalized labels.
   * @see mkLabels (implementation details)
   */
  Labels: ScaluxLabels<S>;
  /**
   * Configures and creates connected components for displaying theme-aware icons.
   * @see mkIcons (implementation details)
   */
  Icons: ScaluxIcons<S>;
  /**
   * A collection of automatically generated selector functions providing convenient
   * access to the state, automatically handling `Undoable` wrappers (`.present`).
   * Includes `pick`, `rawPick`, `grab`, `rawGrab`, `internalState`, `rootState`.
   * The structure depends on whether the state is simple, sliced, or undoable.
   * @see mkSelectors (implementation details)
   */
  selectors: Sel; // Use the defined Sel type
  /**
   * Holds the calculated initial internal state value, derived from the `stateBuilder`.
   * This represents the state structure without top-level history wrappers,
   * as initially defined (useful for reset logic).
   * @see buildMkInitData (implementation details)
   */
  initData: ScaluxInitData<SB>;
  /**
   * Creates a reusable, typed selector function. Useful within `Updater`'s `resolve`
   * function or `Component`'s `data` configuration.
   * @see mkResolver (implementation details)
   */
  Resolver: ScaluxResolver<S>;
  /**
   * Creates a typed Redux Thunk action creator compatible with `Scalux`.
   * Useful for integrating custom thunk logic or third-party actions.
   * @see mkThunk (implementation details)
   */
  Thunk: ScaluxThunk<S>;
  /**
   * A pre-built Thunk action creator that dispatches the `undo` action
   * compatible with `redux-undo`. Available only if the state uses `Undoable`.
   */
  undo: ScaluxUndoRedoAction<S>;
  /**
   * A pre-built Thunk action creator that dispatches the `redo` action
   * compatible with `redux-undo`. Available only if the state uses `Undoable`.
   */
  redo: ScaluxUndoRedoAction<S>;
  /**
   * Creates a Redux middleware for logging changes to a specific part of the state.
   * Useful for debugging, especially for tracking state machine transitions or
   * specific data points without cluttering the Redux DevTools.
   *
   * @param selector A function `(state: RootState) => PropValue` that selects the property to monitor.
   * @param displayName A string name used in the console logs to identify the monitored property.
   * @returns A Redux middleware instance.
   * @see buildMkLogger (implementation details)
   */
  mkLogger: ScaluxMkLogger<S>;
  /**
   * Note: `Slice` and `Undoable` functions are imported separately and used
   * when *defining* the `stateBuilder` object passed to `State()`.
   * They are not part of the returned API object itself but are essential
   * for constructing the input to `State`.
   * @see Slice
   * @see Undoable
   */
  // Adding a placeholder for the note, as interfaces cannot have non-property members
  _notes?: "See Slice and Undoable imports";
}

// ────────────────────────────────────────────────────────────────────────────────
// Internal factory – returns the full toolkit. Wrapped below by `State` so we can
// export a named alias (`ScaluxToolkit`) without recursive type issues.
// ────────────────────────────────────────────────────────────────────────────────

const appUpdates: any = new GenericDictionary();
const usedDomains = new Set<string>();

const _stateFactory = <
  StateBuilder extends Obj,
  State = Prettify<MkRootState<StateBuilder>>,
  InternalState = MkInternalState<StateBuilder>
>(
  stateBuilder: StateBuilder & HomogeneousState<StateBuilder>
): ScaluxToolkit<StateBuilder> => {
  // Return type is the specific toolkit interface
  type SlicedState = StateBuilder extends Obj<AppSlice<any, any>>
    ? true
    : false;

  // --- Create Toolkit Components (similar to original code) ---
  const selectors = mkSelectors<StateBuilder>(stateBuilder); // Keep type inference here
  const Thunk = mkThunk<State>();
  const Component = mkComponent<SlicedState, State, InternalState>(
    appUpdates,
    usedDomains
  );
  const Updater = mkUpdater<SlicedState, State, InternalState>();
  const Logic = mkLogic<State, InternalState>();
  const Labels = mkLabels<State>();
  const Icons = mkIcons<State>();
  const Resolver = mkResolver<State>();
  const initData = buildMkInitData<StateBuilder>(stateBuilder);
  const mkLogger = buildMkLogger<State>();

  // --- Return the Public API object matching the ScaluxToolkit interface ---
  return {
    Component,
    register: mkRegister<
      SlicedState,
      State,
      InternalState,
      typeof selectors // Pass the *type* of the generated selectors
    >(stateBuilder, appUpdates, selectors),
    Updater,
    Logic,
    Labels,
    Icons,
    selectors, // Assign the generated selectors object
    initData,
    Resolver,
    Thunk,
    undo: Thunk(() => (dispatch) => {
      // Dispatch redux-undo's action, ensuring payload is undefined for consistency
      dispatch({ ...ActionCreators.undo(), payload: undefined });
    }),
    redo: Thunk(() => (dispatch) => {
      // Dispatch redux-undo's action, ensuring payload is undefined for consistency
      dispatch({ ...ActionCreators.redo(), payload: undefined });
    }),
    mkLogger,
  } as ScaluxToolkit<StateBuilder>; // Use type assertion to ensure conformity
};

/**
 * The main factory function for initializing the `Scalux` instance for an application.
 * It takes the initial state configuration and returns an object containing all
 * the necessary builders (`Component`, `Updater`, `Slice`, `Logic`, etc.) and
 * utilities (`selectors`, `undo`, `redo`, `initData`, `mkLogger`) strongly typed
 * according to the provided state structure.
 *
 * @template StateBuilder An object defining the initial state structure. It must be "homogeneous":
 * either a plain object, an object wrapped in `Undoable()`, or an object
 * where *all* properties are `AppSlice` definitions (created via `Slice()`).
 * Mixing plain properties and slices at the root level is disallowed.
 * @template State The inferred Root State type (including history wrappers).
 * @template InternalState The inferred Internal State type (without root history wrappers).
 * @param stateBuilder The initial state configuration object. Must satisfy `HomogeneousState`.
 * @returns An object containing the `Scalux` builders and utilities, typed for the specific state structure.
 * @example
 * // Simple State
 * const { Component, Updater, register, initData } = State({ count: 0, user: null });
 * console.log(initData); // { count: 0, user: null }
 *
 * // Root Undoable State
 * const { Component, Updater, register, undo, redo, initData } = State(Undoable({ value: "a" }));
 * console.log(initData); // { value: "a" }
 *
 * // Sliced State
 * const { Component, Updater, register, selectors, Slice, initData, mkLogger } = State({
 * ui: Slice({ theme: 'light' }),
 * data: Slice(Undoable({ items: [] })) // Data slice with history
 * });
 * console.log(initData); // { ui: { theme: 'light' }, data: { items: [] } }
 * const theme = selectors.pick.ui.theme(store.getState());
 * const items = selectors.pick.data.items(store.getState()); // Accesses data.present.items
 * const historyData = selectors.rawGrab.data(store.getState()); // Accesses full { present, past, future }
 * const themeLogger = mkLogger(state => state.ui.theme, 'UI Theme');
 * // Add themeLogger to store middleware
 */
export const State = _stateFactory;
