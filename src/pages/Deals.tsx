import { useState } from "react";
import { useNavigate } from "react-router";
import { BarChart3, CheckCircle2, GitBranch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DEALS_DASHBOARD_STATS_QUERY_KEY,
  DEALS_PIPELINE_QUERY_KEY,
  fetchDashboardStats,
  fetchDealsPipeline,
} from "@/api/deals";
import { INVESTMENT_PROFILE_QUERY_KEY, fetchInvestmentProfile } from "@/api/investmentProfile";
import { Button } from "@/components/mvp/primitives/button";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { buildMvpNav, ROUTES } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { KpiTile } from "@/components/mvp/tiles/KpiTile";
import { AiScoreTile } from "@/components/mvp/deals/AiScoreTile";
import { FundPerformanceCard } from "@/components/mvp/deals/FundPerformanceCard";
import { MandateBanner, type MandateBannerFields } from "@/components/mvp/deals/MandateBanner";
import { DealsTable } from "@/components/mvp/deals/DealsTable";
import { formatUsdShort } from "@/lib/dealMetricsFormat";

export default function Deals() {
  usePageTitle("Deals");
  const navigate = useNavigate();
  const { user } = useAuth();

  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });

  const [search, setSearch] = useState("");

  const statsQuery = useQuery({ queryKey: DEALS_DASHBOARD_STATS_QUERY_KEY, queryFn: fetchDashboardStats });
  const pipelineQuery = useQuery({ queryKey: DEALS_PIPELINE_QUERY_KEY, queryFn: fetchDealsPipeline });
  const investmentProfileQuery = useQuery({
    queryKey: INVESTMENT_PROFILE_QUERY_KEY,
    queryFn: fetchInvestmentProfile,
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const userInitial = user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;

  const mandate = buildMandateBannerFields(investmentProfileQuery.data?.mandate);

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
          <MvpTopbar.Eyebrow>{currentQuarterLabel()}</MvpTopbar.Eyebrow>
          <MvpTopbar.SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search deals or targets"
            aria-label="Search deals or targets"
          />
          <MvpTopbar.Actions>
            <Button onClick={() => navigate(ROUTES.upload)}>+ New Deal</Button>
          </MvpTopbar.Actions>
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <div className="mx-auto w-full max-w-[1180px] px-6 py-8">
          <header className="mb-[22px]">
            <h1 className="font-serif text-[27px] font-semibold text-[color:var(--rev-text-1)]">Active Deals</h1>
            <p className="mt-1.5 text-sm text-[color:var(--rev-text-5)]">
              Cross-workstream due diligence across the live transaction pipeline.
            </p>
          </header>

          <FundPerformanceCard />

          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile
              eyebrow="Total Deals"
              value={statsQuery.data?.totalDeals.value ?? "—"}
              icon={BarChart3}
              tint="primary"
              sub={
                statsQuery.data
                  ? `${formatDelta(statsQuery.data.totalDeals.delta)} this ${statsQuery.data.window}`
                  : undefined
              }
            />
            <KpiTile
              eyebrow="Pipeline Value"
              value={statsQuery.data ? formatUsdShort(statsQuery.data.pipelineValueUsd.value) : "—"}
              icon={GitBranch}
              tint="success"
              sub={
                statsQuery.data
                  ? formatPipelineDelta(statsQuery.data.pipelineValueUsd.delta, statsQuery.data.window)
                  : undefined
              }
            />
            <AiScoreTile avgScoreTenths={statsQuery.data?.avgAiScore.value ?? null} />
            <KpiTile
              eyebrow="DD Completion"
              value={statsQuery.data ? `${statsQuery.data.ddCompletionPct.value}%` : "—"}
              icon={CheckCircle2}
              tint="info"
              sub={
                statsQuery.data
                  ? ddCompletionSub(
                      statsQuery.data.ddCompletionPct.value,
                      statsQuery.data.totalDeals.value,
                      statsQuery.data.ddCompletionPct.deltaPp
                    )
                  : undefined
              }
            />
          </div>

          <MandateBanner mandate={mandate} onConfigure={() => navigate(ROUTES.mandateScorecardFirm)} />

          <DealsTable rows={pipelineQuery.data ?? []} nameQuery={search} />
        </div>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}

// ----- Mandate mapping -----

type MandateBlob = {
  checkSize?: string;
  targetReturn?: string;
  holdPeriod?: string;
  mandateSectorLabels?: unknown;
  sectors?: unknown;
  regions?: unknown;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function buildMandateBannerFields(mandateRecord: Record<string, unknown> | undefined): MandateBannerFields | null {
  if (!mandateRecord) return null;
  const mandate = mandateRecord as MandateBlob;
  const sectors = asStringArray(mandate.mandateSectorLabels ?? mandate.sectors);
  const geography = asStringArray(mandate.regions);
  return {
    checkSize: mandate.checkSize || "—",
    holdPeriod: mandate.holdPeriod || "—",
    focusSectors: sectors.length > 0 ? sectors.join(" · ") : "—",
    geography: geography.length > 0 ? geography.join(" · ") : "—",
  };
}

// ----- Formatters -----

function currentQuarterLabel(): string {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `Portfolio · Q${quarter} ${now.getFullYear()}`;
}

function formatDelta(n: number): string {
  if (n === 0) return "no change";
  return n > 0 ? `+${n}` : `${n}`;
}

function formatPipelineDelta(delta: number | "new" | null, window: string): string | undefined {
  if (delta === null) return undefined;
  if (delta === "new") return `new this ${window}`;
  const pct = delta.toFixed(0);
  return `${delta > 0 ? "+" : ""}${pct}% vs last ${window}`;
}

function ddCompletionSub(pct: number, total: number, deltaPp: number): string {
  const completed = Math.round(total * (pct / 100));
  const completedStr = completed > 0
    ? `${completed} deal${completed === 1 ? "" : "s"} with completed analysis`
    : "none with completed analysis";
  const deltaStr = `${deltaPp > 0 ? "+" : ""}${deltaPp}pp`;
  return `${completedStr} · ${deltaStr}`;
}
