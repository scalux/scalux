import { configureStore } from "../../../../src"; // Utilise la fonction de Redux Toolkit
import { reducer } from "./state"; // Importe le reducer racine généré par scalux

export const store = configureStore({
  reducer, // Le reducer combiné gérant toutes nos slices et logiques
  // Les middlewares par défaut de Redux Toolkit (thunk, immutability check, etc.)
  // sont inclus automatiquement.
  // L'extension Redux DevTools est également prise en charge.
});

// Types optionnels pour l'inférence dans l'application
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
