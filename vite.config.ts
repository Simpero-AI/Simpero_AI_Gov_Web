import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const PROJECT_ROOT =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

/** When the UI is not at domain root (reverse proxy path, static host subfolder), set e.g. `/myapp/` so `/assets/*` resolves correctly. */
function viteBase(): string {
  const raw = process.env.VITE_BASE_URL?.trim();
  if (!raw || raw === "/") return "/";
  if (raw === "./") return "./";
  const withLeading = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

const plugins = [react(), tailwindcss(), jsxLocPlugin()];

export default defineConfig({
  base: viteBase(),
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(PROJECT_ROOT, "client", "src"),
      "@shared": path.resolve(PROJECT_ROOT, "shared"),
      "@assets": path.resolve(PROJECT_ROOT, "attached_assets"),
    },
  },
  envDir: path.resolve(PROJECT_ROOT),
  root: path.resolve(PROJECT_ROOT, "client"),
  publicDir: path.resolve(PROJECT_ROOT, "client", "public"),
  build: {
    outDir: path.resolve(PROJECT_ROOT, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(PROJECT_ROOT, "client", "index.html"),
        carbonSample: path.resolve(PROJECT_ROOT, "client", "carbon-sample.html"),
        radixSamples: path.resolve(PROJECT_ROOT, "client", "radix-samples.html"),
        radixSamplePremium: path.resolve(PROJECT_ROOT, "client", "radix-sample-premium.html"),
        radixSampleGov: path.resolve(PROJECT_ROOT, "client", "radix-sample-gov.html"),
      },
    },
  },
  server: {
    host: true,
    /** Self-hosted / tunnel-friendly; no Manus-specific host allowlist. */
    allowedHosts: true,
    hmr: { overlay: false },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
