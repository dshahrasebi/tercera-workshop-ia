import { defineConfig } from "vite";

// base './' so the static build works when served from any path (Railway).
export default defineConfig({
  base: "./",
  build: { outDir: "dist", assetsInlineLimit: 0 },
});
