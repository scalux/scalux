import type { AppUpdateRegister } from "./State";
import { ThunkBuilder } from "./Thunk";
import { TreeOf } from "./trees";
import { AppUpdates, ResolveUpdater, TreeUpdater } from "./Updater";
import { Obj } from "./utils";

type LogicLeaf<State, InternalState> =
  | TreeUpdater<State, any, any>
  | ResolveUpdater<any, State, InternalState, any, any>
  | ThunkBuilder<State, any, any>
  | ((...args: any[]) => any);

type LogicTree<State, InternalState> = TreeOf<LogicLeaf<State, InternalState>>;

const mkLogic =
  <State, InternalState>() =>
  <Tree extends LogicTree<State, InternalState>>(tree: Tree) =>
    tree;

const registerLogic = <SlicedState extends boolean, State, InternalState>(
  logicObject: Obj<LogicLeaf<State, InternalState>>,
  appUpdates: AppUpdateRegister<SlicedState, InternalState>
) => {
  for (const [path, logicLeaf] of Object.entries(logicObject))
    if (typeof logicLeaf !== "function") {
      const actionType = `api/${path}`;
      if (logicLeaf.kind === "ResolveUpdater") {
        appUpdates.add(
          actionType,
          logicLeaf.updates as AppUpdates<SlicedState, InternalState, any>
        );
      } else if (logicLeaf.kind === "TreeUpdater") {
        appUpdates.add(actionType, null);
      }
    }
};

export type { LogicLeaf, LogicTree };
export { mkLogic, registerLogic };
