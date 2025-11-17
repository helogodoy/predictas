import { defineConfig } from "vite";

export default defineConfig({
  base: "./",          // <<< ESSENCIAL pra rodar em qualquer servidor
  build: {
    outDir: "dist",    // garante que o build vá para a pasta dist
  },
});