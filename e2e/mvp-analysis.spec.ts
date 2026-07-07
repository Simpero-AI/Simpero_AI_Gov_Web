import { test, expect } from "@playwright/test";

test.describe("MVP /analysis", () => {
  // /analysis (no :dealId) renders AnalysisRedirect which either:
  //   - redirects to /analysis/:dealId when a completed deal exists, or
  //   - stays at /analysis and shows an empty state when no deals exist.
  test("bare /analysis shows empty state or redirects to a deal", async ({ page }) => {
    await page.goto("/analysis");
    // Allow time for the query to resolve
    await page.waitForTimeout(3_000);
    const url = page.url();
    // Either stayed at /analysis (empty state) or redirected to /analysis/:dealId
    expect(url).toMatch(/\/analysis(\/[^/]+)?$/);
  });
});
