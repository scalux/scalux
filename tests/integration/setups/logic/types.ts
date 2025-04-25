export type Status = "idle" | "loading" | "error";

export type LogicState = {
  data: number;
  status: Status;
};
