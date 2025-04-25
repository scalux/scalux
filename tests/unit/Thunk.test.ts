// tests/Thunk.test.ts
import { describe, it, expect, vi } from "vitest";
import { State } from "../../src/State"; // Import State pour obtenir mkThunk
import type { AppThunk } from "../../src/Thunk"; // Types pour assertions

// Créez une instance de State pour obtenir les constructeurs typés
const { Thunk } = State({ data: "initial" });
type RootState = { data: string };

describe("mkThunk Factory", () => {
  it("should create a ThunkBuilder wrapping the provided AppThunk", () => {
    const mockDispatch = vi.fn();
    const mockGetState = vi.fn(() => ({ data: "test state" } as RootState));

    // Définir le thunk interne
    const appThunk: AppThunk<RootState, string, void> =
      (payload: string) => (dispatch, getState) => {
        const currentState = getState();
        dispatch({
          type: "TEST_ACTION",
          payload: `${payload}-${currentState.data}`,
        });
      };

    // Utiliser la factory mkThunk
    const thunkBuilder = Thunk(appThunk);

    // Vérifier la structure du ThunkBuilder
    expect(thunkBuilder.kind).toBe("Thunk");
    expect(thunkBuilder.thunk).toBe(appThunk);

    // Vérifier que le thunk interne fonctionne comme prévu
    const actionCreator = thunkBuilder.thunk;
    const thunkAction = actionCreator("myPayload"); // Crée l'action thunk

    // Exécuter l'action thunk
    thunkAction(mockDispatch, mockGetState);

    // Vérifier les appels
    expect(mockGetState).toHaveBeenCalledOnce();
    expect(mockDispatch).toHaveBeenCalledOnce();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "TEST_ACTION",
      payload: "myPayload-test state",
    });
  });

  // Test renommé pour plus de clarté
  it("should handle thunks CALLED without meaningful input but DISPATCHING a payload", () => {
    const mockDispatch = vi.fn();
    const mockGetState = vi.fn(
      () => ({ data: "dispatched data" } as RootState)
    );

    // Définir le thunk avec le type de la payload DISPATCHÉE (string)
    // Le paramètre d'entrée peut être ignoré par la logique interne.
    const appThunkDispatchesString: AppThunk<RootState, string, void> =  // <-- Payload est string
      (_ignoredInputPayload?: string) => (dispatch, getState) => {
        // Accepte string (ou undefined si optionnel)
        const dataToDispatch = getState().data;
        // Dispatch une action où la payload EST string (correspond au type AppThunk<..., string>)
        dispatch({ type: "DISPATCH_DATA_ACTION", payload: dataToDispatch });
      };

    const thunkBuilder = Thunk(appThunkDispatchesString);

    expect(thunkBuilder.kind).toBe("Thunk");
    expect(thunkBuilder.thunk).toBe(appThunkDispatchesString);

    const actionCreator = thunkBuilder.thunk;

    // Simuler l'appel "sans payload d'entrée pertinente"
    // On DOIT fournir une string car le type l'exige, même si elle est ignorée.
    const thunkAction = actionCreator("dummy_input"); // Fournir une string factice

    // Exécuter la fonction interne
    thunkAction(mockDispatch, mockGetState);

    // Vérifier les appels
    expect(mockGetState).toHaveBeenCalledOnce();
    expect(mockDispatch).toHaveBeenCalledOnce();
    // Vérifier que l'action dispatchée a la payload STRING correcte
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "DISPATCH_DATA_ACTION",
      payload: "dispatched data", // La string de getState()
    });
  });

  // Optionnel: Test spécifique pour un thunk sans payload d'entrée ET sans payload dispatchée
  it("should handle thunks with NO input payload AND NO dispatched payload", () => {
    const mockDispatch = vi.fn();
    const mockGetState = vi.fn(() => ({ data: "action only" } as RootState));

    // Le type est AppThunk<RootState, undefined> car la payload dispatchée est undefined
    const appThunkNoInputNoPayload: AppThunk<RootState, undefined, void> =
      (_payload: undefined) => (dispatch, getState) => {
        // Accepte undefined
        console.log("Current data:", getState().data); // Accède à l'état
        // Dispatch une action avec payload: undefined (correspond au type AppThunk<..., undefined>)
        dispatch({ type: "EFFECT_ONLY_ACTION", payload: undefined });
      };

    const thunkBuilder = Thunk(appThunkNoInputNoPayload);
    const actionCreator = thunkBuilder.thunk;
    const thunkAction = actionCreator(undefined); // Appelé avec undefined

    thunkAction(mockDispatch, mockGetState);

    expect(mockGetState).toHaveBeenCalledOnce();
    expect(mockDispatch).toHaveBeenCalledOnce();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "EFFECT_ONLY_ACTION",
      payload: undefined, // Attend explicitement undefined
    });
  });

  it("should handle thunks with optional payload (if typed explicitly)", () => {
    const mockDispatch = vi.fn();
    const mockGetState = vi.fn(() => ({ data: "optional" } as RootState));

    // Type explicite pour payload optionnel
    const appThunkOptional: AppThunk<RootState, string | undefined, void> =
      (payload?: string) => (dispatch, getState) => {
        dispatch({
          type: "OPTIONAL_ACTION",
          payload: payload ?? getState().data,
        });
      };

    const thunkBuilder = Thunk(appThunkOptional);

    expect(thunkBuilder.kind).toBe("Thunk");

    // Test avec payload
    thunkBuilder.thunk("provided")(mockDispatch, mockGetState);
    expect(mockDispatch).toHaveBeenLastCalledWith({
      type: "OPTIONAL_ACTION",
      payload: "provided",
    });

    // Test sans payload
    thunkBuilder.thunk(undefined)(mockDispatch, mockGetState);
    expect(mockDispatch).toHaveBeenLastCalledWith({
      type: "OPTIONAL_ACTION",
      payload: "optional", // Utilise getState().data
    });
  });
});
