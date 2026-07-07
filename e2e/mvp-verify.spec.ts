import { test, expect } from "@playwright/test";

test.describe("MVP /verify", () => {
  test("chrome renders; no active sidebar item", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.getByText(/Verify AI Output/i).first()).toBeVisible();
    // No nav item should have aria-current="page" because /verify is not in nav
    const active = page.locator('[aria-current="page"]');
    await expect(active).toHaveCount(0);
  });
});
