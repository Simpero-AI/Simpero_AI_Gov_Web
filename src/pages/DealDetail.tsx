import { useEffect, useRef, useState } from "react";
import { CitationProvider, useCitationSafe } from "@/contexts/CitationContext";
import { CitationSidebar } from "@/components/mvp/primitives/CitationSidebar";
import { Link, useSearch, useLocation } from "wouter";
import { toast } from "@/components/mvp/primitives/sonner";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Download,
  FileText,
  Loader2,
  ScrollText,
  ShieldCheck,
  Target,
  TrendingDown,
  Users,
} from "lucide-react";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { SectionHeader } from "@/components/mvp/common/SectionHeader";
import { StatusChip } from "@/components/mvp/common/StatusChip";
import { DataTableShell } from "@/components/mvp/common/DataTableShell";
import { buildMvpNav } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  dealQueryKey,
  dealStatusQueryKey,
  fetchDeal,
  fetchDealStatus,
} from "@/api/deals";
import { Button } from "@/components/mvp/primitives/button";
import { Card, CardContent } from "@/components/mvp/primitives/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/mvp/primitives/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/mvp/primitives/table";
import { AnalysisProgressView } from "@/components/mvp/analysis/AnalysisProgressView";
import { MetadataStrip } from "@/components/mvp/analysis/MetadataStrip";
import { ProvenanceGlyph } from "@/components/mvp/primitives/ProvenanceGlyph";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { DiscrepancyChip } from "@/components/mvp/primitives/DiscrepancyChip";
import { CitationRef } from "@/components/mvp/primitives/CitationRef";
import { FinancialGridRenderer } from "@/components/mvp/icMemo/FinancialGridRenderer";
import { TeamMemberCard } from "@/components/mvp/icMemo/TeamMemberCard";
import { DealHeaderCard } from "@/components/mvp/dealDetail/DealHeaderCard";
import { ScreeningTab } from "./dealDetail/ScreeningTab";
import {
  formatUsdShort,
  formatUsdLong,
  formatBpAsPct,
  formatRatio,
} from "@/lib/dealMetricsFormat";
import type { AlertRow } from "@shared/dealAnalysisShape";
import type {
  DealMetrics,
  MetricDiscrepancy,
  MetricValue,
  ICMemoResult,
} from "@shared/simperoTypes";
import { proseFieldToString } from "@shared/simperoTypes";
import type { FrameworkResult } from "@shared/complianceFrameworks";
import { buildE2eUxMemo } from "@shared/e2eUxMemoFixture";
import { SummaryTab } from "./dealAnalysis/SummaryTab";
import { ScorecardTab } from "./dealAnalysis/ScorecardTab";
import { CompanyTab } from "./dealAnalysis/CompanyTab";
import { MarketTab } from "./dealAnalysis/MarketTab";
import { FinancialsTab } from "./dealAnalysis/FinancialsTab";
import { FoundersTab } from "./dealAnalysis/FoundersTab";
import { CapTableTab } from "./dealAnalysis/CapTableTab";
import { FindingsTab } from "./dealAnalysis/FindingsTab";
import { WorkspaceTab } from "./dealAnalysis/WorkspaceTab";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { ANALYSIS_TABS, VALID_TABS, type TabKey } from "./dealAnalysis/dealAnalysisUtils";
import {
  DealScorecardPanel,
  NotConfiguredScorecard,
} from "@/components/mvp/mandate/ScoreCardBlock";
import { LogsPanel } from "@/components/mvp/analysis/LogsPanel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/mvp/primitives/sheet";

function severityTone(
  severity: AlertRow["severity"]
): "destructive" | "warning" | "info" {
  switch (severity) {
    case "Critical":
    case "High":
      return "destructive";
    case "Medium":
      return "warning";
    default:
      return "info";
  }
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "Resolved" || status === "Mitigated") return "success";
  if (status === "Monitoring") return "warning";
  return "neutral";
}

function MetricsStrip({
  items,
}: {
  items: ReadonlyArray<{ label: string; value: string; sublabel?: string }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map(item => (
        <Card key={item.label} className="overflow-hidden">
          <CardContent className="px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {item.label}
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-[24px] font-semibold leading-8 text-foreground">
                {item.value}
              </span>
              {item.sublabel ? (
                <span className="text-xs font-mono text-muted-foreground">
                  {item.sublabel}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KeyValueGrid({
  rows,
}: {
  rows: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="rounded-md border border-border bg-card px-4 py-3"
        >
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Safe nested lookup. Returns "N/A" if any segment is missing.
 *   pluck(memoData, "scorecard.matchRate") → unknown
 */
function pluck(data: unknown, path: string): unknown {
  const segments = path.split(".");
  let cur: unknown = data;
  for (const seg of segments) {
    if (cur == null || typeof cur !== "object") return "N/A";
    cur = (cur as Record<string, unknown>)[seg];
    if (cur === undefined) return "N/A";
  }
  return cur ?? "N/A";
}

function safeParseMemoJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DealMetricsStrip — typed dealMetrics block rendered at top of Financials tab
// ---------------------------------------------------------------------------

interface StripRow {
  field: keyof DealMetrics;
  label: string;
  format: (v: number) => string;
}

const STRIP_ROWS: StripRow[] = [
  {
    field: "revenueLatestUsd",
    label: "Revenue (latest)",
    format: formatUsdShort,
  },
  { field: "revenueGrowthPct", label: "Revenue Growth", format: formatBpAsPct },
  { field: "ebitdaUsd", label: "EBITDA", format: formatUsdShort },
  { field: "ebitdaMarginPct", label: "EBITDA Margin", format: formatBpAsPct },
  { field: "evRevenue", label: "EV / Revenue", format: formatRatio },
];

function DealMetricsStrip({
  metrics,
  discrepancies,
}: {
  metrics: DealMetrics;
  discrepancies: MetricDiscrepancy[];
}) {
  const citationCtx = useCitationSafe();
  const visibleRows = STRIP_ROWS.filter(r => metrics[r.field] !== undefined);
  if (visibleRows.length === 0) return null;

  const discrepancyByField = new Map(discrepancies.map(d => [d.field, d]));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Extracted Financial Metrics
      </h3>
      <ul className="divide-y divide-slate-100">
        {visibleRows.map(row => {
          const m = metrics[row.field] as MetricValue;
          const discrepancy = discrepancyByField.get(row.field);
          return (
            <li
              key={row.field}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-sm"
            >
              <span className="text-slate-700">{row.label}</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {m.value != null ? row.format(m.value) : "—"}
              </span>
              <span className="flex items-center gap-1">
                <ProvenanceGlyph source={m.source} />
                {m.citation ? (
                  <CitationRef
                    page={m.citation.page ?? null}
                    section={m.citation.section ?? null}
                    verified={!!m.citation.verified}
                    onClick={() =>
                      citationCtx?.openCitation({
                        fieldLabel: row.label,
                        citation: m.citation!,
                      })
                    }
                  />
                ) : (
                  <ProvenanceBadge
                    provenance="synthesized"
                    onClick={() =>
                      citationCtx?.openCitation({
                        fieldLabel: row.label,
                        citation: null,
                      })
                    }
                  />
                )}
                {discrepancy && <DiscrepancyChip discrepancy={discrepancy} />}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AnalysisTabs — Figma-matched 9-tab view
// ---------------------------------------------------------------------------

function useTabFromUrl(): [TabKey, (t: TabKey) => void] {
  const search = useSearch();
  const [location, setLocation] = useLocation();
  const tab = (() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab");
    if (t && VALID_TABS.has(t as TabKey)) return t as TabKey;
    return "summary" as TabKey;
  })();
  const setTab = (t: TabKey) => {
    const params = new URLSearchParams(search);
    params.set("tab", t);
    // Replace search params, preserving the path
    const path = location.split("?")[0];
    setLocation(`${path}?${params.toString()}`, { replace: true });
  };
  return [tab, setTab];
}

function AnalysisTabs({
  memoData,
  deal,
  dealId,
  sessionId,
}: {
  memoData: unknown;
  deal: {
    name: string;
    gpSource: string | null;
    sectorTags: string[];
    dealSizeMinUsd: number | null;
    dealSizeMaxUsd: number | null;
  };
  dealId: string;
  sessionId: string | null;
}) {
  const [tab, setTab] = useTabFromUrl();
  const [logsOpen, setLogsOpen] = useState(false);

  const memoTyped = memoData as Partial<ICMemoResult> | null;
  if (memoTyped && process.env.NODE_ENV === "development") {
    if (!memoTyped.sections && !memoTyped.deliverable) {
      console.warn(
        "[DealDetail] memoData present but sections and deliverable both absent — possible schema mismatch"
      );
    }
  }
  const dealMetrics = memoTyped?.dealMetrics;
  const dealMetricDiscrepancies = memoTyped?.dealMetricDiscrepancies ?? [];

  const handleGenerateMemo = () => {
    if (sessionId) {
      window.location.href = `/memo/${sessionId}`;
      return;
    }
    const seeded = buildE2eUxMemo();
    sessionStorage.setItem("simpero_memo", JSON.stringify(seeded));
    toast.info("Opened seeded memo", {
      description:
        "No active memo was available, so a report-linked demo memo was loaded.",
    });
    window.location.href = `/memo/${seeded.sessionId}`;
  };

  // Quick stat helpers
  const arrValue = (() => {
    const dm = memoTyped?.dealMetrics;
    if (dm?.revenueLatestUsd?.value != null)
      return formatUsdShort(dm.revenueLatestUsd.value);
    return "—";
  })();

  const grossMarginValue = (() => {
    const dm = memoTyped?.dealMetrics;
    if (dm?.grossMarginPct?.value != null)
      return formatBpAsPct(dm.grossMarginPct.value);
    // Fallback: search unitEconomics for a gross margin entry
    const ue = memoTyped?.deliverable?.unitEconomics?.value;
    if (Array.isArray(ue)) {
      const gm = ue.find(e => /gross.?margin/i.test(e.metric));
      if (gm?.value) return gm.value;
    }
    return "—";
  })();

  const mandateAlignmentValue = (() => {
    const sr = memoTyped?.scoringResult;
    if (!sr) return "N/A";
    if (sr.mandateDimensions.length === 0) return "N/A";
    return `${sr.mandateFitPct}%`;
  })();
  const mandateAlignmentSub = (() => {
    const sr = memoTyped?.scoringResult;
    if (!sr) return "Scorecard pending";
    if (sr.mandateDimensions.length === 0) return "No mandate set";
    return "Mandate fit score";
  })();

  const teamValue = (() => {
    const team = memoTyped?.deliverable?.managementTeam?.value;
    if (Array.isArray(team) && team.length > 0)
      return `${team.length} executives`;
    return "—";
  })();

  // Subtitle helpers for Part 1
  const subtitleParts: string[] = [];
  if (deal.sectorTags.length > 0)
    subtitleParts.push(deal.sectorTags.join(", "));
  const investmentAmountUsd =
    memoTyped?.deliverable?.investmentStructure?.investmentAmountUsd?.value;
  if (investmentAmountUsd != null) {
    subtitleParts.push(formatUsdShort(investmentAmountUsd));
  }
  const docType = memoTyped?.documentType;
  if (docType) {
    const humanDocType =
      docType === "PITCH"
        ? "Pitch"
        : docType === "CIM"
          ? "CIM"
          : docType === "SERIES_A"
            ? "Series A"
            : docType === "SERIES_B"
              ? "Series B"
              : docType === "SERIES_C"
                ? "Series C"
                : docType;
    subtitleParts.push(humanDocType);
  }
  const subtitle =
    subtitleParts.length > 0 ? subtitleParts.join(" · ") : deal.gpSource;

  return (
    <>
      <Sheet open={logsOpen} onOpenChange={setLogsOpen}>
        <SheetContent
          side="right"
          className="w-[520px] sm:max-w-[520px] p-0 flex flex-col"
        >
          <SheetHeader className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <SheetTitle>Logs — {deal.name}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <LogsPanel dealId={dealId} />
          </div>
        </SheetContent>
      </Sheet>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            Deal Analysis
          </span>
        }
        title={deal.name}
        description={subtitle}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setLogsOpen(true)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ScrollText className="mr-1.5 h-4 w-4" />
              Logs
            </Button>
            <Button
              variant="outline"
              disabled
              title="Coming soon"
              className="opacity-60 cursor-not-allowed"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={handleGenerateMemo}
              disabled={sessionId === null}
              className="bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sessionId === null ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              Generate IC Memo
            </Button>
          </>
        }
      />

      {memoTyped ? <MetadataStrip memo={memoTyped as ICMemoResult} /> : null}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            icon: Target,
            label: "Mandate Alignment",
            value: mandateAlignmentValue,
            sub: mandateAlignmentSub,
            color: "blue",
          },
          {
            icon: DollarSign,
            label: "Total Revenue",
            value: arrValue,
            sub: "From pipeline",
            color: "emerald",
          },
          {
            icon: BarChart3,
            label: "Gross Margin",
            value: grossMarginValue,
            sub: "From pipeline",
            color: "purple",
          },
          {
            icon: Users,
            label: "Management Team",
            value: teamValue,
            sub: "From memo",
            color: "amber",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl p-5 border border-slate-200"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-8 h-8 text-${stat.color}-600`} />
                <span className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-700">
                {stat.label}
              </div>
              <div className={`text-xs text-${stat.color}-600 mt-0.5`}>
                {stat.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Bar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {ANALYSIS_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => !t.soon && setTab(t.id)}
              disabled={t.soon}
              className={`px-5 py-4 text-sm whitespace-nowrap flex items-center gap-1.5 ${
                t.soon
                  ? "text-gray-300 cursor-not-allowed"
                  : tab === t.id
                    ? "border-b-2 border-emerald-600 text-emerald-600"
                    : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
              {t.soon && (
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* SUMMARY */}
          {tab === "summary" && <SummaryTab memoTyped={memoTyped} />}{" "}
          {/* SCORECARD */}
          {tab === "scorecard" && (
            <ScorecardTab
              memoTyped={memoTyped}
              sessionId={sessionId}
              dealId={dealId}
            />
          )}{" "}
          {/* COMPANY */}
          {tab === "company" && <CompanyTab memoTyped={memoTyped} />}{" "}
          {/* MARKET */}
          {tab === "market" && <MarketTab memoTyped={memoTyped} />}{" "}
          {/* FINANCIALS */}
          {tab === "financials" && (
            <FinancialsTab
              memoTyped={memoTyped}
              dealMetrics={dealMetrics}
              dealMetricDiscrepancies={dealMetricDiscrepancies}
            />
          )}{" "}
          {/* FOUNDERS */}
          {tab === "founders" && <FoundersTab memoTyped={memoTyped} />}
          {/* CAP TABLE */}
          {tab === "cap-table" && <CapTableTab memoTyped={memoTyped} />}
          {/* FINDINGS */}
          {tab === "findings" && <FindingsTab />}
          {/* DILIGENCE WORKSPACE */}
          {tab === "workspace" && (
            <WorkspaceTab memoTyped={memoTyped} dealId={dealId} sessionId={sessionId} />
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusChip status="neutral">Deal Analysis</StatusChip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/history">
              <ClipboardList className="mr-1.5 h-4 w-4" />
              Memo History
            </Link>
          </Button>
          <Button
            onClick={handleGenerateMemo}
            disabled={sessionId === null}
            className="bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sessionId === null ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-1.5 h-4 w-4" />
            )}
            Generate IC Memo
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// DealDetailTabSwitcher — the new Screening/Analysis shell tab bar (plan
// Phase 4 item 1). Distinct from AnalysisTabs' own internal 9-tab bar above.
// ---------------------------------------------------------------------------

type ShellTab = "screening" | "analysis";

function DealDetailTabSwitcher({
  tab,
  onChange,
}: {
  tab: ShellTab;
  onChange: (tab: ShellTab) => void;
}) {
  const items: Array<{ id: ShellTab; label: string }> = [
    { id: "screening", label: "Initial Screening" },
    { id: "analysis", label: "Deal Analysis" },
  ];
  return (
    <div className="mb-5 flex items-center gap-1 border-b border-[color:var(--rev-border-strong)]">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-medium ${
            tab === item.id
              ? "border-[color:var(--rev-primary)] text-[color:var(--rev-primary)]"
              : "border-transparent text-[color:var(--rev-text-5)] hover:text-[color:var(--rev-text-2)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Brief interstitial shown once, right when a deal's analysis job
 * transitions to "complete" (plan §5 Q3 — a deliberate change from the old
 * behavior of auto-revealing AnalysisTabs in place). Disappears the moment
 * the user navigates into the shell (via this button, or later from the
 * Deals table); see the `justCompleted` state in `DealDetailInner` below.
 */
function CompletionInterstitial({
  dealName,
  onViewScreening,
}: {
  dealName: string;
  onViewScreening: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-700">
          Analysis complete
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {dealName}&apos;s materials have been processed. Start with Initial
          Screening to check mandate fit before moving into full diligence.
        </p>
      </div>
      <Button onClick={onViewScreening}>View Initial Screening</Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export interface DealDetailProps {
  dealId: string;
  /** Which shell tab this route mounted on — driven by the matched route in App.tsx, not internal state. */
  tab: ShellTab;
}

export default function DealDetail({ dealId, tab }: DealDetailProps) {
  return (
    <CitationProvider>
      <DealDetailInner key={dealId} dealId={dealId} tab={tab} />
    </CitationProvider>
  );
}

function DealDetailCitationSidebar() {
  const citationCtx = useCitationSafe();
  if (!citationCtx?.active) return null;
  return (
    <CitationSidebar
      data={citationCtx.active}
      onClose={citationCtx.closeCitation}
      companyName={citationCtx.companyName ?? undefined}
    />
  );
}

function DealDetailInner({ dealId, tab }: DealDetailProps) {
  usePageTitle(tab === "screening" ? "Initial Screening" : "Deal Analysis");
  const { user } = useAuth();
  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role, isPlatformAdmin: Boolean(user?.is_platform_admin) });
  const { userInitial, userName, userRoleLabel } = useUserDisplay();
  const [, navigate] = useLocation();

  const dealQuery = useQuery({
    queryKey: dealQueryKey(dealId),
    queryFn: () => fetchDeal(dealId),
  });
  const statusQuery = useQuery({
    queryKey: dealStatusQueryKey(dealId),
    queryFn: () => fetchDealStatus(dealId),
    refetchInterval: q => {
      const data = q.state.data;
      const s = data?.jobStatus;
      // Stop immediately on any terminal state — do not wait for next cycle.
      // currentPhase === "governance" is also terminal-for-now even though
      // jobStatus stays "processing": verification succeeded and nothing
      // past governance has a job behind it yet, so nothing will ever move
      // this further -- polling forever here would just waste requests.
      if (s === "complete" || s === "error" || s === "no_job") return false;
      if (data?.currentPhase === "governance") return false;
      return s === "processing" || s === "queued" ? 2000 : false;
    },
  });

  // dealQuery (which carries the freshly persisted memoJson) doesn't poll,
  // so when the async pipeline transitions queued/processing → complete we
  // must invalidate it to pick up the new memo session in the same view —
  // otherwise the tabs render against the empty pre-pipeline snapshot and
  // the user sees N/A until they manually refresh.
  const queryClient = useQueryClient();
  const jobStatus = statusQuery.data?.jobStatus;
  const prevJobStatusRef = useRef(jobStatus);
  // Set once, the instant jobStatus flips processing/queued → complete in
  // this same mounted component (never on a fresh mount that already finds
  // the job complete) — drives the one-shot CompletionInterstitial below.
  const [justCompleted, setJustCompleted] = useState(false);
  useEffect(() => {
    const prev = prevJobStatusRef.current;
    prevJobStatusRef.current = jobStatus;
    if (
      (prev === "processing" || prev === "queued") &&
      jobStatus === "complete"
    ) {
      void queryClient.invalidateQueries({ queryKey: dealQueryKey(dealId) });
      setJustCompleted(true);
    }
  }, [jobStatus, dealId, queryClient]);

  const deal = dealQuery.data?.deal;
  const latestMemoSession = dealQuery.data?.latestMemoSession;

  const citationCtxOuter = useCitationSafe();

  // Race-window guard: if the job just became complete but the memo session
  // hasn't arrived yet (persist was slower than the client poll), retry
  // dealQuery with exponential backoff (1s, 2s, 4s, 8s, 16s, 30s, 30s…)
  // up to ~2 minutes total wait, or 30 retries maximum.
  const retryCountRef = useRef(0);
  const [isWaitingForMemo, setIsWaitingForMemo] = useState(false);

  // Backoff schedule: doubles each retry, capped at 30s
  const getBackoffMs = (attempt: number) =>
    Math.min(1000 * Math.pow(2, attempt), 30_000);

  useEffect(() => {
    if (jobStatus !== "complete" || latestMemoSession != null) {
      retryCountRef.current = 0;
      setIsWaitingForMemo(false);
      return;
    }
    if (retryCountRef.current >= 30) {
      setIsWaitingForMemo(false);
      return;
    }
    setIsWaitingForMemo(true);
    const delay = getBackoffMs(retryCountRef.current);
    const timer = setTimeout(() => {
      retryCountRef.current += 1;
      void dealQuery.refetch();
    }, delay);
    return () => clearTimeout(timer);
  }, [jobStatus, latestMemoSession, dealQuery]);
  const status = statusQuery.data;
  const memoData = latestMemoSession
    ? safeParseMemoJson(latestMemoSession.memoJson)
    : null;

  useEffect(() => {
    const memoTypedForName = memoData as Partial<ICMemoResult> | null;
    const extractedName = memoTypedForName?.entityName ?? deal?.name;
    if (extractedName && citationCtxOuter)
      citationCtxOuter.setCompanyName(extractedName);
  }, [deal?.name, memoData]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4-mode body
  let body: React.ReactNode;
  if (dealQuery.isLoading || statusQuery.isLoading) {
    body = <p className="text-sm text-muted-foreground">Loading…</p>;
  } else if (!deal) {
    body = (
      <div className="mx-auto max-w-md px-6 py-12 text-center text-sm text-muted-foreground">
        This deal doesn&apos;t exist or isn&apos;t accessible to you.
        <div className="mt-4">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  } else if (status?.jobStatus === "no_job") {
    body = (
      <div className="mx-auto max-w-md px-6 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-700">
            No documents uploaded yet
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Upload your deal materials to start the analysis pipeline.
          </p>
        </div>
        <Button asChild>
          <Link href={`/new-deal?dealId=${dealId}`}>Upload documents</Link>
        </Button>
      </div>
    );
  } else if (status?.jobStatus === "error") {
    body = (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {status.errorMessage ??
            "The analysis pipeline failed. Re-upload to retry."}
        </div>
        <div className="mt-6">
          <AnalysisProgressView
            fileName={latestMemoSession?.fileName ?? "Unknown"}
            steps={status.steps}
            startedAt={status.startedAt}
            endedAt={status.endedAt}
            stepDurations={status.stepDurations}
            jobComments={status.jobComments}
          />
        </div>
        <div className="mt-6 text-center">
          <Button asChild>
            <Link href={`/new-deal?dealId=${dealId}`}>Re-upload documents</Link>
          </Button>
        </div>
      </div>
    );
  } else if (
    status?.jobStatus === "queued" ||
    status?.jobStatus === "processing"
  ) {
    body = (
      <AnalysisProgressView
        fileName={latestMemoSession?.fileName ?? deal.name}
        steps={status.steps}
        startedAt={status.startedAt}
        endedAt={status.endedAt}
        stepDurations={status.stepDurations}
        jobComments={status.jobComments}
      />
    );
  } else if (isWaitingForMemo) {
    body = (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold text-slate-700">
          Still loading results…
        </p>
        <p className="text-xs text-slate-500">
          The analysis finished — retrieving your memo. This may take a moment.
        </p>
      </div>
    );
  } else if (justCompleted) {
    // One-shot completion interstitial (plan §5 Q3) — replaces the old
    // behavior of dropping straight into AnalysisTabs the instant the job
    // finishes. Only fires on the live processing/queued → complete
    // transition; a fresh visit to an already-complete deal skips straight
    // to the tab shell below.
    body = (
      <CompletionInterstitial
        dealName={deal.name}
        onViewScreening={() => navigate(`/deals/${dealId}/screening`)}
      />
    );
  } else {
    // complete
    // Use dealMetrics presence as the modern-memo signal. Banner fires when
    // we have a real memo but no structured deal metrics yet (e.g. older
    // memos generated before typed metrics existed, or runs where extraction
    // produced no fields).
    const memoTypedOuter = memoData as Partial<ICMemoResult> | null;
    const hasRealShape =
      Array.isArray(pluck(memoData, "sections")) &&
      (pluck(memoData, "sections") as unknown[]).length > 0;
    const dealMetrics = (
      memoData as { dealMetrics?: Record<string, unknown> } | null
    )?.dealMetrics;
    const hasStructuredMetrics =
      dealMetrics != null && Object.keys(dealMetrics).length > 0;
    const showPass3FailedBanner =
      latestMemoSession != null && !!memoTypedOuter?.pass3Failed;
    const showSchemaMismatchBanner =
      latestMemoSession != null &&
      memoTypedOuter != null &&
      ((hasRealShape && !hasStructuredMetrics) ||
        (!memoTypedOuter.deliverable && !memoTypedOuter.pass3Failed));

    const sectorTags = (() => {
      try {
        return JSON.parse(deal.sectorTags) as string[];
      } catch {
        return [];
      }
    })();

    body = (
      <>
        <DealHeaderCard
          name={deal.name}
          gpSource={deal.gpSource}
          sectorTags={sectorTags}
          state={deal.state}
          dealSizeMinUsd={deal.dealSizeMinUsd ?? null}
          dealSizeMaxUsd={deal.dealSizeMaxUsd ?? null}
        />
        <DealDetailTabSwitcher
          tab={tab}
          onChange={t => navigate(`/deals/${dealId}/${t}`)}
        />
        {tab === "screening" ? (
          <ScreeningTab fileName={latestMemoSession?.fileName ?? null} />
        ) : (
          <>
            {showPass3FailedBanner && (
              <div
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                data-testid="analysis-pass3-failed-banner"
              >
                <div className="font-medium mb-1">
                  Analysis composition incomplete
                </div>
                <div className="text-xs text-amber-800/80">
                  The final memo could not be assembled from the extracted
                  evidence. Try regenerating or contact support if this
                  persists.
                </div>
              </div>
            )}
            {!showPass3FailedBanner && showSchemaMismatchBanner && (
              <div
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                data-testid="analysis-preview-banner"
              >
                <div className="font-medium mb-1">
                  Preview view — the polished IC Memo layout is shipping next.
                </div>
                <div className="text-xs text-amber-800/80">
                  The deal-analysis tabs below are a preview while the polished
                  IC memo deliverable view lands. The pipeline produced{" "}
                  <strong>
                    {(pluck(memoData, "scorecard.claimsExtracted") as
                      | number
                      | undefined) ?? "—"}
                  </strong>{" "}
                  claims,{" "}
                  <strong>
                    {(pluck(memoData, "scorecard.matchRate") as
                      | number
                      | undefined) ?? "—"}
                    %
                  </strong>{" "}
                  verification rate.
                </div>
                <Link
                  href={`/memo/${latestMemoSession.sessionId}/ledger`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Open verification ledger
                </Link>
              </div>
            )}
            <AnalysisTabs
              memoData={memoData}
              deal={{
                name: deal.name,
                gpSource: deal.gpSource,
                sectorTags,
                dealSizeMinUsd: deal.dealSizeMinUsd ?? null,
                dealSizeMaxUsd: deal.dealSizeMaxUsd ?? null,
              }}
              dealId={dealId}
              sessionId={latestMemoSession?.sessionId ?? null}
            />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <MvpAppShell>
        <MvpAppShell.Sidebar>
          <MvpSidebar aria-label="Primary navigation">
            <MvpFundSelector aria-label="Workspace selector" />
            <MvpNavRenderer nav={nav} />
          </MvpSidebar>
        </MvpAppShell.Sidebar>

        <MvpAppShell.Topbar>
          <MvpTopbar>
            <MvpTopbar.Breadcrumb
              segments={["Deal Flow", tab === "screening" ? "Initial Screening" : "Deal Analysis"]}
            />
            <MvpTopbar.QuickSearch aria-label="Open quick search" />
            <MvpTopbar.Notifications aria-label="Notifications" />
            <MvpTopbar.Avatar
              initial={userInitial}
              name={userName}
              role={userRoleLabel}
              aria-label="Account menu"
            />
          </MvpTopbar>
        </MvpAppShell.Topbar>

        <MvpAppShell.Main>
          <PageContainer>
            <div className="space-y-6">
              {/* When in complete mode (and not the one-shot completion
                interstitial) the DealHeaderCard + shell tab switcher own the
                header; AnalysisTabs additionally renders its own internal
                header for its action buttons (Logs/Export/Generate Memo).
                For no_job mode we render a minimal header without the deal
                name to avoid giving the impression that analysis is ready.
                For all other (unchanged) modes we render a standard header. */}
              {status?.jobStatus !== "complete" &&
                status?.jobStatus !== "no_job" && (
                  <PageHeader
                    eyebrow="Deal Flow / Deal Analysis"
                    title={deal?.name ?? "Loading…"}
                    description={deal?.gpSource ?? ""}
                    className="mb-6"
                  />
                )}
              {status?.jobStatus === "no_job" && (
                <PageHeader
                  eyebrow="Deal Flow / Deal Analysis"
                  title="New Deal"
                  description="Start by uploading your deal documents."
                  className="mb-6"
                />
              )}
              {body}
            </div>
          </PageContainer>
        </MvpAppShell.Main>
      </MvpAppShell>
      <DealDetailCitationSidebar />
    </>
  );
}
