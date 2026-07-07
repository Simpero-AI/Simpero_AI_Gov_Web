import { test, expect } from "@playwright/test";
import {
  buildE2eUxMemo,
  E2E_UX_MEMO_SESSION_ID,
} from "@shared/e2eUxMemoFixture";

/**
 * Chrome (breadcrumb, subtitle, action cluster) assertions for the MemoViewer MVP shell.
 * Uses the same sessionStorage hydration approach as memo-viewer-ux.spec.ts so the
 * memo loads and MvpAppShell chrome renders (the loading/error early returns do NOT
 * include MvpAppShell, so a real fixture is required).
 */

function seedMemoSession(page: import("@playwright/test").Page) {
  const memo = buildE2eUxMemo();
  return page.addInitScript(
    ([json]) => {
      sessionStorage.setItem("simpero_memo", json);
      sessionStorage.removeItem("simpero_conference");
    },
    [JSON.stringify(memo)]
  );
}

test.describe("MVP MemoViewer chrome", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");

  test.beforeEach(async ({ page }) => {
    await seedMemoSession(page);
  });

  test("breadcrumb + subtitle + no Back button", async ({ page }) => {
    await page.goto(`/memo/${E2E_UX_MEMO_SESSION_ID}/ledger`);
    // Topbar now uses a two-line layout: page title on line 2 — scope to banner to avoid
    // strict-mode failure when the sidebar nav also contains "Memo History".
    await expect(page.getByRole("banner").getByText("Memo History")).toBeVisible({ timeout: 15_000 });
    // Subtitle renders the filename in a font-mono span inside the topbar header
    await expect(
      page.locator("header span.font-mono").first()
    ).toBeVisible();
    // No standalone Back button (it was deleted with the old sticky header)
    await expect(page.getByRole("button", { name: /^Back$/ })).toHaveCount(0);
    // The old sticky header (z-40) should not be present; MvpAppShell uses z-30
    await expect(page.locator("header.sticky.top-0.z-40")).toHaveCount(0);
  });

  test("topbar actions cluster present", async ({ page }) => {
    await page.goto(`/memo/${E2E_UX_MEMO_SESSION_ID}/ledger`);
    await expect(
      page.getByRole("button", { name: /Copy/ })
    ).toBeVisible({ timeout: 15_000 });
  });
});
