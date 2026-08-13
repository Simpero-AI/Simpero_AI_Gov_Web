import { useMemo, useState } from "react";
import { Activity, Archive, CheckCircle2, Shield, TrendingDown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import { KpiTile } from "@/components/mvp/tiles/KpiTile";
import { DeclineCard, type DeclineRecord } from "@/components/mvp/antiPortfolio/DeclineCard";
import { PatternRecognitionCard } from "@/components/mvp/antiPortfolio/PatternRecognitionCard";
import { ThesisDriftCard } from "@/components/mvp/antiPortfolio/ThesisDriftCard";
import { cn } from "@/lib/utils";
import { ComingSoonPage } from "./intelligence/ComingSoonPage";

type CategoryTabKey = "all" | "validated" | "missed" | "neutral";

const CATEGORY_TABS: ReadonlyArray<{ key: CategoryTabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "validated", label: "Validated Passes" },
  { key: "missed", label: "Missed Opportunities" },
  { key: "neutral", label: "Neutral" },
];

// No endpoint sources tracked declines yet (tmp/backend-prompts.md prompt 4,
// docs/plans/2026-08-12-web-design-revamp.md §4c) — an empty list, not
// fabricated rows, so the tabs/chips/cards below are real UI operating over
// genuinely-nothing rather than a fake dataset dressed up as real.
const DECLINES: DeclineRecord[] = [];

/**
 * Anti-Portfolio: deals we passed on, tracked against what actually
 * happened. Gated on `isPlatformAdmin` the same way as
 * `InstitutionalMemory.tsx` (plan §5 Q9) — a non-platform-admin sees
 * `ComingSoonPage`, not the real page. Unlike Institutional Memory this is
 * one page, not a sub-tab host, so there's no pill-switcher here.
 */
export default function AntiPortfolio() {
  usePageTitle("Anti-Portfolio");
  const { user } = useAuth();
  // Called unconditionally (rules-of-hooks) even though only used below the gate.
  const { userInitial, userName, userRoleLabel } = useUserDisplay();
  const [category, setCategory] = useState<CategoryTabKey>("all");

  const counts = useMemo<Record<CategoryTabKey, number>>(
    () => ({
      all: DECLINES.length,
      validated: DECLINES.filter((d) => d.category === "validated").length,
      missed: DECLINES.filter((d) => d.category === "missed").length,
      neutral: DECLINES.filter((d) => d.category === "neutral").length,
    }),
    []
  );

  const filtered = useMemo(
    () => (category === "all" ? DECLINES : DECLINES.filter((d) => d.category === category)),
    [category]
  );

  if (!user?.is_platform_admin) {
    return (
      <ComingSoonPage
        pageTitle="Anti-Portfolio"
        topbarSegments={["Deal Flow", "Anti-Portfolio"]}
        Icon={Shield}
        headline="Anti-Portfolio is coming"
        description="Deals we passed on, tracked against what actually happened — a check on our judgment, not just our pipeline."
      />
    );
  }

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
          <MvpTopbar.Breadcrumb segments={["Deal Flow", "Anti-Portfolio"]} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <header className="mb-[22px]">
            <h1 className="font-serif text-[27px] font-semibold text-[color:var(--rev-text-1)]">Anti-Portfolio</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--rev-text-5)]">
              Deals we passed on, tracked against what actually happened — a check on our judgment, not just our
              pipeline.
            </p>
          </header>

          <div className="mb-[22px] grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile eyebrow="Tracked Declines" value="—" icon={Archive} tint="primary" sub="Not tracked yet" />
            <KpiTile eyebrow="Validated Passes" value="—" icon={CheckCircle2} tint="success" sub="Not tracked yet" />
            <KpiTile eyebrow="Missed Opportunities" value="—" icon={TrendingDown} tint="danger" sub="Not tracked yet" />
            <KpiTile eyebrow="Avg. Valuation Change" value="—" icon={Activity} tint="info" sub="Not tracked yet" />
          </div>

          <div className="mb-[22px] grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
            <PatternRecognitionCard />
            <ThesisDriftCard />
          </div>

          <div className="mb-3.5 flex flex-wrap items-center gap-1 border-b border-[color:var(--rev-border-strong)] pb-0">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setCategory(t.key)}
                aria-pressed={category === t.key}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium",
                  category === t.key
                    ? "border-[color:var(--rev-primary)] text-[color:var(--rev-primary)]"
                    : "border-transparent text-[color:var(--rev-text-5)] hover:text-[color:var(--rev-text-2)]"
                )}
              >
                {t.label} <span className="font-mono text-[11px] opacity-70">{counts[t.key]}</span>
              </button>
            ))}
            <div className="flex-1" />
            {/* Sector chips: mockup derives these from the distinct sectors present
                in tracked declines. There are none yet, so "All sectors" is the
                only real option — not a fabricated sector list. */}
            <div className="mb-2 flex flex-wrap items-center gap-1">
              <span className="rounded-full bg-[color:var(--rev-primary)] px-3.5 py-[7px] text-[12.5px] font-medium text-white">
                All sectors
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Archive}
                title="No tracked declines yet"
                description="Anti-Portfolio isn't wired to a backend yet — once it is, each declined deal will appear here with valuation-at-pass, valuation-now, status, and an analyst note on how the pass held up."
              />
            ) : (
              filtered.map((d) => <DeclineCard key={d.id} record={d} />)
            )}
          </div>
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
