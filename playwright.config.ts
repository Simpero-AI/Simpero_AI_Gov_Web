import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

const root = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(root, ".env"), quiet: true });
loadEnv({ path: path.join(root, ".env.local"), override: true, quiet: true });

const port = process.env.E2E_PORT ?? "4173";
const baseURL = `http://127.0.0.1:${port}`;

/**
 * The suite runs against a static production build (`vite preview`) — the old
 * monorepo Express dev server is gone. The backend comes from either:
 *   (a) a locally running FastAPI (default: http://localhost:8000, reached via
 *       the preview proxy in vite.config.ts), or
 *   (b) a remote staging App — set VITE_API_BASE_URL before running so the
 *       build points at it directly.
 *
 * Auth: real Clerk. CI uses Clerk testing tokens — set CLERK_PUBLISHABLE_KEY +
 * CLERK_SECRET_KEY (test instance only) and e2e/global.setup.ts activates them.
 * This replaces the old SKIP_AUTH_DEV server bypass.
 *
 * Specs tagged @needs-backend-fixtures self-skip until the FastAPI fixture
 * endpoints exist (set E2E_BACKEND_FIXTURES=1 to re-enable).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: "list",
  timeout: 30_000,
  globalSetup: "./e2e/global.setup.ts",
  // `{platform}` + `{projectName}` are required to keep Linux/macOS
  // baselines from overwriting each other. Without them, Playwright
  // emits a single `{arg}{ext}` file and CI silently fights local.
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
      threshold: 0.2,
    },
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm exec vite preview --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
    },
  },
});
