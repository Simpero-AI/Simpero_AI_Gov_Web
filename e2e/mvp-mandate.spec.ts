import { test, expect } from "@playwright/test";

test.describe("Mandate & Scorecard", () => {
  test("bare path redirects to /firm", async ({ page }) => {
    await page.goto("/mandate-scorecard");
    await expect(page).toHaveURL(/\/mandate-scorecard\/firm$/);
  });

  test("/setup/investment-profile redirects to /mandate-scorecard/firm", async ({ page }) => {
    await page.goto("/setup/investment-profile");
    await expect(page).toHaveURL(/\/mandate-scorecard\/firm$/);
  });

  // Three tabs: Firm Profile, Mandate, Framework (Scorecard tab was removed)
  test("renders all three tab links", async ({ page }) => {
    await page.goto("/mandate-scorecard/firm");
    for (const label of ["Firm Profile", "Mandate", "Framework"]) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }
  });

  test("Firm tab is active by default and shows the Carbon wizard", async ({ page }) => {
    await page.goto("/mandate-scorecard/firm");
    await expect(page.getByRole("tab", { name: "Firm Profile" })).toHaveAttribute("aria-selected", "true");
    // The Carbon wizard contains an InlineNotification / ProgressIndicator. Assert progress-step text.
    await expect(page.getByText(/Firm/i).first()).toBeVisible();
  });

  test("Mandate tab renders editable mandate fields", async ({ page }) => {
    await page.goto("/mandate-scorecard/mandate");
    // EditableMandateBlock is now rendered (not a coming-soon placeholder)
    await expect(page.getByRole("tab", { name: "Mandate" })).toHaveAttribute("aria-selected", "true");
  });

  test("Framework tab renders editable scoring framework", async ({ page }) => {
    await page.goto("/mandate-scorecard/framework");
    // EditableFrameworkBlock is now rendered (not a coming-soon placeholder)
    await expect(page.getByRole("tab", { name: "Framework" })).toHaveAttribute("aria-selected", "true");
  });

  test("Invalid section redirects to firm", async ({ page }) => {
    await page.goto("/mandate-scorecard/junk");
    await expect(page).toHaveURL(/\/mandate-scorecard\/firm$/);
  });

  test("document title", async ({ page }) => {
    await page.goto("/mandate-scorecard/firm");
    await expect(page).toHaveTitle("Mandate & Scorecard · Simpero");
  });
});
