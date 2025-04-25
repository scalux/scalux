import { IsUnknown } from "./utils";

const mkResolver =
  <State>() =>
  <ResolveReturn, Payload>(
    resolver: (state: State, payload: Payload) => ResolveReturn
  ): IsUnknown<Payload> extends true
    ? (state: State) => ResolveReturn
    : (state: State, payload: Payload) => ResolveReturn =>
    resolver as any;

export { mkResolver };
