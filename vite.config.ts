import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(({ command }) => {
  if (command === "serve") {
    // Dev mode: serve the demo page
    return {
      root: "demo",
      publicDir: resolve(__dirname, "assets"),
      server: {
        port: 3000,
      },
    };
  }

  // Build mode: library output
  return {
    plugins: [dts({ include: ["src"] })],
    build: {
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        name: "AnimaleseWeb",
        fileName: "animalese-web",
        formats: ["es", "cjs"],
      },
    },
  };
});
