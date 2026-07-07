import { test, expect } from "@playwright/test";
import { TEXT_SAMPLE_PDF_BYTES } from "./fixtures/textSamplePdf";

test.describe("Async analyse API", () => {
  test("multipart async enqueue returns 202 and poll URL works", async ({ request }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL?.trim(),
      "G-31 Commit 4: dealId is now required on /analyse — direct-API test needs a real dealId from the DB (set E2E_DATABASE_URL)."
    );
    const res = await request.post("/api/simpero/analyse?async=1", {
      multipart: {
        document: {
          name: "e2e-sample-text.pdf",
          mimeType: "application/pdf",
          buffer: TEXT_SAMPLE_PDF_BYTES,
        },
        selectedFrameworks: JSON.stringify([
          "finra_3110",
          "sec_206_4_7",
          "osfi_e23",
          "eu_ai_act",
        ]),
      },
    });

    expect(res.status(), await res.text()).toBe(202);
    const body = (await res.json()) as { jobId?: string; pollUrl?: string; sessionId?: string };
    expect(body.jobId).toBeTruthy();
    expect(body.pollUrl).toMatch(/\/api\/simpero\/analyse-job\//);
    expect(body.sessionId).toBeTruthy();

    const poll = await request.get(body.pollUrl!);
    expect(poll.ok(), await poll.text()).toBeTruthy();
    const status = (await poll.json()) as { status: string };
    expect(["queued", "processing", "complete", "error"]).toContain(status.status);
  });
});

test.describe("Upload (browser)", () => {
  test("choosing a PDF in Step 2 triggers POST /api/simpero/analyse", async ({ page }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL?.trim(),
      "Wizard creates a deal via tRPC before posting to /analyse — requires DB (set E2E_DATABASE_URL)."
    );
    await page.goto("/upload", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /New Deal/i })).toBeVisible({
      timeout: 30_000,
    });

    // Fill Step 1 minimum.
    await page.getByTestId("wizard-deal-name").fill("E2E Trigger");
    await page.getByTestId("wizard-gp-source").fill("E2E Source");
    await page.getByTestId("wizard-continue-step-1").click();
    await expect(page).toHaveURL(/\/upload\/materials$/);

    const fileInput = page.getByTestId("simpero-document-upload");
    await fileInput.waitFor({ state: "attached" });
    await fileInput.setInputFiles({
      name: "e2e-sample-text.pdf",
      mimeType: "application/pdf",
      buffer: TEXT_SAMPLE_PDF_BYTES,
    });

    // Dropping the file does NOT submit — wizard submits in Step 3.
    // Continue, then click Start Analysis.
    await page.getByTestId("wizard-continue-step-2").click();
    await expect(page).toHaveURL(/\/upload\/confirm$/);

    const posted = page.waitForRequest(
      (req) => req.method() === "POST" && req.url().includes("/api/simpero/analyse"),
      { timeout: 60_000 }
    );
    await page.getByTestId("wizard-start-analysis").click();
    const req = await posted;
    expect(req.url()).toContain("async=1");
  });
});
