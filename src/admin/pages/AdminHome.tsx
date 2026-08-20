import { Navigate } from "react-router";
import { ADMIN_ROUTES } from "../adminRoutes";
import { useAdminContext } from "../hooks/useAdminContext";

/**
 * Capability landing for /admin — AdminGuard has already resolved the admin
 * context (and confirmed isPlatformAdmin || isOrgAdmin) before this route
 * can render, so the query below is a cache hit, not a new fetch.
 */
export default function AdminHome() {
  const { isPlatformAdmin, isOrgAdmin } = useAdminContext();

  if (isPlatformAdmin) return <Navigate to={ADMIN_ROUTES.organizations} replace />;
  if (isOrgAdmin) return <Navigate to={ADMIN_ROUTES.members} replace />;

  // Unreachable in practice — AdminGuard already blocks non-admins from
  // reaching this route. Kept as a safe fallback rather than an assertion.
  return <Navigate to="/" replace />;
}
