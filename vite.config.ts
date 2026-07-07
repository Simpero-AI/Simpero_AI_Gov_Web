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
      "@": path.resolve(PROJECT_ROOT, "src"),
      "@shared": path.resolve(PROJECT_ROOT, "src", "shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    host: true,
    /** Self-hosted / tunnel-friendly; no Manus-specific host allowlist. */
    allowedHosts: true,
    hmr: { overlay: false },
    /** Local dev against a locally running backend (`uv run uvicorn app.main:app`). */
    proxy: {
      "/api": "http://localhost:8000",
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
