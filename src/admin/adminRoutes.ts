/**
 * Absolute admin paths. react-router has no `base` equivalent for the
 * descendant <Routes> in AdminApp, and a relative `to` resolves against the
 * matched route (not the URL), so every admin link/redirect/active-check uses
 * these full paths. Admin-local by design — never import the product's ROUTES
 * here, and never import this from product code (CLAUDE.md separation rule).
 */
export const ADMIN_BASE = "/admin";

export const ADMIN_ROUTES = {
  home: ADMIN_BASE,
  organizations: `${ADMIN_BASE}/organizations`,
  orgDetail: (orgId: string) => `${ADMIN_BASE}/organizations/${orgId}`,
  mandateTaxonomy: `${ADMIN_BASE}/mandate-taxonomy`,
  members: `${ADMIN_BASE}/members`,
  invitations: `${ADMIN_BASE}/invitations`,
  signIn: `${ADMIN_BASE}/sign-in`,
} as const;
