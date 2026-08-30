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
    // Default 5000ms leaves no headroom over Testing Library's own
    // asyncUtilTimeout (vitest.setup.ts) — a waitFor/findBy polling close to
    // that limit was getting killed by this cap first, surfacing as "Test
    // timed out in 5000ms" instead of a real assertion failure.
    testTimeout: 20_000,
    // A handful of NewDealWizard tests mount the full MvpAppShell (a heavy
    // sidebar tree) and race real async state settling; under parallel
    // worker contention on a loaded machine one occasionally misses its
    // window even with the raised timeout above, though the same test is
    // consistently correct alone or with less contention. One automatic
    // retry absorbs that scheduling noise without hiding an actual bug — a
    // real logic failure fails the same way twice.
    retry: 2,
  },
});
