import { test, expect } from "@playwright/test";

// @needs-backend-fixtures — the admin portal's only authorization source is
// GET /api/admin/context (see docs/plans/admin-portal-frontend.md, F1), which
// the FastAPI backend does not serve yet. Without it, a signed-in test user
// can reach /admin but the guard can never resolve isPlatformAdmin/isOrgAdmin,
// and /admin/sign-up's Clerk ticket-completion flow has nothing to redirect
// into. Set E2E_BACKEND_FIXTURES=1 to re-enable once the backend serves
// /api/admin/* (mirrors the five existing @needs-backend-fixtures specs).
test.skip(
  !process.env.E2E_BACKEND_FIXTURES,
  "@needs-backend-fixtures: backend does not serve /api/admin/* yet"
);

test.describe("Admin portal — sign-up → capability landing", () => {
  test("invitee lands on /admin/sign-up, completes sign-up, and is redirected to /admin", async ({
    page,
  }) => {
    // Real flow requires a Clerk invitation ticket (__clerk_ticket query
    // param) minted server-side by POST /api/admin/organizations, which
    // needs the backend. Once available, this navigates via the emailed
    // invite URL rather than a bare /admin/sign-up visit.
    await page.goto("/admin/sign-up", { waitUntil: "domcontentloaded" });
    await expect(page.getByAltText("Simpero")).toBeVisible();
    // Clerk's <SignUp> mounts asynchronously; assert its iframe/host renders.
    await expect(page.locator(".cl-signUp-root, .cl-rootBox")).toBeVisible({ timeout: 15_000 });

    // ... complete Clerk sign-up (test-instance credentials via @clerk/testing) ...

    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
  });

  test("returning signed-out admin at /admin is redirected to /admin/sign-in", async ({
    page,
  }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/sign-in$/, { timeout: 10_000 });
    await expect(page.locator(".cl-signIn-root, .cl-rootBox")).toBeVisible({ timeout: 15_000 });
  });

  test("platform admin lands on /admin/organizations; org admin lands on /admin/members", async ({
    page,
  }) => {
    // Requires an authenticated session (Clerk testing token) whose
    // GET /api/admin/context resolves isPlatformAdmin or isOrgAdmin — both
    // backend-provided, hence gated.
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/(organizations|members)$/, { timeout: 15_000 });
  });

  test("non-admin signed-in user hits the inline Access denied view, not a redirect", async ({
    page,
  }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/access denied/i)).toBeVisible({ timeout: 15_000 });
    // Deliberately still on /admin — AdminGuard renders AccessDenied inline,
    // it does not navigate away.
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("Admin portal — basic navigation", () => {
  test("platform admin can navigate from Organizations to an org's detail page and invite dialog", async ({
    page,
  }) => {
    await page.goto("/admin/organizations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Client Organizations" })).toBeVisible({
      timeout: 15_000,
    });
    const firstViewMembersLink = page.getByRole("link", { name: /view members/i }).first();
    await firstViewMembersLink.click();
    await expect(page).toHaveURL(/\/admin\/organizations\/[^/]+$/, { timeout: 15_000 });
    const inviteMemberButton = page.getByRole("button", { name: /invite member/i });
    await expect(inviteMemberButton).toBeVisible();
    await inviteMemberButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
  });

  test("org admin nav exposes Members and Invitations, not Organizations", async ({ page }) => {
    await page.goto("/admin/members", { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Members" })).toBeVisible({ timeout: 15_000 });
    await expect(nav.getByRole("link", { name: "Invitations" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Organizations" })).toHaveCount(0);
  });

  test("Sign out ends the session and returns to /admin/sign-in", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/admin\/sign-in$/, { timeout: 15_000 });
  });
});
