import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "demo",
  base: "/animalese-web/",
  publicDir: resolve(__dirname, "assets"),
  build: {
    outDir: resolve(__dirname, "dist-demo"),
    emptyOutDir: true,
  },
});
