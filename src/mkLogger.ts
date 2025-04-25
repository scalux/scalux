import { Middleware, Dispatch, UnknownAction } from "@reduxjs/toolkit";

type MkLoggerFn<RootState> = <PropValue>(
  selector: (state: RootState) => PropValue,
  displayName: string
) => Middleware<{}, RootState, Dispatch<UnknownAction>>;
export const buildMkLogger = <RootState>(): MkLoggerFn<RootState> => {
  const mkLogger: MkLoggerFn<RootState> = <PropValue>(
    selector: (state: RootState) => PropValue,
    displayName: string
  ): Middleware<{}, RootState, Dispatch<UnknownAction>> => {
    let previousValue: PropValue | undefined = undefined;
    let isInitialLogDone = false;

    return (store) => {
      try {
        const initialValue = selector(store.getState());
        console.log(
          `%c[SCALUX Logger] Init value for "${displayName}":`,
          "color: blue; font-weight: bold;",
          initialValue
        );
        console.log("==================================================");
        previousValue = initialValue;
        isInitialLogDone = true;
      } catch (e) {
        console.error(
          `[SCALUX Logger] Error selecting initial value for "${displayName}":`,
          e
        );
      }

      return (next) => (action) => {
        if (!isInitialLogDone) {
          return next(action);
        }

        const valueToCompare = previousValue;
        const result = next(action);

        let valueAfter: PropValue;
        try {
          valueAfter = selector(store.getState());
          previousValue = valueAfter;
        } catch (e) {
          console.error(
            `[SCALUX Logger] Error selecting value after action for "${displayName}" (Action Type: ${
              typeof action === "object" && action !== null && "type" in action
                ? (action as UnknownAction).type
                : "unknown"
            }):`,
            e
          );
          return result;
        }

        if (valueAfter !== valueToCompare) {
          console.log(
            `%c[SCALUX Logger] Prop "${displayName}" changed`,
            "color: green; font-weight: bold;",
            `(Action Type: ${
              typeof action === "object" && action !== null && "type" in action
                ? (action as UnknownAction).type
                : "unknown"
            })`
          );
          console.log("  Previous value:", valueToCompare);
          console.log("  Next value:    ", valueAfter);
          console.log("==================================================");
        }

        return result;
      };
    };
  };

  return mkLogger;
};
