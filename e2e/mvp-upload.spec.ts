import { test, expect } from "@playwright/test";

test.describe("MVP /upload (G-31 wizard)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
  });

  test("chrome + breadcrumb + active nav", async ({ page }) => {
    // Topbar now uses a two-line layout: breadcrumb path on line 1, page title on line 2.
    const header = page.getByRole("banner");
    await expect(header.getByText("New Deal")).toBeVisible();
    await expect(page.getByRole("link", { name: /^New Deal$/ })).toHaveAttribute("aria-current", "page");
  });

  test("Step 1 framework checkbox group is interactive", async ({ page }) => {
    // Frameworks moved into Step 1 of the wizard (G-31). The four framework
    // buttons live inside the framework-selector card; the FINRA 3110 toggle
    // is a button (not <input type=checkbox>) — same as the legacy /upload.
    const finra = page.getByRole("button", { name: /FINRA 3110/ });
    await expect(finra).toBeVisible();
    await expect(finra).toHaveAttribute("aria-pressed", "true");
    await finra.click();
    await expect(finra).toHaveAttribute("aria-pressed", "false");
    await finra.click();
    await expect(finra).toHaveAttribute("aria-pressed", "true");
  });

  test("document title", async ({ page }) => {
    await expect(page).toHaveTitle("New Deal · Simpero");
  });
});
