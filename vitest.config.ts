import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  plugins: [react()],
  css: { postcss: {} },
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    // Server/shared tests stay in node; client tests use jsdom. Picked per
    // glob so we don't accidentally give server code DOM globals it never
    // had before.
    environment: "node",
    environmentMatchGlobs: [
      ["client/src/**/*.test.{ts,tsx}", "jsdom"],
    ],
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "shared/**/*.test.ts",
      "client/src/**/*.test.{ts,tsx}",
    ],
    setupFiles: [path.join(templateRoot, "vitest.setup.ts")],
  },
});
