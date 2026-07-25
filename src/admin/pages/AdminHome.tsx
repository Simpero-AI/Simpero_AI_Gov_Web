import { Redirect } from "wouter";
import { useAdminContext } from "../hooks/useAdminContext";

/**
 * Capability landing for /admin — AdminGuard has already resolved the admin
 * context (and confirmed isPlatformAdmin || isOrgAdmin) before this route
 * can render, so the query below is a cache hit, not a new fetch.
 */
export default function AdminHome() {
  const { isPlatformAdmin, isOrgAdmin } = useAdminContext();

  if (isPlatformAdmin) return <Redirect to="/organizations" />;
  if (isOrgAdmin) return <Redirect to="/members" />;

  // Unreachable in practice — AdminGuard already blocks non-admins from
  // reaching this route. Kept as a safe fallback rather than an assertion.
  return <Redirect to="~/" />;
}
