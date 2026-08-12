import { test, expect } from "@playwright/test";

test.describe("MVP /new-deal (G-31 wizard)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/new-deal", { waitUntil: "domcontentloaded" });
  });

  test("chrome + breadcrumb + active nav", async ({ page }) => {
    // Topbar now uses a two-line layout: breadcrumb path on line 1, page title on line 2.
    const header = page.getByRole("banner");
    await expect(header.getByText("New Deal")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^New Deal$/ })
    ).toHaveAttribute("aria-current", "page");
  });

  test("document title", async ({ page }) => {
    await expect(page).toHaveTitle("New Deal · Simpero");
  });
});
