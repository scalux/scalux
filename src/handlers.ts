import { UpdateTree } from "./trees";
import { isPromise, Obj, Prettify, RemoveNeverValues } from "./utils";
import { AppThunk, ThunkBuilder } from "./Thunk";
import {
  TreeUpdater,
  InlineTreeUpdater,
  Updater,
  ResolveUpdater,
  ComponentUpdater,
} from "./Updater";
import { AppUpdateRegister } from "./State";

type HandlerProp<Prop> = Prop extends () => void
  ? true
  : Prop extends (payload: any) => void
  ? true
  : false;

type HandlerProps<T extends Obj> = Prettify<
  RemoveNeverValues<{
    [K in keyof T]: HandlerProp<T[K]> extends true ? T[K] : never;
  }>
>;

type HandlerPayloads<T extends Obj> = Prettify<{
  [K in keyof HandlerProps<T>]: HandlerProps<T>[K] extends (
    payload: any
  ) => void
    ? Parameters<HandlerProps<T>[K]>[0]
    : undefined;
}>;

type ComponentHandler<
  SlicedState extends boolean,
  State,
  InternalState,
  Payload,
  ResolveReturn,
  UpdaterReturn extends
    | UpdateTree<InternalState>
    | Promise<UpdateTree<InternalState>>
> =
  | ComponentUpdater<
      SlicedState,
      State,
      InternalState,
      Payload,
      ResolveReturn,
      UpdaterReturn
    >
  | ThunkBuilder<State, Payload, any>;

type ComponentHandlers<
  SlicedState extends boolean,
  State,
  InternalState,
  Payloads
> = {
  [K in keyof Payloads]: Updater<
    SlicedState,
    State,
    InternalState,
    Payloads[K],
    any,
    any
  >;
};

const isInlineTreeUpdater = <State, InternalState, Payload>(
  builder: ComponentHandler<any, State, InternalState, Payload, any, any>
): builder is InlineTreeUpdater<State, InternalState, Payload, any> =>
  typeof builder === "function";

const isExternalTreeUpdater = <State, InternalState, Payload>(
  builder: ComponentHandler<any, State, InternalState, Payload, any, any>
): builder is TreeUpdater<State, Payload, any> =>
  typeof builder === "object" &&
  builder !== null &&
  "kind" in builder &&
  builder.kind === "TreeUpdater";

const isResolveUpdater = <State, InternalState, Payload>(
  builder: ComponentHandler<any, State, InternalState, Payload, any, any>
): builder is ResolveUpdater<any, State, InternalState, Payload, any> => // Corrected return type
  typeof builder === "object" &&
  builder !== null &&
  "kind" in builder &&
  builder.kind === "ResolveUpdater";

const isThunkBuilder = <State, InternalState, Payload>(
  builder: ComponentHandler<any, State, InternalState, Payload, any, any>
): builder is ThunkBuilder<State, Payload, any> =>
  typeof builder === "object" &&
  builder !== null &&
  "kind" in builder &&
  builder.kind === "Thunk";

const mkTreeUpdaterThunk =
  <State, InternalState>(
    actionType: string,
    treeUpdater: (
      state: State,
      payload: any
    ) => UpdateTree<InternalState> | Promise<UpdateTree<InternalState>>
  ): AppThunk<State, any, any> =>
  (payload) =>
  (dispatch, getState) => {
    const state = getState();
    try {
      const updatesResult = treeUpdater(state, payload);

      if (isPromise(updatesResult)) {
        return updatesResult
          .then((updates) => {
            dispatch({ type: actionType, payload, updates });
          })
          .catch((error) => {
            console.error(
              `[SCALUX] Error during async tree update for action "${actionType}":`,
              error
            );
            throw error;
          });
      } else {
        dispatch({ type: actionType, payload, updates: updatesResult });
      }
    } catch (error) {
      console.error(
        `[SCALUX] Error during sync tree update for action "${actionType}":`,
        error
      );
      throw error;
    }
  };

const mkResolverThunk =
  <SlicedState extends boolean, State, InternalState>(
    actionType: string,
    { resolve }: ResolveUpdater<SlicedState, State, InternalState, any, any>
  ): AppThunk<State, any, any> =>
  (payload) =>
  (dispatch, getState) => {
    const state = getState();
    try {
      const resolvedPayloadResult = resolve(state, payload);

      if (isPromise(resolvedPayloadResult)) {
        return resolvedPayloadResult
          .then((resolvedPayload) => {
            dispatch({ type: actionType, payload, resolvedPayload });
          })
          .catch((error) => {
            console.error(
              `[SCALUX] Error during async resolve for action "${actionType}":`,
              error
            );
            throw error;
          });
      } else {
        dispatch({
          type: actionType,
          payload,
          resolvedPayload: resolvedPayloadResult,
        });
      }
    } catch (error) {
      console.error(
        `[SCALUX] Error during sync resolve for action "${actionType}":`,
        error
      );
      throw error;
    }
  };

const handlerToThunk = <State, InternalState>(
  actionType: string,
  handlerBuilder: ComponentHandler<any, State, InternalState, any, any, any>
): AppThunk<State, InternalState, any> => {
  if (isInlineTreeUpdater(handlerBuilder))
    return mkTreeUpdaterThunk(actionType, handlerBuilder as any);
  else if (isExternalTreeUpdater(handlerBuilder))
    return mkTreeUpdaterThunk(actionType, handlerBuilder.handler);
  else if (isResolveUpdater(handlerBuilder))
    return mkResolverThunk(
      actionType,
      handlerBuilder as ResolveUpdater<any, State, InternalState, any, any>
    );
  else if (isThunkBuilder(handlerBuilder)) return handlerBuilder.thunk as any;
  else throw new Error("[SCALUX] Invalid handler type encountered.");
};

const registerHandlerUpdates = <
  SlicedState extends boolean,
  State,
  InternalState
>(
  actionType: string,
  handler: ComponentHandler<SlicedState, State, InternalState, any, any, any>,
  appUpdateRegister: AppUpdateRegister<SlicedState, InternalState>
) => {
  if (typeof handler !== "function") {
    if (handler.kind === "ResolveUpdater") {
      appUpdateRegister.add(actionType, handler.updates);
    } else if (handler.kind === "TreeUpdater") {
      appUpdateRegister.add(actionType, null);
    }
  } else {
    appUpdateRegister.add(actionType, null);
  }
};

export type {
  HandlerProp,
  ComponentHandler,
  ComponentHandlers,
  HandlerPayloads,
};
export { isThunkBuilder, handlerToThunk, registerHandlerUpdates };
