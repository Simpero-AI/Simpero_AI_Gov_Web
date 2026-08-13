import { useAuth } from "@/_core/hooks/useAuth";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import type { LucideIcon } from "lucide-react";

export interface ComingSoonPageProps {
  pageTitle: string;
  topbarSegments: string[];
  Icon: LucideIcon;
  headline: string;
  description: string;
  gapRef?: string;
  /** Optional sub-topics list — Institutional Memory uses this. */
  subTopics?: Array<{ title: string; desc: string }>;
}

export function ComingSoonPage({
  pageTitle, topbarSegments, Icon, headline, description, subTopics,
}: ComingSoonPageProps) {
  usePageTitle(pageTitle);
  const { user } = useAuth();
  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });
  const userInitial = user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;

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
          <MvpTopbar.Breadcrumb segments={topbarSegments} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <PageHeader
            eyebrow={`Intelligence / ${pageTitle}`}
            title={pageTitle}
            description="Coming soon"
            className="mb-6"
          />
          <div className="mx-auto max-w-2xl px-6 py-12">
            <div className="text-center">
              <Icon className="mx-auto h-12 w-12 text-slate-300" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold text-foreground">{headline}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
            {subTopics ? (
              <ul className="mt-6 space-y-3" role="presentation">
                {subTopics.map((t) => (
                  <li
                    key={t.title}
                    className="rounded-md border border-border bg-muted/40 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
