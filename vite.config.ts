// vite.config.ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom", // Important pour l'autre erreur
    setupFiles: "./tests/setupTests.ts", // Vérifie ce chemin
    // ...
  },
});
