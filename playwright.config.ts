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
 * Async jobs: strip DB after dotenv (see `scripts/run-dev.mjs`) unless `E2E_DATABASE_URL` is set,
 * so `analysis_jobs` / local Postgres are not required for E2E.
 *
 * Optional: set `E2E_DATABASE_URL` when running Playwright so the dev auth bypass can create a DB user
 * — required for the `@ux` attestation gate test in `e2e/memo-viewer-ux.spec.ts` (otherwise skipped).
 */
const e2eUseDatabase = Boolean(process.env.E2E_DATABASE_URL?.trim());

/**
 * SKIP_AUTH_DEV + empty TEST_APP_PASSWORD: hit /api/simpero without login in CI.
 * Matches layered .env from run-dev; PORT avoids clashing with a dev server on 3000.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: "list",
  timeout: 30_000,
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
    command: `SKIP_AUTH_DEV=true PORT=${port} TEST_APP_PASSWORD= node scripts/run-dev.mjs`,
    url: `${baseURL}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      /** Enables `share.get` fixture token for Shared Memo UX tests (see `shared/e2eUxMemoFixture.ts`). */
      E2E_SHARED_MEMO_FIXTURE: "1",
      ...(e2eUseDatabase
        ? { DATABASE_URL: process.env.E2E_DATABASE_URL! }
        : { SIMPERO_E2E_MEMORY_ONLY: "1" }),
    },
  },
});
