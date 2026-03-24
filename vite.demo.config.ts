import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "demo",
  publicDir: resolve(__dirname, "assets"),
  build: {
    outDir: resolve(__dirname, "dist-demo"),
    emptyOutDir: true,
  },
});
