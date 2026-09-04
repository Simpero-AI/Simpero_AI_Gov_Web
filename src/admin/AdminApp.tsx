import { Navigate, Route, Routes } from "react-router";
import AdminGuard from "./components/AdminGuard";
import AdminHome from "./pages/AdminHome";
import IntakeQuestions from "./pages/IntakeQuestions";
import Invitations from "./pages/Invitations";
import MandateTaxonomy from "./pages/MandateTaxonomy";
import Members from "./pages/Members";
import OrgDetail from "./pages/OrgDetail";
import Organizations from "./pages/Organizations";

/**
 * Lazy entrypoint for the guarded portal subtree, mounted at the `/admin/*`
 * splat route in src/routes.tsx. This is a descendant <Routes>, so the child
 * paths below are relative to the splat (no leading slash) — but links and
 * redirects elsewhere in src/admin/** use the absolute ADMIN_ROUTES paths,
 * since a relative `to` resolves against the matched route, not the URL.
 */
export default function AdminApp() {
  return (
    <AdminGuard>
      <Routes>
        <Route index element={<AdminHome />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="organizations/:orgId" element={<OrgDetail />} />
        <Route path="mandate-taxonomy" element={<MandateTaxonomy />} />
        <Route path="intake-questions" element={<IntakeQuestions />} />
        <Route path="members" element={<Members />} />
        <Route path="invitations" element={<Invitations />} />
        {/* Unknown admin path falls back to the product root (wouter's `~/`). */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminGuard>
  );
}
