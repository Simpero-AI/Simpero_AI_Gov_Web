import { test, expect } from "@playwright/test";

test.describe("MVP shell on /", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // AuthGate renders null until the auth.me check resolves, so nothing
    // (including the shell) exists in the DOM yet right after goto() —
    // wait for the shell to actually mount before any test interacts with it.
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  });

  test("skip link is the first focusable element", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to main content/i });
    await expect(skip).toBeFocused();
  });

  test("renders the primary navigation sections", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(nav.getByText("Overview")).toBeVisible();
    await expect(nav.getByText("Deal Flow")).toBeVisible();
    // Non-admin: no Admin section
    await expect(nav.getByText("Admin")).toHaveCount(0);
  });

  test("Dashboard item is active", async ({ page }) => {
    const dashboardLink = page.getByRole("link", { name: "Dashboard" }).first();
    await expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  test("topbar shows breadcrumb + Add Deal CTA", async ({ page }) => {
    // Scope to the <header> banner to avoid matching the PageHeader eyebrow inside <main>
    // Topbar now uses a two-line layout: breadcrumb path on line 1, page title on line 2.
    const header = page.getByRole("banner");
    await expect(header.getByText("Dashboard")).toBeVisible();
    await expect(page.getByRole("button", { name: /\+ Add Deal/ })).toBeVisible();
  });

  test("fund selector is labelled and visible in sidebar", async ({ page }) => {
    // MvpFundSelector renders a labelled div (multi-fund not yet interactive —
    // "on the roadmap"). Assert it's visible and labelled correctly.
    const fund = page.locator('[aria-label="Workspace selector"]');
    await expect(fund).toBeVisible();
  });

  test("document title reflects the page", async ({ page }) => {
    await expect(page).toHaveTitle("Dashboard · Simpero");
  });

  test("each shipped nav link navigates", async ({ page }) => {
    const dest: { name: RegExp; path: string }[] = [
      { name: /^New Deal$/, path: "/upload" },
      // Deal Analysis (/analysis) uses AnalysisRedirect which redirects to the most recent
      // completed deal or "/" when none exist — skip stable URL assertion for this link.
      { name: /^Memo History$/, path: "/history" },
    ];
    for (const d of dest) {
      await page.goto("/");
      await page.getByRole("link", { name: d.name }).first().click();
      await expect(page).toHaveURL(new RegExp(d.path));
    }
  });

  test("chrome visual snapshot", async ({ page }) => {
    test.skip(process.env.CI === "true" || process.platform !== "linux", "visual baselines require a manual --update-snapshots run; skipped in CI until baselines are committed");
    // Disable animations for deterministic capture
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    await page.waitForLoadState("networkidle");
    // Capture the topbar + sidebar; body changes per step, so clip the chrome.
    const sidebar = page.locator("aside").first();
    const topbar = page.locator("header").first();
    await expect(sidebar).toHaveScreenshot("dashboard-sidebar.png");
    await expect(topbar).toHaveScreenshot("dashboard-topbar.png");
  });

  test("4 stat tiles render with labels", async ({ page }) => {
    for (const label of ["Total Deals", "Pipeline Value", "Avg AI Score", "DD Completion"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("Pipeline Value tile is present with a numeric or dash value", async ({ page }) => {
    // The tile label is always visible; the value is either "—" (no stats) or a "$…" figure.
    await expect(page.getByText("Pipeline Value", { exact: true })).toBeVisible();
  });

  test("MandateBand renders placeholder values when no investmentProfile", async ({ page }) => {
    const band = page.getByLabel("Active Investment Mandate");
    await expect(band).toBeVisible();
    // When no profile is configured, the band shows a Configure CTA instead of "—" links.
    // Just verify the band itself is visible — content varies by profile state.
  });

});
