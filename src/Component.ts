import React from "react"; // Import React for types like React.FC
import { connect } from "react-redux";
import { DataBuilder, DataProps } from "./data";
import {
  ComponentHandler,
  ComponentHandlers,
  HandlerPayloads,
  handlerToThunk,
  registerHandlerUpdates,
} from "./handlers";
import { IsAny, IsUnknown, mkGetConstantValue, Obj, Prettify } from "./utils";
import type { AppUpdateRegister } from "./State";
import { AppThunk, ThunkBuilder } from "./Thunk";
import { ComponentUpdater } from "./Updater";

type OwnPropsBuilder<State, DataProps, DataBuilder> = DataBuilder extends (
  state: State,
  ownProps: infer OwnProps
) => any
  ? IsUnknown<OwnProps> extends true
    ? {}
    : IsAny<OwnProps> extends true
    ? {}
    : OwnProps
  : DataBuilder extends Partial<DataProps>
  ? Prettify<Omit<DataProps, keyof DataBuilder>>
  : {};

type AnyComponentHandler = ComponentHandler<any, any, any, any, any, any>;

const mkComponentThunks = <
  SlicedState extends boolean,
  State,
  InternalState,
  Props extends Obj
>(
  domain: string,
  handlers: ComponentHandlers<SlicedState, State, InternalState, Props>,
  appUpdateRegister: AppUpdateRegister<SlicedState, InternalState>
): { [K in keyof typeof handlers]: AppThunk<State, any, any> } => {
  const thunks: { [K in keyof typeof handlers]?: AppThunk<State, any, any> } =
    {};

  for (const handlerName in handlers) {
    if (Object.prototype.hasOwnProperty.call(handlers, handlerName)) {
      const handler = handlers[handlerName];
      const componentHandler = handler as AnyComponentHandler;
      const actionType = `${domain}/${handlerName}`;

      registerHandlerUpdates(actionType, componentHandler, appUpdateRegister);
      const thunk = handlerToThunk(actionType, componentHandler);
      thunks[handlerName] = thunk;
    }
  }

  return thunks as { [K in keyof typeof handlers]: AppThunk<State, any, any> };
};

type DataMapper<State, DataProps, OwnProps = any> =
  | ((state: State, ownProps: OwnProps) => DataProps)
  | ((state: State) => DataProps)
  | (() => Partial<DataProps>);

const mkMapStateToProps = <State, DataProps, OwnProps = any>(
  mapper: DataMapper<State, DataProps, OwnProps>
): ((state: State, ownProps: OwnProps) => DataProps) => {
  const argsNumber = mapper.length;

  if (argsNumber === 0) {
    let lastOwnProps: OwnProps | undefined;
    let lastResult: Partial<DataProps> | undefined;

    return (_: State, ownProps: OwnProps): DataProps => {
      if (lastOwnProps === ownProps && lastResult !== undefined) {
        return lastResult as DataProps;
      }
      lastOwnProps = ownProps;
      lastResult = { ...(mapper as () => Partial<DataProps>)(), ...ownProps };
      return lastResult as DataProps;
    };
  } else {
    return mapper as (state: State, ownProps: OwnProps) => DataProps;
  }
};

const mkComponentData = <
  State,
  Props extends Obj,
  Data extends DataBuilder<State, DataProps<Props>>,
  OwnProps = OwnPropsBuilder<State, DataProps<Props>, Data>
>(
  builder: Data
): ((state: State, ownProps: OwnProps) => DataProps<Props>) => {
  if (typeof builder !== "function") {
    const staticDataFn = mkGetConstantValue(builder) as () => Partial<
      DataProps<Props>
    >;

    let lastOwnProps: OwnProps | undefined;
    let lastResult: DataProps<Props> | undefined; // Stocke le résultat complet

    return (_state: State, ownProps: OwnProps): DataProps<Props> => {
      if (lastOwnProps === ownProps && lastResult !== undefined) {
        return lastResult;
      }
      lastOwnProps = ownProps;
      lastResult = { ...staticDataFn(), ...ownProps } as DataProps<Props>;
      return lastResult;
    };
  } else {
    const functionalMapper = builder as (
      state: State,
      ownProps: OwnProps
    ) => DataProps<Props>;

    return functionalMapper;
  }
};

type ComponentBuilderConfig<
  State,
  Props extends Obj,
  Data extends DataBuilder<State, DataProps<Props>>,
  Handlers
> = {
  domain: string;
  render: React.FC<Props>;
  data: Data;
  handlers: Handlers;
};

type HandlerBuilders<
  SlicedState extends boolean,
  State,
  InternalState,
  Props extends Obj
> = {
  [K in keyof HandlerPayloads<Props>]:
    | ComponentUpdater<
        SlicedState,
        State,
        InternalState,
        HandlerPayloads<Props>[K],
        any,
        any
      >
    | ThunkBuilder<State, HandlerPayloads<Props>[K], any>; // Or a Thunk
};

type ComponentFactory = <SlicedState extends boolean, State, InternalState>(
  appUpdateRegister: AppUpdateRegister<SlicedState, InternalState>,
  usedDomains: Set<string>
) => <
  Props extends Obj,
  Data extends DataBuilder<State, DataProps<Props>>,
  Handlers extends HandlerBuilders<SlicedState, State, InternalState, Props>
>(
  builder: ComponentBuilderConfig<State, Props, Data, Handlers>
) => React.FC<OwnPropsBuilder<State, DataProps<Props>, Data>>;

const mkComponent: ComponentFactory =
  (appUpdateRegister, usedDomains) => (builder) => {
    const { domain, render, data, handlers } = builder;

    if (usedDomains.has(domain)) {
      if (process.env.NODE_ENV === "development") {
        // L'avertissement est conservé car il signale l'écrasement en dev
        console.warn(
          `[SCALUX DEV/HMR] Domain "${domain}" re-registered (might be due to HMR in DEV mode). ` +
            `To check for accidental duplicates, try a full page refresh (F5/Cmd+R). ` +
            `If this warning persists after refresh, check your code for multiple components using the same domain name.`
        );
      } else {
        throw new Error(
          `[SCALUX] Duplicate Component domain detected: "${domain}". Domain names must be unique across the application in production.`
        );
      }
    } else {
      usedDomains.add(domain);
    }

    // Utilisation de 'as any' pour simplifier, affinez les types si nécessaire
    const thunks = mkComponentThunks(
      domain,
      handlers as any,
      appUpdateRegister
    );

    // Utilisation de 'as any' pour simplifier, affinez les types si nécessaire
    const componentData = mkComponentData(data as any);

    // Utilisation de 'as any' pour simplifier, affinez les types si nécessaire
    return connect(componentData, thunks)(render as any) as any;
  };

export { mkComponentData, mkComponentThunks, mkComponent };
