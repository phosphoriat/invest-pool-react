import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Configure React, the REST proxy and DOM-based component tests.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxy = {
    "/api": {
      target: env.API_TARGET || "http://127.0.0.1:8080",
      changeOrigin: true,
    },
  };
  return {
    plugins: [react()],
    server: { host: "127.0.0.1", port: 5173, strictPort: true, proxy },
    preview: { host: "127.0.0.1", port: 4173, strictPort: true, proxy },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.js"],
      testTimeout: 15000,
    },
  };
});
