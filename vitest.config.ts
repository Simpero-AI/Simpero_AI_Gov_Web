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
      "@": path.resolve(templateRoot, "src"),
      "@shared": path.resolve(templateRoot, "src", "shared"),
    },
  },
  test: {
    // Shared tests stay in node; the rest of src (components, pages, lib)
    // uses jsdom. Picked per glob so pure-logic shared modules keep the
    // node environment they had in the monorepo.
    environment: "node",
    environmentMatchGlobs: [
      // First match wins: shared stays node, everything else in src is jsdom.
      ["src/shared/**/*.test.ts", "node"],
      ["src/**/*.test.{ts,tsx}", "jsdom"],
    ],
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: [path.join(templateRoot, "vitest.setup.ts")],
  },
});
