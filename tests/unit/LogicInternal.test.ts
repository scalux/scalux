// tests/LogicInternal.test.ts
import { describe, it, expect, vi } from "vitest";
import { State } from "../../src/State";
import { registerLogic } from "../../src/Logic"; // Ajustez le chemin
import type { LogicLeaf } from "../../src/Logic"; // Ajustez le chemin
import { GenericDictionary } from "../../src/utils";
import type { AppUpdateRegister } from "../../src/State";

// --- Setup ---
const { Updater, Thunk, Resolver } = State({ value: 1 });
type SimpleState = { value: number };

describe("Logic Internal Helpers", () => {
  describe("registerLogic", () => {
    it("should register updates correctly based on LogicLeaf kind", () => {
      const mockRegister = new GenericDictionary<any>();
      vi.spyOn(mockRegister, "add");

      const resolveUpdatesFn = (state: SimpleState, payload: string) => {
        state.value = payload.length;
      };

      // Créer un objet logique aplati (normalement fait par nestedToPathObject)
      const logicObject: Record<string, LogicLeaf<SimpleState, SimpleState>> = {
        "featureA/doTreeUpdate": Updater((state: SimpleState) => ({
          value: state.value + 1,
        })),
        "featureA/doResolveUpdate": Updater({
          resolve: Resolver(async (_state: SimpleState, p: string) =>
            p.toUpperCase()
          ),
          updates: resolveUpdatesFn,
        }),
        "featureB/runThunk": Thunk(
          () => (dispatch) =>
            dispatch({ type: "THUNK_RUN", payload: undefined })
        ),
        "featureB/selectData": Resolver(
          (state: SimpleState) => state.value * 2
        ),
        otherUpdate: Updater((state: SimpleState) => ({
          value: state.value * 10,
        })), // Autre TreeUpdater
      };

      registerLogic<false, SimpleState, SimpleState>(
        logicObject,
        mockRegister as AppUpdateRegister<false, SimpleState>
      );

      // Vérifier les appels à mockRegister.add

      // TreeUpdaters => null
      expect(mockRegister.add).toHaveBeenCalledWith(
        "api/featureA/doTreeUpdate",
        null
      );
      expect(mockRegister.add).toHaveBeenCalledWith("api/otherUpdate", null);

      // ResolveUpdater => updates function/object
      expect(mockRegister.add).toHaveBeenCalledWith(
        "api/featureA/doResolveUpdate",
        resolveUpdatesFn // Ou l'objet 'updates' si c'était un objet
      );

      // Thunk => non enregistré ici
      expect(mockRegister.add).not.toHaveBeenCalledWith(
        expect.stringContaining("runThunk"),
        expect.anything()
      );

      // Resolver => non enregistré ici (car c'est une fonction)
      expect(mockRegister.add).not.toHaveBeenCalledWith(
        expect.stringContaining("selectData"),
        expect.anything()
      );

      // Vérifier le nombre total d'appels (doit être 3: 2 tree, 1 resolve)
      expect(mockRegister.add).toHaveBeenCalledTimes(3);
    });

    it("should handle empty logic object", () => {
      const mockRegister = new GenericDictionary<any>();
      vi.spyOn(mockRegister, "add");
      const logicObject = {};

      registerLogic<false, SimpleState, SimpleState>(
        logicObject,
        mockRegister as AppUpdateRegister<false, SimpleState>
      );

      expect(mockRegister.add).not.toHaveBeenCalled();
    });
  });
});
