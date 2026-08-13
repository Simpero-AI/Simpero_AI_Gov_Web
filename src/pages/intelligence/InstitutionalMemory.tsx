import type { ComponentType } from "react";
import { Brain } from "lucide-react";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { buildMvpNav, INSTITUTIONAL_MEMORY_SUBTABS, ROUTES } from "@/components/mvp/nav/mvpNav";
import { cn } from "@/lib/utils";
import { ComingSoonPage } from "./ComingSoonPage";
import { MemorySearchPane } from "./memory/MemorySearchPane";
import { AnalystNotesPane } from "./memory/AnalystNotesPane";
import { PatternEnginePane } from "./memory/PatternEnginePane";
import { PlaybooksPane } from "./memory/PlaybooksPane";
import { SectorIntelPane } from "./memory/SectorIntelPane";
import { DecisionLogPane } from "./memory/DecisionLogPane";

const SUB_TOPICS = [
  { title: "Memory Search", desc: "Full-text + semantic search across past memos and decisions." },
  { title: "Analyst Notes", desc: "Personal and team analyst commentary attached to deals." },
  { title: "Pattern Engine", desc: "Auto-detected patterns across declined / approved deals." },
  { title: "Playbooks", desc: "Reusable diligence sequences for sector or stage." },
  { title: "Sector Intel", desc: "Aggregated sector signal from your portfolio." },
  { title: "Decision Log", desc: "Append-only record of IC decisions with rationale." },
];

const VALID_SUBS = new Set(INSTITUTIONAL_MEMORY_SUBTABS.map((t) => t.key));
const DEFAULT_SUB = INSTITUTIONAL_MEMORY_SUBTABS[0].key;

const PANES: Record<string, ComponentType> = {
  "memory-search": MemorySearchPane,
  "analyst-notes": AnalystNotesPane,
  "pattern-engine": PatternEnginePane,
  playbooks: PlaybooksPane,
  "sector-intel": SectorIntelPane,
  "decision-log": DecisionLogPane,
};

interface InstitutionalMemoryProps {
  sub?: string;
}

/**
 * Institutional Memory's 6 sub-tabs, hosted at `/intelligence/memory/:sub?`
 * (replaces the old /intelligence/decision-feed, /intelligence/ask-me,
 * /intelligence/institutional-memory routes — plan §2). `:sub` is a real
 * path param, not a `?tab=` query string (unlike DealDetail's AnalysisTabs) —
 * this is a top-level bookmarkable page, not a tab nested inside another
 * page, so the plainer path shape fits, and it doubles as a stable partner
 * for the sidebar subnav's `href`s (INSTITUTIONAL_MEMORY_SUBTABS in mvpNav.ts).
 *
 * Gated entirely on `isPlatformAdmin` (plan §5 Q9) — a non-platform-admin
 * (including one who bookmarks/guesses this URL directly) sees the existing
 * `ComingSoonPage`, not the real tab host.
 */
export default function InstitutionalMemoryPage({ sub }: InstitutionalMemoryProps) {
  usePageTitle("Institutional Memory");
  const { user } = useAuth();
  // Called unconditionally (rules-of-hooks) even though its output is only
  // used in the platform-admin branch below.
  const { userInitial, userName, userRoleLabel } = useUserDisplay();

  if (!user?.is_platform_admin) {
    return (
      <ComingSoonPage
        pageTitle="Institutional Memory"
        topbarSegments={["Intelligence", "Institutional Memory"]}
        Icon={Brain}
        headline="Institutional Memory is coming"
        description="A unified workspace for your fund's collective intelligence."
        subTopics={SUB_TOPICS}
      />
    );
  }

  if (!sub || !VALID_SUBS.has(sub)) {
    return <Redirect to={`${ROUTES.intelligenceMemory}/${DEFAULT_SUB}`} />;
  }
  const active = sub;
  const activeTab = INSTITUTIONAL_MEMORY_SUBTABS.find((t) => t.key === active)!;
  const Pane = PANES[active];

  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });

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
          <MvpTopbar.Breadcrumb segments={["Intelligence", "Institutional Memory"]} />
          <MvpTopbar.Subtitle>{activeTab.label}</MvpTopbar.Subtitle>
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <h1 className="mb-[18px] font-serif text-[27px] font-semibold text-[color:var(--rev-text-1)]">
            {activeTab.label}
          </h1>

          <div role="tablist" aria-label="Institutional Memory sub-tabs" className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-[color:var(--rev-border-strong)]">
            {INSTITUTIONAL_MEMORY_SUBTABS.map((t) => (
              <Link
                key={t.key}
                href={`${ROUTES.intelligenceMemory}/${t.key}`}
                role="tab"
                aria-selected={active === t.key}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors",
                  active === t.key
                    ? "border-[color:var(--rev-primary)] text-[color:var(--rev-primary)]"
                    : "border-transparent text-[color:var(--rev-text-5)] hover:text-[color:var(--rev-text-2)]"
                )}
              >
                <t.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {t.label}
              </Link>
            ))}
          </div>

          <Pane />
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
