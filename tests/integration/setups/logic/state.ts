import { State, Undoable } from "../../../../src";
import type { LogicState, Status } from "./types";

const { Logic, Updater, Resolver, Thunk, undo, redo, register } = State(
  Undoable<LogicState>({
    data: 10,
    status: "idle",
  })
);

const logicTree = Logic({
  value: {
    get: Resolver((s) => s.present.data),
    set: Updater((_, v: number) => ({ data: v })),
    add: Updater((s, n: number) => ({ data: s.present.data + n })),
    doubleAsync: Updater({
      resolve: Resolver(async (s) => {
        await new Promise((r) => setTimeout(r, 1));
        return s.present.data * 2;
      }),
      updates: (s, d: number) => {
        s.data = d;
      },
    }),
  },
  status: {
    get: Resolver((s) => s.present.status),
    set: Updater((_, st: Status) => ({ status: st })),
    reset: Thunk(() => (dispatch) => {
      dispatch({ type: "STATUS_RESET_ACTION", payload: undefined });
    }),
  },
  history: { undo, redo },
  valuePlus: Resolver((s, p: number) => s.present.data + p),
});

export const { reducer, mkApi } = register(logicTree);
