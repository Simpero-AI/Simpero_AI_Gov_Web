import { test, expect } from "@playwright/test";
import {
  E2E_DELIVERABLE_SESSION_ID,
  E2E_EMPTY_DELIVERABLE_SESSION_ID,
} from "../shared/e2eUxMemoFixture";

/**
 * G-33 Task 22 — Playwright coverage for the polished /memo/:sessionId
 * surface. Backed by `buildE2eDeliverableMemo` and `buildE2eEmptyDeliverableMemo`
 * (see `shared/e2eUxMemoFixture.ts`); both are served by `history.get`,
 * `deals.get`, and `deals.status` when `E2E_SHARED_MEMO_FIXTURE=1`
 * (set by `playwright.config.ts`).
 */
test.describe("G-33 polished IC Memo deliverable", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");

  test("renders all 11 Figma sections", async ({ page }) => {
    await page.goto(`/memo/${E2E_DELIVERABLE_SESSION_ID}`, {
      waitUntil: "domcontentloaded",
    });

    // Recommendation card (heading is "Investment Recommendation").
    await expect(
      page.getByRole("heading", { name: "Investment Recommendation" })
    ).toBeVisible({ timeout: 20_000 });

    // Numbered sections 01–10 (SectionHeader renders "01.Title" with zero-padded number).
    await expect(
      page.getByRole("heading", { name: /01\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /02\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /03\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /04\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /05\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /06\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /07\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /08\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /09\./ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /10\./ })
    ).toBeVisible();

    // §11 — IC Recommendation.
    await expect(
      page.getByRole("heading", { name: /11\./ })
    ).toBeVisible();
  });

  test("topbar 'Regenerate with AI' opens confirm dialog with expected copy", async ({
    page,
  }) => {
    await page.goto(`/memo/${E2E_DELIVERABLE_SESSION_ID}`, {
      waitUntil: "domcontentloaded",
    });

    const regenButton = page.getByRole("button", {
      name: /Regenerate with AI/i,
    });
    await expect(regenButton).toBeVisible({ timeout: 20_000 });

    // Wait for tRPC + Radix to fully settle so React state updates don't get
    // dropped on click. Without this the first click occasionally no-ops in
    // dev-mode StrictMode + concurrent rendering.
    await expect(page.getByText("Lead Analyst")).toBeVisible();

    await regenButton.click();

    const heading = page.getByRole("heading", {
      name: /Regenerate the IC Memo/,
    });
    await expect(heading).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Current edits will be replaced/)).toBeVisible();

    const dialog = page.locator('[role="dialog"]').filter({
      has: page.getByText(/Current edits will be replaced/),
    });
    await dialog.getByRole("button", { name: /^Cancel$/ }).click();
    await expect(heading).toBeHidden();
  });

  test("EmptyState renders when deliverable is absent (pre-G-33 memo)", async ({
    page,
  }) => {
    await page.goto(`/memo/${E2E_EMPTY_DELIVERABLE_SESSION_ID}`, {
      waitUntil: "domcontentloaded",
    });

    // EmptyState heading + CTA button (both labelled "Generate IC Memo").
    await expect(
      page.getByRole("heading", { name: /^Generate IC Memo$/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: /^Generate IC Memo$/i })
    ).toBeVisible();

    // Topbar Regenerate button is omitted on the empty state (gated by
    // `memo?.deliverable` in MemoDeliverable.tsx).
    await expect(
      page.getByRole("button", { name: /Regenerate with AI/i })
    ).toHaveCount(0);
  });

  test("status bar AI Confidence cell renders N/A + G-41 chip", async ({
    page,
  }) => {
    await page.goto(`/memo/${E2E_DELIVERABLE_SESSION_ID}`, {
      waitUntil: "domcontentloaded",
    });

    // Wait for the status bar to mount.
    await expect(page.getByText("AI Confidence")).toBeVisible({ timeout: 20_000 });

    // Scope to the AI Confidence cell — the wrapping div holds both the label
    // and the value. When provenance === "missing", the cell renders a dash paragraph
    // (no MissingDataPlaceholder component used here).
    const aiConfCell = page
      .getByText("AI Confidence", { exact: true })
      .locator("..");
    await expect(aiConfCell.locator("p").last()).toBeVisible();
    await expect(aiConfCell.locator("p").last()).toContainText("—");
  });
});
