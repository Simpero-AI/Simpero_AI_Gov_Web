import { test, expect } from "@playwright/test";

/**
 * Mock tRPC auth.me to return an admin user so the admin pages render
 * their chrome rather than the "Access denied" gate.
 * The bypass dev user has role="user" in the memory-only E2E env (no
 * OWNER_OPEN_ID configured), so we intercept at the network layer.
 */
async function mockAdminUser(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  const now = new Date().toISOString();
  const adminUser = {
    json: {
      id: 1,
      openId: "dev-local-bypass-sk-omit-auth",
      name: "Local Dev",
      email: "dev@local",
      loginMethod: "bypass",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    meta: {
      values: {
        createdAt: ["Date"],
        updatedAt: ["Date"],
        lastSignedIn: ["Date"],
      },
    },
  };

  await page.route("**/api/trpc/auth.me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: adminUser } }]),
    });
  });
}

test.describe("MVP admin pages", () => {
  test("/methodology renders chrome", async ({ page }) => {
    await mockAdminUser(page);
    await page.goto("/methodology");
    // Topbar now uses a two-line layout: breadcrumb path on line 1, page title on line 2.
    await expect(page.getByRole("banner").getByText("Methodology")).toBeVisible();
    await expect(page).toHaveTitle("Methodology · Simpero");
  });

  test("/product-usage renders chrome", async ({ page }) => {
    await mockAdminUser(page);
    await page.goto("/product-usage");
    // Topbar now uses a two-line layout: breadcrumb path on line 1, page title on line 2.
    await expect(page.getByRole("banner").getByText("Product Usage")).toBeVisible();
    await expect(page).toHaveTitle("Product Usage · Simpero");
  });
});
