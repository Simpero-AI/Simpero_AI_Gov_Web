import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { TEXT_SAMPLE_PDF_BYTES } from "./fixtures/textSamplePdf";

/**
 * X-02 — the full external-party intake journey, end to end, in one pass:
 *
 *   org user checks "collect externally" and generates a link
 *     -> external party opens it in a context with zero Clerk session state
 *     -> completes email, questions, upload, submit
 *     -> org user's dashboard row now routes to Step 3, showing the real
 *        answers and the real document
 *     -> Start Analysis proceeds unchanged.
 *
 * Deliberately one test rather than several. Every step consumes state the
 * previous one produced -- above all the raw intake token, which the wizard
 * surfaces exactly once and then drops (ShareLinkStep's `takeToken()` reads a
 * ref and clears it). Split across tests, later steps would have to re-mint a
 * link and would no longer be testing the path a real recipient walks.
 *
 * The AC's "zero Clerk session state" is enforced structurally, not asserted
 * after the fact. The isolation comes from `browser.newContext()` itself --
 * a fresh context starts with its own empty cookie jar and storage and never
 * inherits another context's, nor `use.storageState`. (This repo sets no
 * storageState anywhere; the explicit `undefined` below is documentation of
 * intent, not the thing doing the work -- worth knowing before someone
 * "fixes" it.) A positive check that the page carries no Clerk artefacts runs
 * inside it as well: the point of P4-02/P4-03 is that this surface never
 * touches the product's auth, and a regression there would otherwise show up
 * only as a redirect nobody notices.
 */

// @needs-backend-fixtures -- this walks a real deal through a real intake link
// and needs the FastAPI backend plus a Clerk-authenticated org session, the
// same bar as the other backend-dependent specs. Set E2E_BACKEND_FIXTURES=1
// once a seeded backend is reachable.
test.skip(
  !process.env.E2E_BACKEND_FIXTURES,
  "@needs-backend-fixtures: requires a running backend and an authenticated org session"
);
// Second gate, same as g31's data-mutating tests: this one creates a deal, an
// intake link, a document and an analysis run, so it needs a real database and
// not merely a reachable API.
test.skip(
  !process.env.E2E_DATABASE_URL?.trim(),
  "requires E2E_DATABASE_URL (real DB)"
);

const RECIPIENT_EMAIL = "external-party@example.com";
/**
 * Unique per run. This spec creates a deal, a link, a document and an analysis
 * on a shared backend and cleans none of it up, so a constant name would let a
 * second run's row lookup match the FIRST run's deal -- a different id, and a
 * green assertion about the wrong row.
 */
const DEAL_NAME = `X-02 External Intake Deal ${Date.now()}`;
const UPLOAD_FILENAME = "x02-external-document.pdf";

/**
 * The recipient's browser: a brand-new context, which is what makes "signed
 * out" true by construction rather than by cleanup -- the AC's actual
 * requirement. `storageState: undefined` is stated explicitly to document that
 * no session is being loaded on purpose; `newContext()` would isolate anyway.
 */
async function openCleanRecipientContext(
  browser: Browser
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  return { context, page };
}

test.describe("X-02 full external-party flow", () => {
  test("org generates a link, external party submits, org reads it back and starts analysis", async ({
    page,
    browser,
  }) => {
    test.slow(); // a full round trip through two contexts and a real upload

    // ---- Org user: Step 1, opting into external collection -------------------
    await page.goto("/new-deal", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();

    await page.getByTestId("wizard-deal-name").fill(DEAL_NAME);
    await page.getByTestId("wizard-gp-source").fill("X-02 Source");
    await page.getByTestId("wizard-collect-externally").check();
    await page.getByTestId("wizard-recipient-email").fill(RECIPIENT_EMAIL);

    await expect(page.getByTestId("wizard-continue-step-1")).toBeEnabled();
    await page.getByTestId("wizard-continue-step-1").click();

    // ---- Share-link step: capture the token while it is still on screen ------
    // This is the only moment the raw token exists in the UI; the wizard clears
    // it after this render and never shows it again, by design (P5-02).
    await expect(page.getByTestId("wizard-step-share-link")).toBeVisible({
      timeout: 30_000,
    });
    const linkUrl = (
      await page.getByTestId("wizard-intake-link-url").innerText()
    ).trim();
    expect(linkUrl, "share-link step must render a usable intake URL").toMatch(
      /\/intake\/[A-Za-z0-9_-]+$/
    );

    const dealId = new URL(page.url()).searchParams.get("dealId");
    // Asserted, not defaulted. A `?? "\d+"` fallback further down would make
    // the href check match ANY deal the moment this came back null -- a green
    // assertion that had stopped checking anything.
    expect(dealId, "share-link step URL must carry dealId").toBeTruthy();

    await page.getByTestId("wizard-continue-share-link").click();

    // ---- Step 2 shows the waiting panel, not the dropzone -------------------
    await expect(page.getByTestId("wizard-step2-waiting-panel")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("wizard-intake-recipient")).toContainText(
      RECIPIENT_EMAIL
    );

    // ---- External party: clean context, zero Clerk state --------------------
    const { context: recipientContext, page: recipientPage } =
      await openCleanRecipientContext(browser);

    try {
      await recipientPage.goto(linkUrl, { waitUntil: "domcontentloaded" });

      // The AC's core claim: signed out, this renders the intake flow rather
      // than bouncing to a sign-in. Asserted before anything else, because a
      // redirect here would make every later step fail for the wrong reason.
      await expect(recipientPage.getByTestId("intake-email-step")).toBeVisible({
        timeout: 20_000,
      });
      await expect(recipientPage).toHaveURL(/\/intake\//);

      // ...and that it got there without any product auth in play. P4-03's
      // bundle-isolation test pins the import graph; this pins the runtime.
      const clerkArtefacts = await recipientPage.evaluate(() => {
        const keys = [
          ...Object.keys(window.localStorage),
          ...Object.keys(window.sessionStorage),
        ];
        return {
          storage: keys.filter(k => /clerk/i.test(k)),
          globalClerk: "Clerk" in window,
        };
      });
      expect(
        clerkArtefacts.storage,
        "no Clerk storage on the public surface"
      ).toEqual([]);
      expect(clerkArtefacts.globalClerk, "Clerk must not load here").toBe(
        false
      );

      // Read cookies through the context, not `document.cookie`: the latter
      // never exposes HttpOnly cookies, and Clerk's `__session` is HttpOnly --
      // so a document.cookie filter for it returns [] whether or not a session
      // exists, and cannot fail on the one artefact it is written to catch.
      const cookieNames = (await recipientContext.cookies()).map(c => c.name);
      expect(
        cookieNames.filter(name => /clerk|__session/i.test(name)),
        "no Clerk cookies on the public surface"
      ).toEqual([]);

      // ---- Email verification ------------------------------------------------
      await recipientPage
        .getByTestId("intake-email-input")
        .fill(RECIPIENT_EMAIL);
      await recipientPage
        .getByTestId("intake-email-step")
        .getByRole("button", { name: "Continue" })
        .click();

      // ---- Questions --------------------------------------------------------
      await expect(
        recipientPage.getByTestId("intake-questions-step")
      ).toBeVisible({ timeout: 20_000 });

      // Answer every question the snapshot rendered, whatever the org's active
      // set happens to be -- the seeded question list is not this spec's to fix.
      const answerFields = recipientPage.locator(
        '[data-testid^="intake-question-"]:not([data-testid^="intake-question-error-"])'
      );
      const answerCount = await answerFields.count();
      expect(
        answerCount,
        "intake link must carry a question snapshot"
      ).toBeGreaterThan(0);
      for (let i = 0; i < answerCount; i += 1) {
        await answerFields.nth(i).fill(`X-02 answer ${i + 1}`);
      }

      await recipientPage
        .getByTestId("intake-questions-step")
        .getByRole("button", { name: "Continue" })
        .click();

      // ---- Upload + submit ---------------------------------------------------
      await expect(recipientPage.getByTestId("intake-upload-step")).toBeVisible(
        {
          timeout: 20_000,
        }
      );

      const uploadInput = recipientPage.getByTestId("intake-upload-input");
      await uploadInput.waitFor({ state: "attached" });
      await uploadInput.setInputFiles({
        name: UPLOAD_FILENAME,
        mimeType: "application/pdf",
        buffer: TEXT_SAMPLE_PDF_BYTES,
      });

      // The real presigned-URL round trip: POST /presigned-url -> PUT to
      // storage -> POST /complete. Submit stays disabled until it lands.
      await expect(
        recipientPage.getByTestId("intake-upload-list")
      ).toContainText(UPLOAD_FILENAME, { timeout: 60_000 });
      await expect(
        recipientPage.getByTestId("intake-submit-button")
      ).toBeEnabled({
        timeout: 60_000,
      });

      await recipientPage.getByTestId("intake-submit-button").click();

      await expect(
        recipientPage.getByTestId("intake-submitted-step")
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      // Closed even if an assertion above threw, so a failing run does not
      // leave a browser context behind and slow every later spec.
      await recipientContext.close();
    }

    // ---- Org user: the row now routes to Step 3 with the real submission ----
    // Navigating the dashboard rather than jumping straight to /confirm: the
    // routing itself (P5-07, driven by intakeStatus flipping to "submitted") is
    // part of what this ticket claims works.
    await page.goto("/deals", { waitUntil: "domcontentloaded" });

    const dealRow = page
      .getByRole("link")
      .filter({ hasText: DEAL_NAME })
      .first();
    await expect(dealRow).toBeVisible({ timeout: 30_000 });
    // Anchored: unanchored, `dealId=1` would also match `dealId=15`.
    await expect(dealRow).toHaveAttribute(
      "href",
      new RegExp(`/new-deal/confirm\\?dealId=${dealId}$`)
    );
    await dealRow.click();

    await expect(page.getByTestId("wizard-step-3")).toBeVisible({
      timeout: 30_000,
    });

    // The answers came back through the org-side read, not from wizard state --
    // this browser context never saw them typed.
    const answersPanel = page.getByTestId("wizard-intake-answers");
    await expect(answersPanel).toBeVisible();
    await expect(answersPanel).toContainText("X-02 answer 1");

    // And the document the external party uploaded is listed by name, so it
    // arrived on the deal rather than only into storage.
    await expect(page.getByTestId("wizard-intake-documents")).toContainText(
      UPLOAD_FILENAME,
      { timeout: 30_000 }
    );

    // A submitted link must not be offered for reissue -- that panel is for
    // the degenerate cases (nothing uploaded, everything quarantined).
    await expect(page.getByTestId("wizard-reissue-prompt")).toHaveCount(0);

    // ---- Start Analysis proceeds unchanged ---------------------------------
    // Asserted on the outgoing request, not on navigation, for the reason g31
    // documents: POST /api/deals/{dealId}/analysis may still 404, in which case
    // the wizard shows an error toast and STAYS on Confirm. A
    // `not.toHaveURL(/confirm/)` check would therefore fail today, and would be
    // weak even once the endpoint lands -- an error page and a redirect back to
    // /deals both satisfy it. What "proceeds unchanged" actually means here is
    // that the external-intake branch reaches this step and fires the same
    // request the ordinary upload branch does, against this deal.
    await expect(page.getByTestId("wizard-start-analysis")).toBeEnabled();

    const analysisRequest = page.waitForRequest(
      req => req.method() === "POST" && req.url().includes("/analysis")
    );
    await page.getByTestId("wizard-start-analysis").click();
    expect((await analysisRequest).url()).toMatch(
      new RegExp(`/api/deals/${dealId}/analysis$`)
    );
  });
});
