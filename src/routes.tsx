import { Spinner } from "@/components/mvp/primitives";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Navigate, useParams, type RouteObject } from "react-router";
import App, { AuthGateLayout } from "./App";
import Deals from "./pages/Deals";
import StealthLanding from "./pages/StealthLanding";
import History from "./pages/History";
import MemoViewer from "./pages/MemoViewer";
import MemoDeliverablePage from "./pages/MemoDeliverable";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import VerifyOutput from "./pages/VerifyOutput";
import SharedMemo from "./pages/SharedMemo";
import MethodologyDashboard from "./pages/MethodologyDashboard";
import ProductUsage from "./pages/ProductUsage";
import DealDetail from "./pages/DealDetail";
import AnalysisRedirect from "./pages/AnalysisRedirect";
import ScreeningRedirect from "./pages/ScreeningRedirect";
import MandateScorecard from "./pages/MandateScorecard";
import InstitutionalMemoryPage from "./pages/intelligence/InstitutionalMemory";
import AntiPortfolio from "./pages/AntiPortfolio";
import NewDealWizard from "@/pages/NewDealWizard";

// External Deal Intake public surface (P4) — lazy for the same reason as the
// Admin Portal below: its code (no MvpAppShell/useAuth) must never enter the
// main product bundle.
const IntakePage = lazy(() => import("@/pages/intake/IntakePage"));

// Admin Portal — lazy so its code never enters the main product bundle
// (docs/plans/admin-portal-frontend.md). Mounted as a sibling of the
// AuthGate layout route below, NOT inside it — admins are an admin-only
// identity (no product `users` row) and must never hit /auth/me.
const AdminSignUp = lazy(() => import("@/admin/pages/AdminSignUp"));
const AdminSignIn = lazy(() => import("@/admin/pages/AdminSignIn"));
const AdminApp = lazy(() => import("@/admin/AdminApp"));

/** Suspense fallback for the admin chunks — product-independent, matches the
 * admin sign-up/sign-in visual language (--mvp-sidebar-bg), deliberately
 * not the product shell's loader (AdminLayout doesn't exist until Phase 1). */
function AdminBootFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--mvp-sidebar-bg)]">
      <Spinner className="size-6 text-white" />
    </div>
  );
}

/** Suspense fallback for the intake chunk — matches IntakeShell's own bg-gray-50, not the product loader. */
function IntakeBootFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Spinner className="size-6 text-gray-400" />
    </div>
  );
}

// Param wrappers — the route-object equivalent of wouter's inline render
// props. Route plumbing, so they live next to the table.

function MandateScorecardRoute() {
  const params = useParams();
  return <MandateScorecard section={params.section} />;
}

function NewDealWizardRoute() {
  const params = useParams();
  return <NewDealWizard step={params.step} />;
}

function DealScreeningRoute() {
  const params = useParams();
  // dealId is an opaque UUID string now — no numeric coercion.
  if (!params.dealId) return <NotFound />;
  return <DealDetail dealId={params.dealId} tab="screening" />;
}

function DealAnalysisRoute() {
  const params = useParams();
  if (!params.dealId) return <NotFound />;
  return <DealDetail dealId={params.dealId} tab="analysis" />;
}

function LegacyAnalysisRedirectRoute() {
  const params = useParams();
  if (!params.dealId) return <NotFound />;
  return <Navigate to={`/deals/${params.dealId}/analysis`} replace />;
}

function InstitutionalMemoryRoute() {
  const params = useParams();
  return <InstitutionalMemoryPage sub={params.sub} />;
}

export const routes: RouteObject[] = [
  {
    // Root layout: providers + <Outlet />. Pathless, so every route below is
    // rendered inside the same provider tree (and the same ErrorBoundary).
    element: <App />,
    children: [
      { path: "/landing", element: <StealthLanding /> },
      { path: "/shared/:token", element: <SharedMemo /> },
      // External Deal Intake (P4) — unauthenticated public surface for a
      // party with no Simpero account, structurally isolated from the
      // product shell the same way the admin portal is (see IntakeShell).
      {
        path: "/intake/:token",
        element: (
          <Suspense fallback={<IntakeBootFallback />}>
            <IntakePage />
          </Suspense>
        ),
      },
      // Both the bare and the splat form are registered for the Clerk auth
      // routes — `/sign-in/*` is not documented to also match bare `/sign-in`.
      { path: "/sign-in", element: <SignInPage /> },
      { path: "/sign-in/*", element: <SignInPage /> },
      { path: "/sign-up", element: <SignUpPage /> },
      { path: "/sign-up/*", element: <SignUpPage /> },
      // Admin Portal (F1/F2) — outside AuthGate, guarded internally by
      // AdminGuard (Clerk signed-in + GET /api/admin/context).
      {
        path: "/admin/sign-up",
        element: (
          <Suspense fallback={<AdminBootFallback />}>
            <AdminSignUp />
          </Suspense>
        ),
      },
      {
        path: "/admin/sign-up/*",
        element: (
          <Suspense fallback={<AdminBootFallback />}>
            <AdminSignUp />
          </Suspense>
        ),
      },
      {
        path: "/admin/sign-in",
        element: (
          <Suspense fallback={<AdminBootFallback />}>
            <AdminSignIn />
          </Suspense>
        ),
      },
      {
        path: "/admin/sign-in/*",
        element: (
          <Suspense fallback={<AdminBootFallback />}>
            <AdminSignIn />
          </Suspense>
        ),
      },
      {
        path: "/admin/*",
        element: (
          <Suspense fallback={<AdminBootFallback />}>
            <AdminApp />
          </Suspense>
        ),
      },
      {
        // Everything below here is the authenticated product surface.
        element: <AuthGateLayout />,
        children: [
          { path: "/", element: <Deals /> },
          { path: "/mandate-scorecard/:section", element: <MandateScorecardRoute /> },
          { path: "/mandate-scorecard", element: <Navigate to="/mandate-scorecard/firm" replace /> },
          { path: "/setup/investment-profile", element: <Navigate to="/mandate-scorecard/firm" replace /> },
          { path: "/new-deal/:step?", element: <NewDealWizardRoute /> },
          { path: "/screening", element: <ScreeningRedirect /> },
          { path: "/deals/:dealId/screening", element: <DealScreeningRoute /> },
          { path: "/deals/:dealId/analysis/:sub?", element: <DealAnalysisRoute /> },
          { path: "/analysis", element: <AnalysisRedirect /> },
          // Permanent redirect for the pre-Phase-4 route — NewDealWizard still
          // navigates here unconditionally on submit (frozen, not touched by
          // this redesign) and old bookmarked/shared links must keep working.
          { path: "/analysis/:dealId", element: <LegacyAnalysisRedirectRoute /> },
          { path: "/history", element: <History /> },
          { path: "/memo/:sessionId/ledger", element: <MemoViewer /> },
          { path: "/memo/:sessionId", element: <MemoDeliverablePage /> },
          { path: "/verify", element: <VerifyOutput /> },
          { path: "/methodology", element: <MethodologyDashboard /> },
          { path: "/product-usage", element: <ProductUsage /> },
          // Permanent redirects for the pre-Phase-8 routes (plan §2) — old
          // bookmarked/shared links must keep working.
          { path: "/intelligence/decision-feed", element: <Navigate to="/intelligence/memory/decision-log" replace /> },
          { path: "/intelligence/ask-me", element: <Navigate to="/intelligence/memory/memory-search" replace /> },
          {
            path: "/intelligence/institutional-memory",
            element: <Navigate to="/intelligence/memory/memory-search" replace />,
          },
          { path: "/intelligence/memory/:sub?", element: <InstitutionalMemoryRoute /> },
          { path: "/anti-portfolio", element: <AntiPortfolio /> },
          { path: "/404", element: <NotFound /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
];
