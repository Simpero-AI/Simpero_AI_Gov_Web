/**
 * Playwright global setup — Clerk testing tokens (replaces the old monorepo
 * SKIP_AUTH_DEV server bypass; see playbook FE-5).
 *
 * When CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY (Clerk **test** instance,
 * CI-only) are set, `clerkSetup()` obtains a testing token so specs can
 * authenticate against a real backend. Without them the setup is a no-op and
 * specs that require an authenticated session will fail or skip — fine for
 * local UI-only runs.
 */
export default async function globalSetup() {
  if (!process.env.CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    console.log(
      "[e2e] CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY not set — skipping Clerk testing-token setup."
    );
    return;
  }
  const { clerkSetup } = await import("@clerk/testing/playwright");
  await clerkSetup();
}
