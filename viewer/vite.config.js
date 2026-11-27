import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "web-ifc": fileURLToPath(new URL("./node_modules/web-ifc/web-ifc-api.js", import.meta.url))
    }
  },
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
    outDir: "dist",
    emptyOutDir: true
  }
});
