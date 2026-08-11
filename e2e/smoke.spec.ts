import { test, expect } from "@playwright/test";

test.describe("Simpero UI smoke", () => {
  test("default route shows dashboard (investment pipeline)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Investment pipeline/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("upload intake shows workspace layout", async ({ page }) => {
    await page.goto("/new-deal", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /New Deal/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();
  });

  test("diagnostics JSON is public", async ({ request }) => {
    const res = await request.get("/api/simpero/diagnostics");
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { ok?: boolean; defaultAliasAnthropicModel?: string | null };
    expect(body.ok).toBe(true);
  });
});
