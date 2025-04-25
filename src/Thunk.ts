import { PayloadAction } from "@reduxjs/toolkit";
import { IsUnknown } from "./utils";

type AppAction<
  Payload,
  Updates = any,
  ResolvedPayload = any
> = PayloadAction<Payload> & { updates?: Updates } & {
  resolvedPayload?: ResolvedPayload;
};

type AppThunk<State, Payload, ThunkReturn extends void | Promise<void>> = (
  payload: Payload
) => (
  dispatch: <DispatchType>(action: AppAction<DispatchType, any, any>) => void,
  getState: () => State
) => ThunkReturn;

type ThunkBuilder<State, Payload, ThunkReturn extends void | Promise<void>> = {
  kind: "Thunk";
  thunk: AppThunk<State, Payload, ThunkReturn>;
};

const mkThunk =
  <State>() =>
  <Payload, ThunkReturn extends void | Promise<void>>(
    thunk: AppThunk<
      State,
      IsUnknown<Payload> extends true ? undefined : Payload,
      ThunkReturn
    >
  ): ThunkBuilder<
    State,
    IsUnknown<Payload> extends true ? undefined : Payload,
    ThunkReturn
  > => ({
    kind: "Thunk",
    thunk,
  });

export type { AppThunk, ThunkBuilder };
export { mkThunk };
