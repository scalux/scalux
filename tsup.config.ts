import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/helpers.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".cjs" };
  },
});
