import { test, expect } from "@playwright/test";

test.describe("MVP /history", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/history");
  });

  test("chrome present + breadcrumb", async ({ page }) => {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    // Scope to the <header> banner to avoid matching the PageHeader eyebrow inside <main>
    // Topbar now uses a two-line layout: breadcrumb path on line 1, page title on line 2.
    const header = page.getByRole("banner");
    await expect(header.getByText("Memo History")).toBeVisible();
  });

  test("Memo History nav item is active", async ({ page }) => {
    const link = page.getByRole("link", { name: /^Memo History$/ });
    await expect(link).toHaveAttribute("aria-current", "page");
  });

  test("table renders (empty state allowed)", async ({ page }) => {
    // Either the table renders with rows, or the empty state CTA is visible.
    const tableOrEmpty = page.getByRole("table", { name: "IC memos" }).or(page.getByRole("link", { name: /Start a review/ }));
    await expect(tableOrEmpty).toBeVisible();
  });

  test("document title", async ({ page }) => {
    await expect(page).toHaveTitle("Memo History · Simpero");
  });
});
