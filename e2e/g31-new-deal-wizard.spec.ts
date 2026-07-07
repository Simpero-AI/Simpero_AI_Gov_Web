import { test, expect } from "@playwright/test";

// @needs-backend-fixtures — depends on backend-seeded fixtures (E2E_SHARED_MEMO_FIXTURE /
// E2E_DATABASE_URL dev bypass) that the FastAPI backend does not provide yet (backend
// playbook BE-5). Set E2E_BACKEND_FIXTURES=1 to re-enable once equivalents exist.
test.skip(
  !process.env.E2E_BACKEND_FIXTURES,
  "@needs-backend-fixtures: backend fixture endpoints not yet available"
);
import { TEXT_SAMPLE_PDF_BYTES } from "./fixtures/textSamplePdf";

test.describe("G-31 New Deal wizard", () => {
  test.beforeEach(async ({ page }) => {
    // Each test starts from a clean wizard — no localStorage hydrate from prior test.
    // Navigate to a benign URL first so window.localStorage is available, then clear.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try { window.localStorage.clear(); } catch { /* ignore */ }
    });
  });

  test("renders Step 1 with required fields", async ({ page }) => {
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();
    await expect(page.getByTestId("wizard-deal-name")).toBeVisible();
    await expect(page.getByTestId("wizard-gp-source")).toBeVisible();
    await expect(page.getByTestId("wizard-continue-step-1")).toBeDisabled();
  });

  test("Continue enables once Name + GP/Source are filled", async ({ page }) => {
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
    await page.getByTestId("wizard-deal-name").fill("E2E Deal");
    await page.getByTestId("wizard-gp-source").fill("E2E Source");
    await expect(page.getByTestId("wizard-continue-step-1")).toBeEnabled();
  });

  test("guards block direct nav past Step 1", async ({ page }) => {
    await page.goto("/upload/materials", { waitUntil: "domcontentloaded" });
    // Guard redirects to /upload (Step 1).
    await expect(page).toHaveURL(/\/upload$/, { timeout: 5_000 });

    await page.goto("/upload/confirm", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/upload($|\/materials$)/, { timeout: 5_000 });
  });

  test("Step 1 fields persist across reload", async ({ page }) => {
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
    await page.getByTestId("wizard-deal-name").fill("Persisted Deal");
    await page.getByTestId("wizard-gp-source").fill("Persisted Source");
    // Wait past the 300ms debounce.
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("wizard-deal-name")).toHaveValue("Persisted Deal");
    await expect(page.getByTestId("wizard-gp-source")).toHaveValue("Persisted Source");
  });

  test("happy path: fill Step 1 → drop PDF → reach Step 3 with Start Analysis enabled", async ({ page }) => {
    await page.goto("/upload", { waitUntil: "domcontentloaded" });

    await page.getByTestId("wizard-deal-name").fill("E2E Happy");
    await page.getByTestId("wizard-gp-source").fill("E2E Source");
    await page.getByTestId("wizard-continue-step-1").click();
    await expect(page).toHaveURL(/\/upload\/materials$/);

    // Drop a PDF.
    const fileInput = page.getByTestId("simpero-document-upload");
    await fileInput.waitFor({ state: "attached" });
    await fileInput.setInputFiles({
      name: "e2e-cim.pdf",
      mimeType: "application/pdf",
      buffer: TEXT_SAMPLE_PDF_BYTES,
    });

    await expect(page.getByTestId("wizard-continue-step-2")).toBeEnabled();
    await page.getByTestId("wizard-continue-step-2").click();
    await expect(page).toHaveURL(/\/upload\/confirm$/);

    await expect(page.getByTestId("wizard-deal-summary")).toContainText("E2E Happy");
    await expect(page.getByTestId("wizard-start-analysis")).toBeEnabled();
  });

  test("soft warning shows when Required materials unticked", async ({ page }) => {
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
    await page.getByTestId("wizard-deal-name").fill("E2E Warn");
    await page.getByTestId("wizard-gp-source").fill("E2E Source");
    await page.getByTestId("wizard-continue-step-1").click();

    // Generic filename — heuristic doesn't tick either required row.
    const fileInput = page.getByTestId("simpero-document-upload");
    await fileInput.waitFor({ state: "attached" });
    await fileInput.setInputFiles({
      name: "random-doc.pdf",
      mimeType: "application/pdf",
      buffer: TEXT_SAMPLE_PDF_BYTES,
    });

    // Soft warning should be visible after the generic file is attached
    // and before the user continues (primary != null && requiredMissing).
    await expect(page.getByTestId("wizard-soft-warning")).toBeVisible();

    await page.getByTestId("wizard-continue-step-2").click();
    // Soft warning may show in the same step or the user is now at confirm step;
    // either way, Continue should not have been blocked.
    await expect(page).toHaveURL(/\/upload\/(materials|confirm)$/);
  });

  test("attach mode: /upload?dealId=<n> pre-fills Step 1 read-only", async ({ page }) => {
    test.skip(!process.env.E2E_DATABASE_URL?.trim(), "requires E2E_DATABASE_URL (real DB)");

    // First, create a deal via the wizard's normal flow so we have a real dealId.
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
    await page.getByTestId("wizard-deal-name").fill("Attach Source");
    await page.getByTestId("wizard-gp-source").fill("Attach GP");
    await page.getByTestId("wizard-continue-step-1").click();

    const fileInput = page.getByTestId("simpero-document-upload");
    await fileInput.waitFor({ state: "attached" });
    await fileInput.setInputFiles({
      name: "attach-cim.pdf",
      mimeType: "application/pdf",
      buffer: TEXT_SAMPLE_PDF_BYTES,
    });
    await page.getByTestId("wizard-continue-step-2").click();

    const submitted = page.waitForRequest(
      (req) => req.method() === "POST" && req.url().includes("/api/simpero/analyse"),
      { timeout: 60_000 }
    );
    await page.getByTestId("wizard-start-analysis").click();
    await submitted;
    await page.waitForURL(/\/analysis\/\d+/, { timeout: 10_000 });
    const dealId = page.url().match(/\/analysis\/(\d+)/)?.[1];
    expect(dealId).toBeTruthy();

    // Now navigate to attach-mode URL.
    await page.goto(`/upload?dealId=${dealId}`, { waitUntil: "domcontentloaded" });

    // Step 1 must show the attach banner and the deal name pre-filled + disabled.
    await expect(page.getByTestId("wizard-attach-banner")).toBeVisible();
    await expect(page.getByTestId("wizard-deal-name")).toHaveValue("Attach Source");
    await expect(page.getByTestId("wizard-deal-name")).toBeDisabled();
  });
});
