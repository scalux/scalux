import { describe, it, expect, beforeEach, vi } from "vitest";
import { configureStore } from "../../src";
import { reducer, mkApi } from "./setups/logic/state";

// Integration tests for the scalux logic API using Vitest
describe("Logic integration tests", () => {
  let store = configureStore({ reducer });
  let api = mkApi(store);

  beforeEach(() => {
    // Create a fresh store and API for each test to avoid state leakage
    store = configureStore({ reducer });
    api = mkApi(store as any);
  });

  it("should have initial data and status", () => {
    expect(api.app.value.get).toBe(10);
    expect(api.app.status.get).toBe("idle");
  });

  it("should set the value correctly", () => {
    api.app.value.set(42);
    expect(api.app.value.get).toBe(42);
  });

  it("should add to the value correctly", () => {
    api.app.value.add(5);
    expect(api.app.value.get).toBe(15);
  });

  it("should double the data asynchronously", async () => {
    await api.app.value.doubleAsync();
    expect(api.app.value.get).toBe(20);
  });

  it("should compute valuePlus without dispatching", () => {
    // valuePlus is a pure selector, it should not modify the state
    expect(api.app.valuePlus(7)).toBe(17);
    api.app.value.set(30);
    expect(api.app.valuePlus(3)).toBe(33);
  });

  it("should set and get status correctly", () => {
    api.app.status.set("loading");
    expect(api.app.status.get).toBe("loading");
  });

  it("should dispatch the custom reset action", () => {
    // Spy on dispatch to verify the Thunk dispatches the correct action
    const dispatchSpy = vi.spyOn(store, "dispatch");
    api.app.status.reset();
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: "STATUS_RESET_ACTION",
      payload: undefined,
    });
  });

  it("should support undo and redo operations", () => {
    // Make multiple state changes
    api.app.value.set(1);
    api.app.value.set(2);
    expect(api.app.value.get).toBe(2);

    // Undo once: should go back to 1
    api.app.history.undo();
    expect(api.app.value.get).toBe(1);

    // Undo again: should go back to the initial value 10
    api.app.history.undo();
    expect(api.app.value.get).toBe(10);

    // Redo once: should return to 1
    api.app.history.redo();
    expect(api.app.value.get).toBe(1);

    // Redo again: should return to 2
    api.app.history.redo();
    expect(api.app.value.get).toBe(2);
  });
});
