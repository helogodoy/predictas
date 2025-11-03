// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000", // backend local
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
