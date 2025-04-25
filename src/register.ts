import {
  CaseReducer,
  combineReducers,
  createReducer,
  EnhancedStore,
  Reducer,
} from "@reduxjs/toolkit";
import { ThunkBuilder } from "./Thunk";
import { handlerToThunk } from "./handlers";
import { IsAny, IsUnknown, Obj } from "./utils";
import { LogicLeaf, LogicTree, registerLogic } from "./Logic";
import type { AppUpdateRegister } from "./State";
import { AppSlice, isStateSliced, HomogeneousState } from "./Slice";
import { isUndoableState } from "./Undoable";
import mkUndoable from "redux-undo";
import {
  updateTree,
  UpdateTree,
  nestedToPathObject,
  pathsToObject,
} from "./trees";
import { AppUpdates, ResolveUpdater, TreeUpdater } from "./Updater";

type HandleAsync<T> = T extends Promise<any> ? Promise<void> : void;

type MkApiMethod<Payload, ReturnType> = IsUnknown<Payload> extends true
  ? () => HandleAsync<ReturnType>
  : IsAny<Payload> extends true
  ? () => HandleAsync<ReturnType>
  : undefined extends Payload
  ? () => HandleAsync<ReturnType>
  : (payload: Payload) => HandleAsync<ReturnType>;

type TransformedLeaf<L> = L extends TreeUpdater<
  any,
  infer Payload,
  infer UpdateReturn
>
  ? MkApiMethod<Payload, UpdateReturn>
  : L extends ThunkBuilder<any, infer Payload, infer ThunkReturn>
  ? MkApiMethod<Payload, ThunkReturn>
  : L extends ResolveUpdater<any, any, any, infer Payload, infer ResolveReturn>
  ? MkApiMethod<Payload, ResolveReturn>
  : L extends (state: any, payload: infer Payload) => infer Value
  ? IsUnknown<Payload> extends true
    ? Value
    : IsAny<Payload> extends true
    ? Value
    : undefined extends Payload
    ? Value
    : (payload: Payload) => Value
  : never;

type ApiTree<T> = {
  [K in keyof T]: T[K] extends LogicLeaf<any, any>
    ? TransformedLeaf<T[K]>
    : T[K] extends { [key: string]: any }
    ? ApiTree<T[K]>
    : never;
};

type SelectorsToGetters<T> = T extends (state: any) => infer R
  ? R
  : T extends object
  ? { [K in keyof T]: SelectorsToGetters<T[K]> }
  : T;

type UpdateAction<State> = {
  type: string;
  payload: any;
  updates: UpdateTree<State>;
};

type ResolvedAction = {
  type: string;
  payload: any;
  resolvedPayload: any;
};

const mkCreateSimpleStateReducer =
  <State extends Obj>(appUpdates: Obj<AppUpdates<false, any, any> | null>) =>
  (state: State) => {
    const updateTreeReducer = ((state: State, action: UpdateAction<State>) => {
      updateTree(state, action.updates);
    }) as CaseReducer<State, UpdateAction<State>>;
    return createReducer(state, (builder) => {
      for (const [actionType, updates] of Object.entries(appUpdates)) {
        if (updates === null) {
          builder.addCase(actionType, updateTreeReducer);
        } else {
          const caseReducer = ((state: State, action: ResolvedAction) => {
            updates(state, action.resolvedPayload);
          }) as CaseReducer<State, ResolvedAction>;
          builder.addCase(actionType, caseReducer);
        }
      }
    });
  };

const mkSliceCaseReducer =
  (sliceName: string) =>
  <SliceState extends Obj>(
    sliceState: SliceState,
    { updates }: UpdateAction<SliceState>
  ) => {
    const sliceUpdates = updates[sliceName] as UpdateTree<SliceState>;
    updateTree(sliceState, sliceUpdates);
  };

const mkCreateSlicedStateReducer =
  <State, Slices extends Obj<AppSlice<any>>>(
    appUpdates: Obj<AppUpdates<true, any, any> | null>
  ) =>
  (slices: Slices) => {
    const sliceReducers: Obj<Reducer> = {};

    for (const [sliceName, slice] of Object.entries(slices)) {
      const { data, undoable } = slice;

      const updateTreeReducer = mkSliceCaseReducer(sliceName) as CaseReducer<
        typeof data,
        UpdateAction<typeof data>
      >;

      const sliceReducer = createReducer(data, (builder) => {
        for (const [actionType, updates] of Object.entries(appUpdates)) {
          if (updates === null) {
            builder.addCase(actionType, updateTreeReducer);
          } else {
            const sliceUpdates = updates[sliceName];
            if (sliceUpdates) {
              const sliceCaseReducer = ((
                state: State,
                action: ResolvedAction
              ) => {
                sliceUpdates(state, action.resolvedPayload);
              }) as CaseReducer<State, ResolvedAction>;
              builder.addCase(actionType, sliceCaseReducer);
            }
          }
        }
      });

      if (undoable) sliceReducers[sliceName] = mkUndoable(sliceReducer);
      else sliceReducers[sliceName] = sliceReducer;
    }
    return combineReducers(sliceReducers) as Reducer<State>;
  };

const mkReducer = <SlicedState extends boolean, State>(
  stateBuilder: HomogeneousState<any>,
  appUpdateRegister: AppUpdateRegister<SlicedState, any>
): Reducer<State> => {
  const appUpdates = appUpdateRegister.get();
  if (isStateSliced(stateBuilder))
    return mkCreateSlicedStateReducer(
      appUpdates as Obj<AppUpdates<true, any, any> | null>
    )(stateBuilder) as Reducer<State>;
  else if (isUndoableState(stateBuilder)) {
    const { data } = stateBuilder;
    const reducer = mkCreateSimpleStateReducer(
      appUpdates as Obj<AppUpdates<false, any, any> | null>
    )(data);
    return mkUndoable(reducer) as unknown as Reducer<State>;
  } else
    return mkCreateSimpleStateReducer(
      appUpdates as Obj<AppUpdates<false, any, any> | null>
    )(stateBuilder) as Reducer<State>;
};

const mkLogicObject = <State, InternalState>(
  logicTree: LogicTree<State, InternalState>
): Obj<LogicLeaf<State, InternalState>> => nestedToPathObject(logicTree, "/");

const handleSelectorLeaf =
  <State, InternalState>({ getState }: EnhancedStore<State>) =>
  (apiLeaves: Obj<TransformedLeaf<LogicLeaf<State, InternalState>>>) =>
  (path: string, leaf: (...args: any[]) => any) => {
    if (leaf.length === 0)
      Object.defineProperty(apiLeaves, path, {
        get: () => {
          return leaf();
        },
        enumerable: true,
        configurable: true,
      });
    else if (leaf.length === 1)
      Object.defineProperty(apiLeaves, path, {
        get: () => {
          const currentState = getState();
          return leaf(currentState);
        },
        enumerable: true,
        configurable: true,
      });
    else
      apiLeaves[path] = (payload: any) => {
        const currentState = getState();
        return leaf(currentState, payload);
      };
  };

const buildMkApi =
  <
    State,
    InternalState,
    Tree extends LogicTree<State, InternalState>,
    Selectors extends Obj
  >(
    logicObject: Obj<LogicLeaf<State, InternalState>>,
    selectorsObject: Selectors
  ) =>
  (store: EnhancedStore<State>) => {
    const appApiLeaves: Obj<TransformedLeaf<LogicLeaf<State, InternalState>>> =
      {};
    for (const [path, leaf] of Object.entries(logicObject)) {
      if (typeof leaf === "function") {
        handleSelectorLeaf(store)(appApiLeaves)(path, leaf);
      } else if (leaf.kind === "TreeUpdater") {
        const thunk = handlerToThunk(`api/${path}`, leaf.handler);
        appApiLeaves[path] = (payload: any) =>
          thunk(payload)(store.dispatch, store.getState);
      } else if (leaf.kind === "Thunk") {
        const thunk = leaf.thunk;
        appApiLeaves[path] = (payload: any) =>
          thunk(payload)(store.dispatch, store.getState);
      } else if (leaf.kind === "ResolveUpdater") {
        const thunk = handlerToThunk(`api/${path}`, leaf);
        appApiLeaves[path] = (payload: any) =>
          thunk(payload)(store.dispatch, store.getState);
      } else {
        throw new Error("Invalid Leaf");
      }
    }

    const appApi = pathsToObject(appApiLeaves) as unknown as ApiTree<Tree>;

    const stateApiLeaves: Obj<any> = {};
    const flatSelectors = nestedToPathObject(selectorsObject, "/");

    for (const [path, selectorFn] of Object.entries(flatSelectors)) {
      if (typeof selectorFn === "function") {
        Object.defineProperty(stateApiLeaves, path, {
          get: () => selectorFn(store.getState()),
          enumerable: true,
          configurable: true,
        });
      }
    }
    const stateApi = pathsToObject(
      stateApiLeaves
    ) as unknown as SelectorsToGetters<Selectors>;

    return { app: appApi, state: stateApi };
  };

const mkRegister =
  <SlicedState extends boolean, State, InternalState, Selectors extends Obj>(
    stateBuilder: HomogeneousState<any>,
    appUpdateRegister: AppUpdateRegister<SlicedState, InternalState>,
    selectors: Selectors
  ) =>
  <Tree extends LogicTree<State, InternalState>>(
    logicTree?: Tree
  ): {
    reducer: Reducer<State>;
    mkApi: (store: EnhancedStore<State>) => {
      app: keyof Tree extends never ? {} : ApiTree<Tree>;
      state: SelectorsToGetters<Selectors>;
    };
  } => {
    const logicObject = mkLogicObject(logicTree || {});
    registerLogic(logicObject, appUpdateRegister);

    const apiBuilder = buildMkApi<State, InternalState, Tree, Selectors>(
      logicObject,
      selectors
    );

    return {
      reducer: mkReducer(stateBuilder, appUpdateRegister),
      mkApi: apiBuilder,
    };
  };

export {
  mkRegister,
  mkCreateSlicedStateReducer,
  mkCreateSimpleStateReducer,
  buildMkApi,
};
