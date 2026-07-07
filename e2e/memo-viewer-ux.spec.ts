import { test, expect } from "@playwright/test";
import {
  buildE2eUxMemo,
  E2E_UX_MEMO_SESSION_ID,
  E2E_SHARED_MEMO_TOKEN,
} from "@shared/e2eUxMemoFixture";

function seedMemoSession(page: import("@playwright/test").Page) {
  const memo = buildE2eUxMemo();
  return page.addInitScript(
    ([json]) => {
      sessionStorage.setItem("simpero_memo", json);
      sessionStorage.removeItem("simpero_conference");
    },
    [JSON.stringify(memo)]
  );
}

test.describe("Memo Viewer — Pass 2, badges, PDF gate", { tag: "@ux" }, () => {
  test.beforeEach(async ({ page }) => {
    await seedMemoSession(page);
  });

  test("shows citation verification banner, section confidence badges, and blocks PDF until acknowledged", async ({
    page,
  }) => {
    await page.goto(`/memo/${E2E_UX_MEMO_SESSION_ID}/ledger`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Citation verification — review before reliance")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Low confidence — manual review").first()).toBeVisible();
    await expect(page.getByText("Verified — verify material claims").first()).toBeVisible();

    const pdfBlocked = page.getByRole("button", { name: /PDF \(ack required\)/ });
    await expect(pdfBlocked).toBeDisabled();

    await page.locator('label:has-text("I understand automatic citation verification")').getByRole("checkbox").click();
    await page.getByRole("button", { name: /Acknowledge — enable PDF/ }).click();

    await expect(page.getByRole("button", { name: /^Export PDF$/ })).toBeEnabled({ timeout: 10_000 });
  });
});

test.describe("Memo Viewer — attestation gate", { tag: "@ux" }, () => {
  test.beforeEach(async ({ page }) => {
    await seedMemoSession(page);
  });

  test("Principal attestation opens only after citation verification acknowledgment when signed in", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL?.trim(),
      "Set E2E_DATABASE_URL so dev bypass can create a DB user (Principal attestation control is shown)."
    );

    await page.goto(`/memo/${E2E_UX_MEMO_SESSION_ID}/ledger`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Principal attestation" })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Principal attestation" }).click();
    await expect(page.getByText("Acknowledge citation verification notice first")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.locator('label:has-text("I understand automatic citation verification")').getByRole("checkbox").click();
    await page.getByRole("button", { name: /Acknowledge — enable PDF/ }).click();

    await page.getByRole("button", { name: "Principal attestation" }).click();
    await expect(page.getByRole("dialog", { name: "Principal Review Attestation" })).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Shared memo — read-only confidence UX", { tag: "@ux" }, () => {
  test("shows fixture memo, citation verification banner, and section confidence badges", async ({ page }) => {
    await page.goto(`/shared/${E2E_SHARED_MEMO_TOKEN}`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(/READ-ONLY SHARED VIEW — This memo was shared/i)
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Citation verification — review before reliance")).toBeVisible();
    await expect(page.getByText("Low confidence — manual review").first()).toBeVisible();
  });
});
