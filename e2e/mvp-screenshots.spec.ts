/**
 * Captures full-page PNGs of MVP routes for decks / UX-UI references.
 * Run: `npm run screenshots:mvp` (from repo root; starts dev server via playwright.config).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, type Page } from "@playwright/test";
import { buildE2eUxMemo, E2E_SHARED_MEMO_TOKEN, E2E_UX_MEMO_SESSION_ID } from "@shared/e2eUxMemoFixture";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(repoRoot, "ux-ui", "mvp-screenshots");

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function seedMemoInSession(page: Page) {
  const memo = buildE2eUxMemo();
  await page.addInitScript(
    (json: string) => {
      sessionStorage.setItem("simpero_memo", json);
      sessionStorage.removeItem("simpero_conference");
    },
    JSON.stringify(memo)
  );
}

test.describe("MVP screenshots", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(() => {
    ensureOutDir();
  });

  test("00 — Dashboard (desktop 1440×900)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /Investment pipeline/i }).waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({
      path: path.join(OUT_DIR, "00-dashboard-desktop.png"),
      fullPage: true,
    });
  });

  test("01 — Upload / intake (desktop 1440×900)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /New Deal/i }).waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({
      path: path.join(OUT_DIR, "01-upload-desktop.png"),
      fullPage: true,
    });
  });

  test("02 — Upload / intake (tablet 834×1112)", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /New Deal/i }).waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({
      path: path.join(OUT_DIR, "02-upload-tablet.png"),
      fullPage: true,
    });
  });

  test("03 — History", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/history", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", { name: /Memo History/i })
      .waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({
      path: path.join(OUT_DIR, "03-history.png"),
      fullPage: true,
    });
  });

  test("04 — Verify AI output", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/verify", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /Verify AI Output/i }).waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({
      path: path.join(OUT_DIR, "04-verify.png"),
      fullPage: true,
    });
  });

  test("05 — Memo viewer (E2E fixture)", async ({ page }) => {
    await seedMemoInSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/memo/${E2E_UX_MEMO_SESSION_ID}/ledger`, { waitUntil: "domcontentloaded" });
    await page.getByText("Citation verification — review before reliance").waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.screenshot({
      path: path.join(OUT_DIR, "05-memo-viewer.png"),
      fullPage: true,
    });
  });

  test("06 — Shared memo (E2E fixture)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/shared/${E2E_SHARED_MEMO_TOKEN}`, { waitUntil: "domcontentloaded" });
    await page.getByText("Citation verification — review before reliance").waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.screenshot({
      path: path.join(OUT_DIR, "06-shared-memo.png"),
      fullPage: true,
    });
  });

  test("07 — Methodology (signed out or admin gate)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/methodology", { waitUntil: "domcontentloaded" });
    await page
      .getByText(/Methodology Dashboard|Access denied|Sign in required/)
      .first()
      .waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({
      path: path.join(OUT_DIR, "07-methodology.png"),
      fullPage: true,
    });
  });
});
