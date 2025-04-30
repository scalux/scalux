import { UpdateTree } from "./trees";
import { IsAny, IsUnknown } from "./utils";

type AppUpdates<
  SlicedState extends boolean,
  InternalState,
  ResolveReturn
> = SlicedState extends true
  ? {
      [K in keyof InternalState]?: (
        state: InternalState[K],
        payload: ResolveReturn
      ) => void;
    }
  : (state: InternalState, payload: ResolveReturn) => void;

type ResolveUpdaterBuilder<
  SlicedState extends boolean,
  State,
  InternalState,
  Payload,
  ResolveReturn
> = {
  resolve: (state: State, payload: Payload) => ResolveReturn;
  updates: AppUpdates<
    SlicedState,
    InternalState,
    ResolveReturn extends Promise<infer R> ? R : ResolveReturn
  >;
};

type InlineTreeUpdater<State, InternalState, Payload> = (
  state: State,
  payload: Payload
) => UpdateTree<InternalState> | Promise<UpdateTree<InternalState>>;

type TreeUpdater<State, Payload, UpdaterReturn> = {
  kind: "TreeUpdater";
  handler: (state: State, payload: Payload) => UpdaterReturn;
};

type ResolveUpdater<
  SlicedState extends boolean,
  State,
  InternalState,
  Payload,
  ResolveReturn
> = {
  kind: "ResolveUpdater";
  resolve: (state: State, payload: Payload) => ResolveReturn;
  updates: AppUpdates<
    SlicedState,
    InternalState,
    ResolveReturn extends Promise<infer R> ? R : ResolveReturn
  >;
};

type UpdaterBuilder<
  SlicedState extends boolean,
  State,
  InternalState,
  Payload,
  ResolveReturn
> =
  | ResolveUpdaterBuilder<
      SlicedState,
      State,
      InternalState,
      Payload,
      ResolveReturn
    >
  | InlineTreeUpdater<State, InternalState, Payload>;

type Updater<
  SlicedState extends boolean,
  State,
  InternalState,
  Payload,
  ResolveReturn,
  UpdaterReturn
> =
  | ResolveUpdater<SlicedState, State, InternalState, Payload, ResolveReturn>
  | TreeUpdater<State, Payload, UpdaterReturn>;

type ComponentUpdater<
  SlicedState extends boolean,
  State,
  InternalState,
  Payload,
  ResolveReturn,
  UpdaterReturn extends
    | UpdateTree<InternalState>
    | Promise<UpdateTree<InternalState>>
> =
  | Updater<
      SlicedState,
      State,
      InternalState,
      Payload,
      ResolveReturn,
      UpdaterReturn
    >
  | InlineTreeUpdater<State, InternalState, Payload>;

const mkUpdater =
  <SlicedState extends boolean, State, InternalState>() =>
  <
    Payload,
    ResolveReturn,
    UpdateReturn extends
      | UpdateTree<InternalState>
      | Promise<UpdateTree<InternalState>>
  >(
    config: UpdaterBuilder<
      SlicedState,
      State,
      InternalState,
      Payload,
      ResolveReturn
    >
  ): IsUnknown<ResolveReturn> extends true
    ? TreeUpdater<State, Payload, UpdateReturn>
    : IsAny<ResolveReturn> extends true
    ? TreeUpdater<State, Payload, UpdateReturn>
    : ResolveUpdater<
        SlicedState,
        State,
        InternalState,
        Payload,
        ResolveReturn
      > => {
    if (typeof config === "function")
      return { kind: "TreeUpdater", handler: config as any } as any;
    else return { ...config, kind: "ResolveUpdater" } as any;
  };

export type {
  InlineTreeUpdater,
  TreeUpdater,
  Updater,
  ResolveUpdater,
  AppUpdates,
  ComponentUpdater,
};
export { mkUpdater };
