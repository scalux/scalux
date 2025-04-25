// tests/Updater.test.ts
import { describe, it, expect } from "vitest";
import { State } from "../../src/State"; // Importez State pour obtenir mkUpdater
import type { TreeUpdater, ResolveUpdater } from "../../src/Updater"; // Types pour assertions
import { Slice } from "../../src/Slice";

// Créez une instance de State pour obtenir les constructeurs typés
const { Updater, Resolver } = State({ value: 0, other: "" });
type RootState = { value: number; other: string };
type InternalState = { value: number; other: string };

describe("mkUpdater Factory", () => {
  it("should create a TreeUpdater when passed a function", () => {
    const updateFn = (state: RootState) => ({ value: state.value + 1 });
    const updater = Updater(updateFn);

    expect(updater.kind).toBe("TreeUpdater");
    // Pourrait être nécessaire de caster si TS ne le reconnaît pas automatiquement
    expect((updater as TreeUpdater<any, any, any>).handler).toBe(updateFn);
  });

  it("should create a TreeUpdater when passed an async function", async () => {
    const updateFnAsync = async (state: RootState, payload: string) => {
      await new Promise((r) => setTimeout(r, 10));
      return { value: state.value + 1, other: payload };
    };
    const updater = Updater(updateFnAsync);

    expect(updater.kind).toBe("TreeUpdater");
    expect((updater as TreeUpdater<any, any, any>).handler).toBe(updateFnAsync);

    // Vérifions aussi que le handler async fonctionne (juste pour être sûr)
    const result = await (
      updater as TreeUpdater<RootState, string, any>
    ).handler({ value: 5, other: "" }, "test");
    expect(result).toEqual({ value: 6, other: "test" });
  });

  it("should create a ResolveUpdater when passed an object with resolve/updates", () => {
    const resolveFn = Resolver((_state: RootState, payload: number) => {
      return `processed_${payload}`;
    });
    const updatesFn = (state: InternalState, resolvedPayload: string) => {
      state.value += resolvedPayload.length;
      state.other = resolvedPayload;
    };

    const updater = Updater({
      resolve: resolveFn,
      updates: updatesFn,
    });

    expect(updater.kind).toBe("ResolveUpdater");
    const resolveUpdater = updater as ResolveUpdater<
      false,
      RootState,
      InternalState,
      number,
      string
    >;
    expect(resolveUpdater.resolve).toBe(resolveFn);
    expect(resolveUpdater.updates).toBe(updatesFn);
  });

  it("should create a ResolveUpdater with async resolve", () => {
    const resolveFnAsync = Resolver(
      async (_state: RootState, payload: number): Promise<string> => {
        await new Promise((r) => setTimeout(r, 10));
        return `async_processed_${payload}`;
      }
    );
    const updatesFn = (state: InternalState, resolvedPayload: string) => {
      state.other = resolvedPayload;
    };

    const updater = Updater({
      resolve: resolveFnAsync,
      updates: updatesFn,
    });

    expect(updater.kind).toBe("ResolveUpdater");
    const resolveUpdater = updater as ResolveUpdater<
      false,
      RootState,
      InternalState,
      number,
      Promise<string>
    >;
    expect(resolveUpdater.resolve).toBe(resolveFnAsync);
    expect(resolveUpdater.updates).toBe(updatesFn);
  });

  it("should create a ResolveUpdater with sliced updates", () => {
    // Simulez un état slicé pour obtenir le bon type d'Updater
    const { Updater: SlicedUpdater, Resolver: SlicedResolver } = State({
      counter: Slice({ count: 0 }),
      user: Slice({ name: "" }),
    });
    type SlicedRootState = {
      counter: { count: number };
      user: { name: string };
    };
    type SlicedInternalState = SlicedRootState;

    const resolveFn = SlicedResolver(
      (_state: SlicedRootState, userId: string) => ({ userId, newCount: 10 })
    );

    const updatesObj = {
      counter: (
        counterState: { count: number },
        resolved: { userId: string; newCount: number }
      ) => {
        counterState.count = resolved.newCount;
      },
      user: (userState: { name: string }, resolved: { userId: string }) => {
        userState.name = `User_${resolved.userId}`;
      },
    };

    const updater = SlicedUpdater({
      resolve: resolveFn,
      updates: updatesObj,
    });

    expect(updater.kind).toBe("ResolveUpdater");
    const resolveUpdater = updater as ResolveUpdater<
      true,
      SlicedRootState,
      SlicedInternalState,
      string,
      { userId: string; newCount: number }
    >;
    expect(resolveUpdater.resolve).toBe(resolveFn);
    expect(resolveUpdater.updates).toEqual(updatesObj);
  });
});
