// client/src/pages/ScreeningRedirect.tsx
import { Redirect } from "wouter";
import { Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DEALS_PIPELINE_QUERY_KEY, fetchDealsPipeline, pickMostRecentCompleteDeal } from "@/api/deals";
import { useAuth } from "@/_core/hooks/useAuth";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { buildMvpNav, ROUTES } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";

/**
 * Landing point for the sidebar's "Initial Screening" nav item, which has no
 * per-deal context to key off of (plan §5 Q1 ruled out a contextual
 * "active deal" sidebar section). Mirrors `AnalysisRedirect`'s mechanism
 * exactly — same deal-picking rule (`pickMostRecentCompleteDeal`), same
 * "no deals yet" empty state — rather than threading deal-count data into
 * the static `buildMvpNav(user)` nav model to drive a disabled/tooltip state
 * (see mvpNav.ts's "screening" leaf comment for why).
 */
export default function ScreeningRedirect() {
  usePageTitle("Initial Screening");
  const { user, loading: authLoading } = useAuth();
  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });
  const query = useQuery({ queryKey: DEALS_PIPELINE_QUERY_KEY, queryFn: fetchDealsPipeline, enabled: Boolean(user) });

  if (authLoading || query.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || query.isError || !query.data) {
    return <Redirect to="/" />;
  }

  const mostRecent = pickMostRecentCompleteDeal(query.data);

  if (mostRecent) {
    return <Redirect to={`/deals/${mostRecent.dealId}/screening`} />;
  }

  const userName = user.name ?? user.email ?? "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const userRoleLabel = role === "admin" ? "Admin" : "Analyst";

  return (
    <MvpAppShell>
      <MvpAppShell.Sidebar>
        <MvpSidebar aria-label="Primary navigation">
          <MvpFundSelector aria-label="Workspace selector" />
          <MvpNavRenderer nav={nav} />
        </MvpSidebar>
      </MvpAppShell.Sidebar>

      <MvpAppShell.Topbar>
        <MvpTopbar>
          <MvpTopbar.Breadcrumb segments={["Deal Flow", "Initial Screening"]} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <PageHeader
            eyebrow="Deal Flow / Initial Screening"
            title="Initial Screening"
            description="Quick fit checks against the investment mandate, before deals move into full diligence."
            className="mb-6"
          />
          <EmptyState
            icon={Search}
            title="No deals to screen"
            description="Upload a CIM or deal document to run your first AI-powered analysis, then check its Initial Screening fit."
            action={{ label: "Add new deal", href: ROUTES.upload }}
          />
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
