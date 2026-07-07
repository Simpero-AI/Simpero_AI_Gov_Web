// client/src/pages/AnalysisRedirect.tsx
import { Redirect } from "wouter";
import { Loader2, BarChart2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
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

export default function AnalysisRedirect() {
  usePageTitle("Deal Analysis");
  const { user, loading: authLoading } = useAuth();
  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role });
  const query = trpc.deals.listPipeline.useQuery(undefined, { enabled: Boolean(user) });

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

  const completed = query.data
    .filter((r) => r.agentStatus.jobStatus === "complete")
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

  if (completed.length > 0) {
    return <Redirect to={`/analysis/${completed[0].dealId}`} />;
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
          <MvpTopbar.Breadcrumb segments={["Deal Flow", "Deal Analysis"]} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <PageHeader
            eyebrow="Deal Flow / Deal Analysis"
            title="Deal Analysis"
            description="AI-powered diligence analysis for your pipeline deals."
            className="mb-6"
          />
          <EmptyState
            icon={BarChart2}
            title="No deals to analyze"
            description="Upload a CIM or deal document to run your first AI-powered analysis."
            action={{ label: "Add new deal", href: ROUTES.upload }}
          />
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
