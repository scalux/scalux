import { Obj } from "./utils";
import { AppSlice, isStateSliced } from "./Slice";
import { isUndoableState } from "./Undoable";
import type { MkInternalState } from "./State";

export const buildMkInitData = <StateBuilder extends Obj>(
  stateBuilder: StateBuilder
): MkInternalState<StateBuilder> => {
  if (isUndoableState(stateBuilder)) {
    return stateBuilder.data as MkInternalState<StateBuilder>;
  } else if (isStateSliced(stateBuilder)) {
    const initialInternalState: Obj = {};
    for (const sliceName in stateBuilder) {
      if (Object.prototype.hasOwnProperty.call(stateBuilder, sliceName)) {
        const slice = stateBuilder[sliceName] as AppSlice<any, any>;
        initialInternalState[sliceName] = slice.data;
      }
    }
    return initialInternalState as MkInternalState<StateBuilder>;
  } else {
    return stateBuilder as MkInternalState<StateBuilder>;
  }
};
