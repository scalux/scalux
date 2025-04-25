import { Obj } from "./utils";
import { AppSlice, HomogeneousState, isStateSliced } from "./Slice";
import { isUndoableState, UndoableState } from "./Undoable";
import { StateWithHistory } from "redux-undo";
import type { MkInternalState, MkRootState } from "./State";

type Selector<S, R> = (state: S) => R;

type PropertyHistory<PropType> = {
  present: PropType;
  past: PropType[];
  future: PropType[];
};

type PickState<RootState, State, Undoable = false, History = false> = {
  [Prop in keyof State]: [Undoable, History] extends [true, true]
    ? Selector<RootState, PropertyHistory<State[Prop]>> // rawPick on undoable state
    : Selector<RootState, State[Prop]>; // pick, or rawPick on non-undoable state
};

type PickSlicedState<
  RootState,
  State extends { [K in keyof State]: AppSlice<any, any> },
  History = false
> = {
  [Slice in keyof State]: PickState<
    RootState,
    State[Slice]["data"],
    State[Slice]["undoable"],
    History
  >;
};

type GrabState<RootState, State, Undoable = false, History = false> = [
  Undoable,
  History
] extends [true, true]
  ? Selector<RootState, StateWithHistory<State>>
  : Selector<RootState, State>;

type GrabSlicedState<
  RootState,
  State extends { [K in keyof State]: AppSlice<any, any> },
  History = false
> = {
  [Slice in keyof State]: GrabState<
    RootState,
    State[Slice]["data"],
    State[Slice]["undoable"],
    History
  >;
};

type MacroSelectors<Builder, RootState = MkRootState<Builder>> = {
  internalState: Selector<RootState, MkInternalState<Builder>>;
  rootState: Selector<RootState, RootState>;
};

export type BuiltInSelectors<
  StateBuilder,
  RootState = MkRootState<StateBuilder>
> = (StateBuilder extends UndoableState<infer Data> // Case 1: Root Undoable State
  ? {
      /** Selects a property (from `present`). */
      pick: PickState<RootState, Data, true, false>;
      /** Selects the complete history of a property. */
      rawPick: PickState<RootState, Data, true, true>;
      /** Selects the complete `present` state. */
      grab: GrabState<RootState, Data, true, false>;
      /** Selects the complete root state with history (`past`, `present`, `future`). */
      rawGrab: GrabState<RootState, Data, true, true>;
    }
  : StateBuilder extends Obj<AppSlice<any, any>> // Case 2: Sliced State
  ? {
      /** Selects a property from a slice (from `present` if undoable). */
      pick: PickSlicedState<RootState, StateBuilder, false>;
      /** Selects the complete history of a slice property (if undoable). */
      rawPick: PickSlicedState<RootState, StateBuilder, true>;
      /** Selects the `present` state of a slice (if undoable) or the entire slice. */
      grab: GrabSlicedState<RootState, StateBuilder, false>;
      /** Selects the complete slice with history (`past`, `present`, `future` if undoable). */
      rawGrab: GrabSlicedState<RootState, StateBuilder, true>;
    }
  : {
      // Case 3: Simple State (non-sliced, non-undoable at root)
      /** Selects a property. */
      pick: PickState<RootState, StateBuilder, false, false>;
      /** Selects a property (identical to `pick` in this case). */
      rawPick: PickState<RootState, StateBuilder, false, false>;
      /** Selects the complete state (identical to `rootState`). */
      grab: GrabState<RootState, StateBuilder, false, false>;
      /** Selects the complete state (identical to `grab`). */
      rawGrab: GrabState<RootState, StateBuilder, false, false>;
    }) &
  // Adds global selectors in all cases
  MacroSelectors<StateBuilder, RootState>;

const mkSelectors = <
  StateBuilder extends Obj,
  RootState = MkRootState<StateBuilder>,
  InternalState = MkInternalState<StateBuilder>
>(
  stateBuilder: StateBuilder & HomogeneousState<StateBuilder>
): BuiltInSelectors<StateBuilder, RootState> => {
  let pick: any = {};
  let rawPick: any = {};
  let grab: any = {};
  let rawGrab: any = {};

  const rootStateSelector: Selector<RootState, RootState> = (state) => state;
  let internalStateSelector: Selector<RootState, InternalState>;

  // --- Determine structure and build selectors ---

  if (isStateSliced(stateBuilder)) {
    // --- Case 1: Sliced State ---
    internalStateSelector = (state) => {
      const simpleState: any = {};
      for (const sliceName in stateBuilder) {
        const sliceConf = stateBuilder[sliceName];
        const sliceState = (state as any)[sliceName]; // Dynamic access to the slice in global state
        // Extract 'present' if slice is undoable, otherwise take slice as is
        simpleState[sliceName] = sliceConf.undoable
          ? sliceState.present
          : sliceState;
      }
      return simpleState as InternalState; // Cast to the expected InternalState type
    };

    // Iterate over each defined slice to create associated selectors
    for (const sliceName in stateBuilder) {
      const sliceConf = stateBuilder[sliceName]; // Slice configuration (data, undoable)
      const sliceDataKeys = Object.keys(sliceConf.data); // Keys/properties of the slice

      pick[sliceName] = {}; // Initialize object for 'pick' selectors of this slice
      rawPick[sliceName] = {}; // Initialize object for 'rawPick' selectors of this slice

      // Create 'pick' and 'rawPick' selectors for each property of the slice
      for (const propName of sliceDataKeys) {
        if (sliceConf.undoable) {
          // If slice is undoable:
          // pick: selects property from 'present'
          pick[sliceName][propName] = (state: RootState) =>
            (state as any)[sliceName].present[propName];

          // rawPick: reconstructs history for this specific property
          rawPick[sliceName][propName] = (
            state: RootState
          ): PropertyHistory<any> => {
            const historySlice = (state as any)[
              sliceName
            ] as StateWithHistory<any>; // Access the slice's history object
            const getProp = (obj: any) => obj?.[propName]; // Safe utility function
            return {
              present: getProp(historySlice.present),
              past: historySlice.past.map(getProp),
              future: historySlice.future.map(getProp),
            };
          };
        } else {
          // If slice is not undoable:
          // pick and rawPick are identical: select the property directly
          pick[sliceName][propName] = (state: RootState) =>
            (state as any)[sliceName][propName];
          rawPick[sliceName][propName] = (state: RootState) =>
            (state as any)[sliceName][propName];
        }
      }

      // Create 'grab' and 'rawGrab' selectors for the entire slice
      if (sliceConf.undoable) {
        // If slice is undoable:
        // grab: selects the 'present' object of the slice
        grab[sliceName] = (state: RootState) =>
          (state as any)[sliceName].present;
        // rawGrab: selects the complete history object of the slice
        rawGrab[sliceName] = (state: RootState) => (state as any)[sliceName];
      } else {
        // If slice is not undoable:
        // grab and rawGrab are identical: select the entire slice
        grab[sliceName] = (state: RootState) => (state as any)[sliceName];
        rawGrab[sliceName] = (state: RootState) => (state as any)[sliceName];
      }
    }
  } else if (isUndoableState(stateBuilder)) {
    // --- Case 2: Root Undoable State ---
    const dataKeys = Object.keys(stateBuilder.data); // Keys of the internal state
    // internalState: selects 'present' from the root state
    internalStateSelector = (state) =>
      (state as StateWithHistory<InternalState>).present;

    // Create 'pick' and 'rawPick' selectors for each property of the internal state
    for (const propName of dataKeys) {
      // pick: selects property from 'present'
      pick[propName] = (state: RootState) => (state as any).present[propName];

      // rawPick: reconstructs history for this property
      rawPick[propName] = (state: RootState): PropertyHistory<any> => {
        const rootHistoryState = state as StateWithHistory<any>;
        const getProp = (obj: any) => obj?.[propName];
        return {
          present: getProp(rootHistoryState.present),
          past: rootHistoryState.past.map(getProp),
          future: rootHistoryState.future.map(getProp),
        };
      };
    }
    // grab: selects the complete 'present' object
    grab = (state: RootState) => (state as any).present;
    // rawGrab: selects the complete root history object
    rawGrab = (state: RootState) => state;
  } else {
    // --- Case 3: Simple State (neither sliced nor undoable at root) ---
    const dataKeys = Object.keys(stateBuilder); // Keys of the state
    // internalState and rootState are identical in this case
    internalStateSelector = (state) => state as unknown as InternalState;

    // Create 'pick' and 'rawPick' selectors (identical here)
    for (const propName of dataKeys) {
      pick[propName] = (state: RootState) => (state as any)[propName];
      rawPick[propName] = (state: RootState) => (state as any)[propName];
    }
    // grab and rawGrab are identical and select the complete state
    grab = (state: RootState) => state;
    rawGrab = (state: RootState) => state;
  }

  // Return the final object containing all constructed selectors
  // The 'as any' cast is used because the complex dynamic construction
  // makes it difficult for TypeScript to verify the final BuiltInSelectors type.
  return {
    pick,
    rawPick,
    grab,
    rawGrab,
    internalState: internalStateSelector,
    rootState: rootStateSelector,
  } as any;
};

export { mkSelectors }; // Export the internal factory
