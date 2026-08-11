import { test, expect } from "@playwright/test";
import { TEXT_SAMPLE_PDF_BYTES } from "./fixtures/textSamplePdf";

// @needs-backend-fixtures — depends on backend-seeded fixtures (E2E_SHARED_MEMO_FIXTURE /
// E2E_DATABASE_URL dev bypass) that the FastAPI backend does not provide yet (backend
// playbook BE-5). Set E2E_BACKEND_FIXTURES=1 to re-enable once equivalents exist.
test.skip(
  !process.env.E2E_BACKEND_FIXTURES,
  "@needs-backend-fixtures: backend fixture endpoints not yet available"
);
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
    await page.goto("/new-deal", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();
    await expect(page.getByTestId("wizard-deal-name")).toBeVisible();
    await expect(page.getByTestId("wizard-gp-source")).toBeVisible();
    await expect(page.getByTestId("wizard-continue-step-1")).toBeDisabled();
  });

  test("Continue enables once Name + GP/Source are filled", async ({ page }) => {
    await page.goto("/new-deal", { waitUntil: "domcontentloaded" });
    await page.getByTestId("wizard-deal-name").fill("E2E Deal");
    await page.getByTestId("wizard-gp-source").fill("E2E Source");
    await expect(page.getByTestId("wizard-continue-step-1")).toBeEnabled();
  });

  test("guards block direct nav past Step 1", async ({ page }) => {
    await page.goto("/new-deal/upload-files", { waitUntil: "domcontentloaded" });
    // Guard redirects to /new-deal (Step 1).
    await expect(page).toHaveURL(/\/new-deal$/, { timeout: 5_000 });

    await page.goto("/new-deal/confirm", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/new-deal($|\/upload-files$)/, { timeout: 5_000 });
  });

  test("Step 1 fields persist across reload", async ({ page }) => {
    await page.goto("/new-deal", { waitUntil: "domcontentloaded" });
    await page.getByTestId("wizard-deal-name").fill("Persisted Deal");
    await page.getByTestId("wizard-gp-source").fill("Persisted Source");
    // Wait past the 300ms debounce.
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("wizard-deal-name")).toHaveValue("Persisted Deal");
    await expect(page.getByTestId("wizard-gp-source")).toHaveValue("Persisted Source");
  });

  test("attach mode: /new-deal?dealId=<n> pre-fills Step 1 read-only", async ({ page, request }) => {
    test.skip(!process.env.E2E_DATABASE_URL?.trim(), "requires E2E_DATABASE_URL (real DB)");

    // Create a deal directly via the REST API — decoupled from the (currently
    // unreachable) wizard submit chain, and a better test regardless.
    const created = await request.post("/api/deals", {
      data: {
        name: "Attach Source",
        gpSource: "Attach GP",
        dealSizeMinUsd: null,
        dealSizeMaxUsd: null,
        sectorTags: [],
      },
    });
    expect(created.ok()).toBeTruthy();
    const { id: dealId } = (await created.json()) as { id: string };
    expect(dealId).toBeTruthy();

    // Now navigate to attach-mode URL.
    await page.goto(`/new-deal?dealId=${dealId}`, { waitUntil: "domcontentloaded" });

    // Step 1 must show the attach banner and the deal name pre-filled + disabled.
    await expect(page.getByTestId("wizard-attach-banner")).toBeVisible();
    await expect(page.getByTestId("wizard-deal-name")).toHaveValue("Attach Source");
    await expect(page.getByTestId("wizard-deal-name")).toBeDisabled();
  });

  test("happy path: create deal, upload a document, reach Confirm, and fire the analysis request", async ({ page }) => {
    test.skip(!process.env.E2E_DATABASE_URL?.trim(), "requires E2E_DATABASE_URL (real DB)");

    await page.goto("/new-deal", { waitUntil: "domcontentloaded" });

    // Step 1 — real deal creation via POST /api/deals.
    await page.getByTestId("wizard-deal-name").fill("Happy Path Deal");
    await page.getByTestId("wizard-gp-source").fill("Happy Path Source");
    await page.getByTestId("wizard-continue-step-1").click();
    await expect(page).toHaveURL(/\/new-deal\/upload-files$/);

    // Step 2 — real presigned-URL upload (POST /presigned-url → PUT to storage → POST /complete).
    const fileInput = page.getByTestId("deal-document-upload-input");
    await fileInput.waitFor({ state: "attached" });
    await fileInput.setInputFiles({
      name: "e2e-sample-text.pdf",
      mimeType: "application/pdf",
      buffer: TEXT_SAMPLE_PDF_BYTES,
    });
    await expect(page.getByTestId("deal-document-upload-status")).toBeVisible({ timeout: 30_000 });

    // Reaching /confirm is itself coverage of this session's bug fix — Step 3 used to be
    // permanently unreachable because `hasUploadedDocument` was never wired to this callback.
    await page.getByTestId("wizard-continue-step-2").click();
    await expect(page).toHaveURL(/\/new-deal\/confirm$/);

    await expect(page.getByTestId("wizard-start-analysis")).toBeVisible();
    await expect(page.getByTestId("wizard-start-analysis")).toBeEnabled();

    // The backend endpoint (POST /api/deals/{dealId}/analysis) doesn't exist yet — it will
    // 404 and the wizard shows an error toast and stays on Confirm (see NewDealWizard.tsx's
    // handleSubmit catch block). Assert only that the request fires correctly, not on its
    // response or on navigation, so this test keeps passing once the backend lands.
    const requestPromise = page.waitForRequest(
      (req) => req.method() === "POST" && req.url().includes("/analysis")
    );
    await page.getByTestId("wizard-start-analysis").click();
    const analysisRequest = await requestPromise;

    expect(analysisRequest.url()).toMatch(/\/api\/deals\/.+\/analysis$/);
    const body = analysisRequest.postDataJSON() as { selectedFrameworks: unknown };
    expect(Array.isArray(body.selectedFrameworks)).toBe(true);
  });
});
