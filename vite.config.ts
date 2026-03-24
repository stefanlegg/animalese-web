import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(({ command }) => {
  const shared = {
    test: {
      include: ["tests/**/*.test.ts"],
      root: resolve(__dirname),
    },
  };

  if (command === "serve") {
    // Dev mode: serve the demo page
    return {
      ...shared,
      root: "demo",
      publicDir: resolve(__dirname, "assets"),
      server: {
        port: 3000,
      },
    };
  }

  // Build mode: library output
  return {
    ...shared,
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
