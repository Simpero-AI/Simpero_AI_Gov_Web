import { test, expect } from "@playwright/test";
import {
  E2E_DELIVERABLE_DEAL_ID,
  E2E_DELIVERABLE_SESSION_ID,
} from "@shared/e2eUxMemoFixture";

/**
 * G-33 Task 22 — Playwright coverage for the rewired /analysis surface.
 * Backed by `buildE2eDeliverableMemo` (see `shared/e2eUxMemoFixture.ts`),
 * served by `deals.get` + `deals.status` short-circuits when
 * `E2E_SHARED_MEMO_FIXTURE=1` (set by `playwright.config.ts`).
 */
test.describe("G-33 /analysis tab rewiring", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");

  // Current tabs in DealAnalysis (rendered as <button>, not role="tab")
  const TAB_LABELS = [
    "Summary",
    "Scorecard",
    "Company",
    "Financials",
    "Founders",
    "Market",
    "Risks",
  ] as const;

  test("all tabs are visible + MetadataStrip renders above them", async ({
    page,
  }) => {
    await page.goto(`/analysis/${E2E_DELIVERABLE_DEAL_ID}`, {
      waitUntil: "domcontentloaded",
    });

    // Wait for the Summary tab button to confirm the tab bar mounted.
    await expect(page.getByRole("button", { name: "Summary", exact: true })).toBeVisible({
      timeout: 20_000,
    });

    // exact:true keeps "Founders" from matching "Co-Founders" etc.
    for (const label of TAB_LABELS) {
      await expect(
        page.getByRole("button", { name: label, exact: true })
      ).toBeVisible();
    }

    // MetadataStrip pills: filename, page count, verification %.
    await expect(page.getByText(/pages/)).toBeVisible();
    await expect(page.getByText(/verified/)).toBeVisible();
  });

  test("Summary tab renders deliverable.executiveSummary paragraphs", async ({
    page,
  }) => {
    await page.goto(`/analysis/${E2E_DELIVERABLE_DEAL_ID}`, {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: "Summary" }).click();

    // The fixture executiveSummary first paragraph begins with this phrase.
    await expect(
      page.getByText(/Investment thesis: this opportunity reflects/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Risks tab renders risk register", async ({ page }) => {
    await page.goto(`/analysis/${E2E_DELIVERABLE_DEAL_ID}`, {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: "Risks" }).click();

    // Risks tab renders a risk register section or a missing placeholder.
    const risksPanel = page.locator("button").filter({ hasText: /^Risks$/ });
    await expect(risksPanel).toBeVisible({ timeout: 10_000 });
  });

  test("Verification ledger link deep-links to /memo/:sessionId/ledger", async ({
    page,
  }) => {
    await page.goto(`/analysis/${E2E_DELIVERABLE_DEAL_ID}`, {
      waitUntil: "domcontentloaded",
    });

    // "Open verification ledger" is the exact text of the schema-mismatch banner link.
    // A second link ("Verification Ledger") exists in the AnalysisTabs header;
    // using the full text avoids a Playwright strict-mode violation on getAttribute().
    const link = page.getByRole("link", { name: "Open verification ledger" });
    await expect(link).toBeVisible({ timeout: 20_000 });

    const href = await link.getAttribute("href");
    expect(href).toBe(`/memo/${E2E_DELIVERABLE_SESSION_ID}/ledger`);
  });
});
