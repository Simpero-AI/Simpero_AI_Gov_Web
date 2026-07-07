import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart2,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/mvp/primitives/button";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { buildMvpNav, ROUTES } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { StatTile } from "@/components/mvp/tiles/StatTile";
import { LivePipelineTable } from "@/components/mvp/dashboard/LivePipelineTable";
import { cn } from "@/lib/utils";

const INVESTMENT_PROFILE_BANNER_STORAGE = "simpero_investment_banner_dismiss";

export default function Dashboard() {
  usePageTitle("Dashboard");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role });

  const [investmentBannerDismissed, setInvestmentBannerDismissed] = useState(() => {
    try {
      return typeof sessionStorage !== "undefined" && sessionStorage.getItem(INVESTMENT_PROFILE_BANNER_STORAGE) === "1";
    } catch {
      return false;
    }
  });
  const dismissInvestmentBanner = useCallback(() => {
    try {
      sessionStorage.setItem(INVESTMENT_PROFILE_BANNER_STORAGE, "1");
    } catch { /* ignore */ }
    setInvestmentBannerDismissed(true);
  }, []);

  const investmentProfileQuery = trpc.investmentProfile.get.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const showInvestmentProfileBanner =
    Boolean(user) &&
    !authLoading &&
    !investmentBannerDismissed &&
    investmentProfileQuery.isSuccess &&
    investmentProfileQuery.data === null;

  const userInitial = user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;

  const statsQuery = trpc.deals.dashboardStats.useQuery();
  const pipelineQuery = trpc.deals.listPipeline.useQuery();
  const auditQuery = trpc.logs.recentActivity.useQuery({ limit: 20 }, {
    enabled: Boolean(user),
    refetchOnWindowFocus: false,
  });

  // Investment profile + mandate fields
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
  const profile = investmentProfileQuery.data;
  const profileMandate = (profile?.mandate ?? {}) as MandateBlob;
  const profileSectors = asStringArray(
    (profileMandate.mandateSectorLabels ?? profileMandate.sectors) as unknown
  );
  const focusSectorsDisplay = profileSectors.length > 0
    ? profileSectors.join(" · ")
    : "—";

  // Build mandate items from real saved mandate fields
  const mandateItems = profile
    ? [
        { label: "CHECK SIZE", value: profileMandate.checkSize || "—" },
        { label: "TARGET IRR", value: profileMandate.targetReturn || "—" },
        { label: "HOLD PERIOD", value: profileMandate.holdPeriod || "—" },
        { label: "FOCUS SECTORS", value: focusSectorsDisplay },
      ]
    : null;

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
          <MvpTopbar.Breadcrumb segments={["Overview", "Dashboard"]} />
          <MvpTopbar.Actions>
            <Button onClick={() => navigate(ROUTES.upload)}>+ Add Deal</Button>
          </MvpTopbar.Actions>
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <PageHeader
            eyebrow="Overview / Dashboard"
            title="Investment Pipeline"
            description={new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            className="mb-6"
          />

          {showInvestmentProfileBanner ? (
            <div role="region" aria-label="Investment profile onboarding"
                 className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 dark:bg-blue-950/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Set up your investment profile</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Capture firm attribution, mandate focus, and scoring weights.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" onClick={() => navigate(ROUTES.mandateScorecardFirm)}>Open wizard</Button>
                  <Button variant="ghost" size="sm" onClick={dismissInvestmentBanner}>Dismiss</Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* KPI stat cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            <StatTile
              label="Total Deals"
              value={statsQuery.data?.totalDeals.value ?? "—"}
              trend={
                statsQuery.data
                  ? {
                      value: `${formatDelta(statsQuery.data.totalDeals.delta)} this ${statsQuery.data.window}`,
                      up: statsQuery.data.totalDeals.delta >= 0,
                    }
                  : undefined
              }
              icon={BarChart2}
              iconBg="bg-blue-100"
              iconColor="text-blue-700"
            />
            <StatTile
              label="Pipeline Value"
              value={statsQuery.data ? formatUsd(statsQuery.data.pipelineValueUsd.value) : "—"}
              sub={
                statsQuery.data
                  ? formatPipelineDelta(statsQuery.data.pipelineValueUsd.delta, statsQuery.data.window)
                  : undefined
              }
              icon={DollarSign}
              iconBg="bg-violet-100"
              iconColor="text-violet-700"
            />
            <StatTile
              label="Avg AI Score"
              value={
                statsQuery.data?.avgAiScore.value != null
                  ? (statsQuery.data.avgAiScore.value / 10).toFixed(1)
                  : "N/A"
              }
              sub="out of 10"
              icon={TrendingUp}
              iconBg="bg-amber-100"
              iconColor="text-amber-700"
            />
            <StatTile
              label="DD Completion"
              value={statsQuery.data ? `${statsQuery.data.ddCompletionPct.value}%` : "—"}
              sub={
                statsQuery.data
                  ? ddCompletionSub(
                      statsQuery.data.ddCompletionPct.value,
                      statsQuery.data.totalDeals.value,
                      statsQuery.data.ddCompletionPct.deltaPp
                    )
                  : undefined
              }
              icon={CheckCircle}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-700"
            />
          </div>

          {/* Active Investment Mandate banner */}
          {mandateItems ? (
            <ActiveMandateBanner items={mandateItems} onConfigure={() => navigate(ROUTES.mandateScorecardFirm)} />
          ) : (
            <NoMandateBanner onConfigure={() => navigate(ROUTES.mandateScorecardFirm)} />
          )}

          {/* Live Pipeline table */}
          <div className="mt-6">
            <LivePipelineTable rows={pipelineQuery.data ?? []} />
          </div>

          {/* Audit Activity */}
          <div className="mt-8">
            <AuditActivityPanel
              data={auditQuery.data}
              loading={auditQuery.isLoading}
            />
          </div>
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}

// ----- Mandate banner components -----

interface MandateItem {
  label: string;
  value: string;
}

function ActiveMandateBanner({
  items,
  onConfigure,
}: {
  items: MandateItem[];
  onConfigure: () => void;
}) {
  return (
    <section
      aria-label="Active Investment Mandate"
      className="rounded-xl bg-slate-900 text-white px-6 py-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
            Active Investment Mandate
          </span>
        </div>
        <button
          type="button"
          onClick={onConfigure}
          className="text-xs text-slate-400 hover:text-slate-200 transition"
        >
          Configure →
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              {it.label}
            </p>
            <p className="text-sm font-semibold text-slate-100">{it.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NoMandateBanner({ onConfigure }: { onConfigure: () => void }) {
  return (
    <section
      aria-label="Active Investment Mandate"
      className="rounded-xl bg-slate-900 text-white px-6 py-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
            Active Investment Mandate
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          No active mandate configured — set up your investment criteria to enable mandate fit scoring.
        </p>
        <button
          type="button"
          onClick={onConfigure}
          className="shrink-0 ml-4 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition"
        >
          Configure in Mandate &amp; Scorecard
        </button>
      </div>
    </section>
  );
}

// ----- Audit Activity Panel -----

type AuditRow = {
  id: number;
  createdAt: string;
  action: string;
  sessionId: string | null;
  jobId: string | null;
};

type AuditData = {
  total: number;
  warnings: number;
  critical: number;
  rows: AuditRow[];
};

const WARN_ACTIONS = new Set([
  "section_regenerate_scaffold",
  "section_regenerate_failed",
  "memo_deliverable_patched",
]);
const CRITICAL_ACTIONS = new Set(["auth_sign_out"]);

function classifyRow(action: string): "critical" | "warn" | "info" {
  if (CRITICAL_ACTIONS.has(action)) return "critical";
  if (WARN_ACTIONS.has(action)) return "warn";
  return "info";
}

function humaniseAction(action: string): string {
  const map: Record<string, string> = {
    memo_saved: "Memo saved",
    memo_deleted: "Memo deleted",
    memo_deliverable_regenerated: "Deliverable regenerated",
    memo_composer_regenerated: "Composer regenerated",
    memo_rescored: "Deal rescored",
    memo_deliverable_patched: "Deliverable manually edited",
    section_regenerated: "Section regenerated",
    section_regenerate_scaffold: "Section regeneration — no claims returned",
    section_regenerate_failed: "Section regeneration failed",
    attestation_submitted: "Principal attestation submitted",
    share_link_created: "Share link created",
    flag_feedback_submitted: "Flag feedback submitted",
    export_simpero_offline: "Offline export downloaded",
    export_model_card_stub: "Model card exported",
    export_diligence_issues_csv: "Diligence issues CSV exported",
    export_diligence_issues_json: "Diligence issues JSON exported",
    export_audit_log_json: "Audit log JSON exported",
    auth_sign_out: "User signed out",
  };
  return map[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function shortHash(id: number): string {
  return `#${id.toString(16).padStart(6, "0").toUpperCase()}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function AuditActivityPanel({
  data,
  loading,
}: {
  data: AuditData | undefined;
  loading: boolean;
}) {
  const recent = data?.rows.slice(0, 6) ?? [];
  const totalEvents = data?.total ?? 0;
  const warnings = data?.warnings ?? 0;
  const critical = data?.critical ?? 0;

  return (
    <section aria-label="Audit Activity" className="rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-800">Audit Activity</h2>
          {/* Live dot */}
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span className="text-xs font-medium text-emerald-600">Live</span>
          </span>
          {/* Event count */}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {totalEvents} events
          </span>
          {/* Critical badge */}
          {critical > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {critical} critical
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 hover:text-slate-600 cursor-default">
          View all
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <AuditStat icon={Activity} label="Total Events" value={totalEvents} color="text-slate-700" />
        <AuditStat icon={AlertTriangle} label="Warnings" value={warnings} color="text-amber-600" />
        <AuditStat icon={ShieldCheck} label="Critical" value={critical} color="text-red-600" />
      </div>

      {/* Event list */}
      <div className="divide-y divide-slate-50">
        {loading && (
          <div className="px-5 py-6 text-sm text-slate-400 text-center">Loading audit events…</div>
        )}
        {!loading && recent.length === 0 && (
          <div className="px-5 py-6 text-sm text-slate-400 text-center">No audit events yet.</div>
        )}
        {recent.map((row) => {
          const kind = classifyRow(row.action);
          return (
            <div key={row.id} className="flex items-start gap-3 px-5 py-3">
              <div className={cn(
                "mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                kind === "critical" ? "bg-red-100" : kind === "warn" ? "bg-amber-100" : "bg-slate-100"
              )}>
                {kind === "critical" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />
                ) : kind === "warn" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800 font-medium leading-snug">
                  {humaniseAction(row.action)}
                </p>
                {row.sessionId && (
                  <p className="text-xs text-slate-400 mt-0.5">Session: {row.sessionId}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {relativeTime(row.createdAt)}
                </p>
                <p className="text-[10px] font-mono text-slate-300 mt-0.5">{shortHash(row.id)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 rounded-b-xl border-t border-slate-100">
        <p className="text-xs text-slate-400">Events are cryptographically hashed</p>
        <span className="text-xs text-slate-400 cursor-default">Full audit log →</span>
      </div>
    </section>
  );
}

function AuditStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="px-5 py-4 flex items-center gap-3">
      <Icon className={cn("w-4 h-4 flex-shrink-0", color)} aria-hidden="true" />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
      </div>
    </div>
  );
}

// ----- Formatters -----

function formatDelta(n: number): string {
  if (n === 0) return "no change";
  return n > 0 ? `+${n}` : `${n}`;
}

function formatPipelineDelta(
  delta: number | "new" | null,
  window: string
): string | undefined {
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

function formatUsd(cents: number): string {
  const usd = cents / 100;
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}k`;
  return `$${usd.toFixed(0)}`;
}

// Suppress unused import warnings — ArrowUpRight/ArrowDownRight used in StatTile trend
void ArrowUpRight;
void ArrowDownRight;
