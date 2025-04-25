import { configureStore } from "../../../../src";
import { reducer } from "./state";

export const store = configureStore({ reducer });
export type AppDispatch = typeof store.dispatch;
export type AppState = ReturnType<typeof store.getState>;
