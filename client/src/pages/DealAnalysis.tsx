import { useEffect, useMemo, useRef, useState } from "react";
import { CitationProvider, useCitationSafe, useCitation } from "@/contexts/CitationContext";
import { CitationSidebar } from "@/components/mvp/primitives/CitationSidebar";
import { Link, useSearch, useLocation } from "wouter";
import { toast } from "@/components/mvp/primitives/sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  Building,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Info,
  Loader2,
  ScrollText,
  Shield,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
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
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/mvp/primitives/button";
import { Card, CardContent } from "@/components/mvp/primitives/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/mvp/primitives/tabs";
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
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { FinancialGridRenderer } from "@/components/mvp/icMemo/FinancialGridRenderer";
import { TeamMemberCard } from "@/components/mvp/icMemo/TeamMemberCard";
import { formatUsdShort, formatUsdLong, formatBpAsPct, formatRatio } from "@/lib/dealMetricsFormat";
import type { AlertRow } from "@shared/dealAnalysisShape";
import type {
  Citation,
  DealMetrics,
  MetricDiscrepancy,
  MetricValue,
  ICMemoResult,
  GovernanceFlag,
  OFACEntityResult,
} from "@shared/simperoTypes";
import { proseFieldToString } from "@shared/simperoTypes";
import type { FrameworkResult } from "@shared/complianceFrameworks";
import { buildE2eUxMemo } from "../../../shared/e2eUxMemoFixture";
import { SummaryTab } from "./dealAnalysis/SummaryTab";
import { ScorecardTab } from "./dealAnalysis/ScorecardTab";
import { FinancialsTab } from "./dealAnalysis/FinancialsTab";
import { RisksTab } from "./dealAnalysis/RisksTab";
import { ParserVerificationTab } from "./dealAnalysis/ParserVerificationTab";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { VALID_TABS, type TabKey } from "./dealAnalysis/dealAnalysisUtils";
import { DealScorecardPanel, NotConfiguredScorecard } from "@/components/mvp/mandate/ScoreCardBlock";
import { LogsPanel } from "@/components/mvp/analysis/LogsPanel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/mvp/primitives/sheet";

// ---------------------------------------------------------------------------
// Triangulation helpers (mirroring the Figma reference design)
// ---------------------------------------------------------------------------

type TriStatus = "verified" | "partial" | "unverified";

const TRI_CFG: Record<
  TriStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    pillBg: string;
    pillText: string;
    pillBorder: string;
    rowBg: string;
    label: string;
  }
> = {
  verified: {
    icon: CheckCircle,
    pillBg: "bg-emerald-100",
    pillText: "text-emerald-700",
    pillBorder: "border-emerald-300",
    rowBg: "",
    label: "Verified",
  },
  partial: {
    icon: AlertTriangle,
    pillBg: "bg-amber-100",
    pillText: "text-amber-700",
    pillBorder: "border-amber-300",
    rowBg: "bg-amber-50/40",
    label: "Partial",
  },
  unverified: {
    icon: X,
    pillBg: "bg-red-100",
    pillText: "text-red-700",
    pillBorder: "border-red-300",
    rowBg: "bg-red-50/40",
    label: "Unverified",
  },
};

function StatusPill({ status, onClick }: { status: TriStatus; onClick?: () => void }) {
  const { icon: Icon, pillBg, pillText, pillBorder, label } = TRI_CFG[status];
  const cls = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${pillBg} ${pillText} ${pillBorder}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} cursor-pointer hover:opacity-80 transition-opacity`}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        {label}
      </button>
    );
  }
  return (
    <span className={cls}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {label}
    </span>
  );
}

function SourceChip({ label, url }: { label: string; url?: string }) {
  const inner = (
    <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors">
      {label}
      {url && <ExternalLink className="w-3 h-3 flex-shrink-0" />}
    </span>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <span className="text-xs text-gray-500">{label}</span>
  );
}

interface DataRow {
  field: string;
  value: string;
  sources: Array<{ label: string; url?: string }>;
  status: TriStatus;
  note?: string;
  citation?: Citation;
}

function TriangulatedCard({
  icon: Icon,
  iconColor,
  title,
  rows,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  rows: DataRow[];
}) {
  const citationCtx = useCitationSafe();
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.6fr)] text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
        <span>Field</span>
        <span>Value</span>
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Source &amp; Verification
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((row, i) => {
          const { rowBg } = TRI_CFG[row.status];
          // Always open the sidebar — pass null when no source citation exists (synthesized)
          const handleCitationClick = citationCtx
            ? () => citationCtx.openCitation({ fieldLabel: row.field, citation: row.citation ?? null })
            : undefined;
          return (
            <div
              key={i}
              className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.6fr)] items-start px-4 py-2.5 ${rowBg}`}
            >
              <span className="text-xs text-gray-500 pt-0.5">{row.field}</span>
              <span className="text-xs font-medium text-gray-900 pr-2">{row.value}</span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <StatusPill status={row.status} onClick={handleCitationClick} />
                  <div className="flex items-center gap-1 flex-wrap">
                    {row.sources.map((s, j) => (
                      <span key={j} className="inline-flex items-center gap-1">
                        {j > 0 && <span className="text-gray-300 text-xs">·</span>}
                        <SourceChip label={s.label} url={s.url} />
                      </span>
                    ))}
                  </div>
                </div>
                {row.note && (
                  <span className="text-[10px] text-gray-400 italic">{row.note}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function severityTone(severity: AlertRow["severity"]): "destructive" | "warning" | "info" {
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
      {items.map((item) => (
        <Card key={item.label} className="overflow-hidden">
          <CardContent className="px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {item.label}
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-[24px] font-semibold leading-8 text-foreground">{item.value}</span>
              {item.sublabel ? (
                <span className="text-xs font-mono text-muted-foreground">{item.sublabel}</span>
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
        <div key={label} className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
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
  { field: "revenueLatestUsd", label: "Revenue (latest)", format: formatUsdShort },
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
  const visibleRows = STRIP_ROWS.filter((r) => metrics[r.field] !== undefined);
  if (visibleRows.length === 0) return null;

  const discrepancyByField = new Map(discrepancies.map((d) => [d.field, d]));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Extracted Financial Metrics
      </h3>
      <ul className="divide-y divide-slate-100">
        {visibleRows.map((row) => {
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
                      citationCtx?.openCitation({ fieldLabel: row.label, citation: m.citation! })
                    }
                  />
                ) : (
                  <ProvenanceBadge
                    provenance="synthesized"
                    onClick={() =>
                      citationCtx?.openCitation({ fieldLabel: row.label, citation: null })
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

const ANALYSIS_TABS: Array<{ id: TabKey; label: string; soon?: boolean }> = [
  { id: "summary", label: "Summary" },
  { id: "scorecard", label: "Scorecard" },
  { id: "company", label: "Company" },
  { id: "financials", label: "Financials" },
  { id: "founders", label: "Founders" },
  { id: "cap-table", label: "Cap Table", soon: true },
  { id: "market", label: "Market" },
  { id: "risks", label: "Risks" },
  { id: "valuation", label: "Valuation", soon: true },
];

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
    gpSource: string;
    sectorTags: string[];
    dealSizeMinUsd: number | null;
    dealSizeMaxUsd: number | null;
  };
  dealId: number;
  sessionId: string | null;
}) {
  const [tab, setTab] = useTabFromUrl();
  const { user } = useAuth();
  const [expandedRisk, setExpandedRisk] = useState<number | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const citationCtx = useCitationSafe();

  const memoTyped = memoData as Partial<ICMemoResult> | null;
  if (memoTyped && process.env.NODE_ENV === "development") {
    if (!memoTyped.sections && !memoTyped.deliverable) {
      console.warn(
        "[DealAnalysis] memoData present but sections and deliverable both absent — possible schema mismatch",
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
      description: "No active memo was available, so a report-linked demo memo was loaded.",
    });
    window.location.href = `/memo/${seeded.sessionId}`;
  };

  // Quick stat helpers
  const arrValue = (() => {
    const dm = memoTyped?.dealMetrics;
    if (dm?.revenueLatestUsd?.value != null) return formatUsdShort(dm.revenueLatestUsd.value);
    return "—";
  })();

  const grossMarginValue = (() => {
    const dm = memoTyped?.dealMetrics;
    if (dm?.grossMarginPct?.value != null) return formatBpAsPct(dm.grossMarginPct.value);
    // Fallback: search unitEconomics for a gross margin entry
    const ue = memoTyped?.deliverable?.unitEconomics?.value;
    if (Array.isArray(ue)) {
      const gm = ue.find((e) => /gross.?margin/i.test(e.metric));
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
    if (Array.isArray(team) && team.length > 0) return `${team.length} executives`;
    return "—";
  })();

  // Subtitle helpers for Part 1
  const subtitleParts: string[] = [];
  if (deal.sectorTags.length > 0) subtitleParts.push(deal.sectorTags.join(", "));
  const investmentAmountUsd = memoTyped?.deliverable?.investmentStructure?.investmentAmountUsd?.value;
  if (investmentAmountUsd != null) {
    subtitleParts.push(formatUsdShort(investmentAmountUsd));
  }
  const docType = memoTyped?.documentType;
  if (docType) {
    const humanDocType =
      docType === "PITCH" ? "Pitch" :
      docType === "CIM" ? "CIM" :
      docType === "SERIES_A" ? "Series A" :
      docType === "SERIES_B" ? "Series B" :
      docType === "SERIES_C" ? "Series C" :
      docType;
    subtitleParts.push(humanDocType);
  }
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : deal.gpSource;

  return (
    <>
      <Sheet open={logsOpen} onOpenChange={setLogsOpen}>
        <SheetContent side="right" className="w-[520px] sm:max-w-[520px] p-0 flex flex-col">
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
            <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
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
          { icon: Target, label: "Mandate Alignment", value: mandateAlignmentValue, sub: mandateAlignmentSub, color: "blue" },
          { icon: DollarSign, label: "Total Revenue", value: arrValue, sub: "From pipeline", color: "emerald" },
          { icon: BarChart3, label: "Gross Margin", value: grossMarginValue, sub: "From pipeline", color: "purple" },
          { icon: Users, label: "Management Team", value: teamValue, sub: "From memo", color: "amber" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-8 h-8 text-${stat.color}-600`} />
                <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
              </div>
              <div className="text-sm font-medium text-slate-700">{stat.label}</div>
              <div className={`text-xs text-${stat.color}-600 mt-0.5`}>{stat.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Tab Bar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {ANALYSIS_TABS.filter((t) => t.id !== "parser-verification" || user?.role === "admin").map((t) => (
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
          {tab === "summary" && (
            <SummaryTab memoTyped={memoTyped} onSelectTab={setTab} />
          )}          {/* SCORECARD */}
          {tab === "scorecard" && (
            <ScorecardTab memoTyped={memoTyped} sessionId={sessionId} dealId={dealId} />
          )}          {/* COMPANY */}
          {tab === "company" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 px-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Triangulation key:</span>
                {(["verified", "partial", "unverified"] as TriStatus[]).map((s) => <StatusPill key={s} status={s} />)}
              </div>

              {(() => {
                const co = memoTyped?.deliverable?.companyOverview;
                if (!co) {
                  return <MissingDataPlaceholder gapRef="G-42" />;
                }
                const v = co;
                const getStatus = (provenance?: string, citation?: Citation): TriStatus => {
                  if (provenance === "missing") return "unverified";
                  if (provenance === "extracted" && citation?.verified) return "verified";
                  if (provenance === "extracted") return "partial"; // extracted but TF-IDF unverified
                  return "partial";
                };
                const rows: DataRow[] = [
                  { field: "Founded", value: v.foundedDate?.value != null ? String(v.foundedDate.value) : "—", status: getStatus(v.foundedDate?.provenance, v.foundedDate?.citation ?? undefined), sources: [{ label: v.foundedDate?.citation ? "Document" : "Source pending" }], citation: v.foundedDate?.citation ?? undefined },
                  { field: "HQ Location", value: v.hqLocation?.value != null ? String(v.hqLocation.value) : "—", status: getStatus(v.hqLocation?.provenance, v.hqLocation?.citation ?? undefined), sources: [{ label: v.hqLocation?.citation ? "Document" : "Source pending" }], citation: v.hqLocation?.citation ?? undefined },
                  { field: "Employees", value: v.employees?.value != null ? String(v.employees.value) : "—", status: getStatus(v.employees?.provenance, v.employees?.citation ?? undefined), sources: [{ label: v.employees?.citation ? "Document" : "Source pending" }], citation: v.employees?.citation ?? undefined },
                ];
                return <TriangulatedCard icon={Building} iconColor="text-blue-600" title="Company Information" rows={rows} />;
              })()}

              {/* Products */}
              {(() => {
                const co = memoTyped?.deliverable?.companyOverview;
                const products = co?.products;
                return (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <Zap className="w-5 h-5 text-amber-600" />
                      <span className="font-semibold text-gray-900 text-sm">Products</span>
                      {products && products.provenance !== "missing" && (
                        <ProvenanceBadge
                          provenance={products.provenance}
                          citationVerified={products.citation?.verified}
                          onClick={() => citationCtx?.openCitation({ fieldLabel: "Products", citation: products.citation ?? null })}
                        />
                      )}
                    </div>
                    {!products || products.provenance === "missing" || !products.value?.length ? (
                      <div className="px-4 py-4"><MissingDataPlaceholder /></div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {(products.value as Array<{ name: string; description: string }>).map((p, i) => (
                          <div key={i} className="px-4 py-3">
                            <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Revenue Mix */}
              {(() => {
                const co = memoTyped?.deliverable?.companyOverview;
                const revMix = co?.revenueMix;
                return (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold text-gray-900 text-sm">Revenue Mix</span>
                      {revMix && revMix.provenance !== "missing" && (
                        <ProvenanceBadge
                          provenance={revMix.provenance}
                          citationVerified={revMix.citation?.verified}
                          onClick={() => citationCtx?.openCitation({ fieldLabel: "Revenue Mix", citation: revMix.citation ?? null })}
                        />
                      )}
                    </div>
                    {!revMix || revMix.provenance === "missing" || !revMix.value?.length ? (
                      <div className="px-4 py-4"><MissingDataPlaceholder /></div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {(revMix.value as Array<{ label: string; pct: number }>).map((r, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-xs text-gray-700">{r.label}</span>
                            <span className="text-xs font-semibold text-gray-900">{r.pct}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* OFAC Screening */}
              {(() => {
                const ofac = memoTyped?.ofac_screening;
                if (!ofac) return null;
                const overall = ofac.confirmedMatches > 0 ? "confirmed"
                  : ofac.possibleMatches > 0 ? "possible"
                  : ofac.screeningAvailable ? "clear"
                  : "unavailable";
                const hdrCfg = overall === "confirmed"
                  ? { bg: "bg-red-50", border: "border-red-300", icon: AlertTriangle, iconCls: "text-red-600", title: "OFAC — Confirmed Match", titleCls: "text-red-800" }
                  : overall === "possible"
                  ? { bg: "bg-amber-50", border: "border-amber-300", icon: AlertTriangle, iconCls: "text-amber-600", title: "OFAC — Possible Match", titleCls: "text-amber-800" }
                  : overall === "clear"
                  ? { bg: "bg-emerald-50", border: "border-emerald-200", icon: ShieldCheck, iconCls: "text-emerald-600", title: "OFAC Screening — Clear", titleCls: "text-emerald-800" }
                  : { bg: "bg-gray-50", border: "border-gray-200", icon: Shield, iconCls: "text-gray-500", title: "OFAC Screening — Unavailable", titleCls: "text-gray-700" };
                const HdrIcon = hdrCfg.icon;
                return (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${hdrCfg.border} ${hdrCfg.bg}`}>
                      <HdrIcon className={`w-5 h-5 ${hdrCfg.iconCls}`} />
                      <span className={`font-semibold text-sm ${hdrCfg.titleCls}`}>{hdrCfg.title}</span>
                      <span className="ml-auto text-[10px] text-gray-400">
                        Screened {new Date(ofac.screenedAt).toLocaleDateString()} · {ofac.entitiesScreened} entit{ofac.entitiesScreened === 1 ? "y" : "ies"}
                      </span>
                    </div>
                    {ofac.results.length > 0 && (
                      <div className="divide-y divide-gray-100">
                        {(ofac.results as OFACEntityResult[]).map((r, i) => {
                          const sCfg = r.status === "CONFIRMED_MATCH"
                            ? { chip: "bg-red-100 text-red-700", dot: "bg-red-500" }
                            : r.status === "POSSIBLE_MATCH"
                            ? { chip: "bg-amber-100 text-amber-700", dot: "bg-amber-500" }
                            : r.status === "CLEAR"
                            ? { chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" }
                            : { chip: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
                          return (
                            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${sCfg.dot}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{r.entity}</p>
                                {r.matchedName && r.matchedName !== r.entity && (
                                  <p className="text-[10px] text-gray-500">Matched: {r.matchedName}</p>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 capitalize shrink-0">{r.entityType}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide shrink-0 ${sCfg.chip}`}>
                                {r.status === "CONFIRMED_MATCH" ? "Match" : r.status === "POSSIBLE_MATCH" ? "Possible" : r.status === "CLEAR" ? "Clear" : "N/A"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!ofac.screeningAvailable && (
                      <p className="px-4 py-3 text-xs text-gray-500">OFAC screening service unavailable at processing time.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* FINANCIALS */}
          {tab === "financials" && (
            <FinancialsTab memoTyped={memoTyped} dealMetrics={dealMetrics} dealMetricDiscrepancies={dealMetricDiscrepancies} />
          )}          {/* FOUNDERS */}
          {tab === "founders" && (
            <div className="space-y-5">

              {(() => {
                const team = memoTyped?.deliverable?.managementTeam;
                if (!team || team.provenance === "missing" || !team.value?.length) {
                  return <MissingDataPlaceholder />;
                }
                const founderClaims = (memoTyped?.sections ?? []).flatMap(s => s.claims ?? []);
                const avatarColors = [
                  { bg: "bg-blue-100", text: "text-blue-600" },
                  { bg: "bg-purple-100", text: "text-purple-600" },
                  { bg: "bg-emerald-100", text: "text-emerald-600" },
                  { bg: "bg-amber-100", text: "text-amber-600" },
                ];
                return (
                  <>
                    {/* Section header with citation badge */}
                    <div className="flex items-center gap-2 px-1">
                      <GraduationCap className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Management Team</span>
                      <ProvenanceBadge
                        provenance={team.provenance}
                        citationVerified={team.citation?.verified}
                        onClick={() => citationCtx?.openCitation({ fieldLabel: "Management Team", citation: team.citation ?? null })}
                      />
                    </div>
                    {(team.value as Array<{ name: string; title: string; background: string | import("@shared/simperoTypes").SourcedSentence[]; keyAchievement?: string | import("@shared/simperoTypes").SourcedSentence[] }>).map((member, fi) => {
                      const ac = avatarColors[fi % avatarColors.length];
                      return (
                        <div key={fi} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-gradient-to-br from-white to-gray-50">
                            <div className="flex items-start gap-4">
                              <div className={`w-14 h-14 ${ac.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                                <Users className={`w-7 h-7 ${ac.text}`} />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-gray-900">{member.name}</h4>
                                <p className="text-sm text-gray-600">{member.title}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-5 space-y-4">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Background</p>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {member.background
                                  ? <ProseWithClaims content={member.background} claims={founderClaims} />
                                  : "—"}
                              </p>
                            </div>
                            {member.keyAchievement && (
                              <div className="border-l-4 border-emerald-500 pl-4 py-0.5">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Key Achievement</p>
                                <p className="text-sm font-medium text-gray-800">
                                  <ProseWithClaims content={member.keyAchievement} claims={founderClaims} />
                                </p>
                              </div>
                            )}
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Background Checks</p>
                              <p className="text-xs text-gray-400 italic">
                                Background check data coming soon — identity, employment history, education verification, and criminal record checks will appear here.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {/* Board */}
              {(() => {
                const board = memoTyped?.deliverable?.board;
                if (!board || board.provenance === "missing" || !board.value?.length) return null;
                return (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900 text-sm">Board Members</span>
                      <ProvenanceBadge
                        provenance={board.provenance}
                        citationVerified={board.citation?.verified}
                        onClick={() => citationCtx?.openCitation({ fieldLabel: "Board Members", citation: board.citation ?? null })}
                      />
                    </div>
                    <div className="divide-y divide-gray-100">
                      {(board.value as Array<{ name: string; role: string }>).map((b, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm font-semibold text-gray-900">{b.name}</span>
                          <span className="text-xs text-gray-500">{b.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* CAP TABLE */}
          {tab === "cap-table" && (
            <div className="flex flex-col items-center py-16 gap-3 text-center">
              <p className="text-sm font-medium text-slate-600">Cap Table coming soon</p>
              <p className="text-xs text-slate-400">Fully diluted ownership breakdown will appear here once the pipeline extracts it.</p>
            </div>
          )}

          {/* MARKET */}
          {tab === "market" && (
            <div className="space-y-6">
              {(() => {
                const mc = memoTyped?.deliverable?.marketCompetitive;
                if (!mc) {
                  return <MissingDataPlaceholder gapRef="G-42" />;
                }
                const v = mc;
                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "TAM", desc: "Total Addressable Market", sourced: v.tamUsd },
                        { label: "SAM", desc: "Serviceable Addressable Market", sourced: v.samUsd },
                        { label: "SOM", desc: "Serviceable Obtainable Market", sourced: v.somUsd },
                      ].map((m, i) => {
                        return (
                          <div key={i} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="text-sm text-blue-700 font-semibold">{m.label}</div>
                            <div className="text-3xl text-blue-900 my-1">
                              {m.sourced ? (
                                <SourcedValue
                                  sourced={m.sourced}
                                  format={(val) => val != null ? formatUsdShort(val as number) : "—"}
                                  fieldLabel={`${m.label} — ${m.desc}`}
                                />
                              ) : "—"}
                            </div>
                            <div className="text-xs text-blue-600 mb-2">{m.desc}</div>
                          </div>
                        );
                      })}
                    </div>

                    {v.growthCagrPct && v.growthCagrPct.provenance !== "missing" && (
                      <div className="border border-slate-200 rounded-lg px-5 py-3 bg-slate-50 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Market Growth CAGR</span>
                        <span className="text-lg font-bold text-slate-900">
                          <SourcedValue sourced={v.growthCagrPct} format={(val) => val != null ? formatBpAsPct(val as number) : "—"} />
                        </span>
                      </div>
                    )}

                    {/* Market Dynamics placeholder */}
                    <div className="border-t pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />Market Dynamics
                      </h3>
                      <div className="border border-slate-200 rounded-lg px-5 py-6 bg-slate-50 flex flex-col items-center text-center gap-2">
                        <Info className="w-6 h-6 text-slate-400" />
                        <p className="text-sm font-medium text-slate-600">AI-driven market dynamics insights coming soon</p>
                        <p className="text-xs text-slate-400">Growth drivers, market risks, and competitive dynamics will be auto-generated here.</p>
                      </div>
                    </div>

                    {/* Competitive Landscape */}
                    <div className="border-t pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-600" />Competitive Landscape
                        {v.competitors && v.competitors.provenance !== "missing" && (
                          <ProvenanceBadge
                            provenance={v.competitors.provenance}
                            citationVerified={v.competitors.citation?.verified}
                            onClick={() => citationCtx?.openCitation({ fieldLabel: "Competitive Landscape", citation: v.competitors.citation ?? null })}
                          />
                        )}
                      </h3>
                      {!v.competitors || v.competitors?.provenance === "missing" || !v.competitors?.value?.length ? (
                        <MissingDataPlaceholder />
                      ) : (
                        <div className="space-y-3">
                          {(v.competitors.value as Array<{ name: string; weakness?: string; winRatePct?: number }>).map((c, i) => (
                            <div key={i} className="border rounded-lg p-4 bg-white">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-gray-900">{c.name}</span>
                                {c.winRatePct !== undefined && (
                                  <span className="text-xs font-semibold text-emerald-700">Win rate: {formatBpAsPct(c.winRatePct)}</span>
                                )}
                              </div>
                              {c.weakness && <p className="text-xs text-gray-500">{c.weakness}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {v.competitiveAdvantage && v.competitiveAdvantage.provenance !== "missing" && (
                        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                          <strong>Competitive Advantage:</strong>{" "}
                          <SourcedValue sourced={v.competitiveAdvantage} />
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* RISKS */}
          {tab === "risks" && (
            <RisksTab memoTyped={memoTyped} />
          )}

          {/* VALUATION (SOON) */}
          {tab === "valuation" && (
            <div className="flex flex-col items-center py-16 gap-3 text-center">
              <p className="text-sm font-medium text-slate-600">Valuation analysis coming soon</p>
              <p className="text-xs text-slate-400">Industry comparables, precedent transactions, and portfolio benchmarks will appear here.</p>
            </div>
          )}

          {/* PARSER VERIFICATION */}
          {tab === "parser-verification" && user?.role === "admin" && (
            <ParserVerificationTab sessionId={sessionId} />
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
// Page component
// ---------------------------------------------------------------------------

export interface DealAnalysisProps {
  dealId: number;
}

export default function DealAnalysis({ dealId }: DealAnalysisProps) {
  return (
    <CitationProvider>
      <DealAnalysisInner dealId={dealId} />
    </CitationProvider>
  );
}

function DealAnalysisCitationSidebar() {
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

function DealAnalysisInner({ dealId }: DealAnalysisProps) {
  usePageTitle("Deal Analysis");
  const { user } = useAuth();
  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role });
  const { userInitial, userName, userRoleLabel } = useUserDisplay();

  const dealQuery = trpc.deals.get.useQuery({ dealId });
  const statusQuery = trpc.deals.status.useQuery(
    { dealId },
    {
      refetchInterval: (q) => {
        const s = q.state.data?.jobStatus;
        // Stop immediately on any terminal state — do not wait for next cycle
        if (s === "complete" || s === "error" || s === "no_job") return false;
        return s === "processing" || s === "queued" ? 2000 : false;
      },
    }
  );

  // dealQuery (which carries the freshly persisted memoJson) doesn't poll,
  // so when the async pipeline transitions queued/processing → complete we
  // must invalidate it to pick up the new memo session in the same view —
  // otherwise the tabs render against the empty pre-pipeline snapshot and
  // the user sees N/A until they manually refresh.
  const utils = trpc.useUtils();
  const jobStatus = statusQuery.data?.jobStatus;
  const prevJobStatusRef = useRef(jobStatus);
  useEffect(() => {
    const prev = prevJobStatusRef.current;
    prevJobStatusRef.current = jobStatus;
    if ((prev === "processing" || prev === "queued") && jobStatus === "complete") {
      void utils.deals.get.invalidate({ dealId });
    }
  }, [jobStatus, dealId, utils]);

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
    if (extractedName && citationCtxOuter) citationCtxOuter.setCompanyName(extractedName);
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
          <p className="text-base font-semibold text-slate-700">No documents uploaded yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Upload your deal materials to start the analysis pipeline.
          </p>
        </div>
        <Button asChild>
          <Link href={`/upload?dealId=${dealId}`}>Upload documents</Link>
        </Button>
      </div>
    );
  } else if (status?.jobStatus === "error") {
    body = (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {status.errorMessage ?? "The analysis pipeline failed. Re-upload to retry."}
        </div>
        <div className="mt-6">
          <AnalysisProgressView
            fileName={latestMemoSession?.fileName ?? "Unknown"}
            steps={status.steps}
            phaseProgress={status.phaseProgress}
          />
        </div>
        <div className="mt-6 text-center">
          <Button asChild>
            <Link href={`/upload?dealId=${dealId}`}>Re-upload documents</Link>
          </Button>
        </div>
      </div>
    );
  } else if (status?.jobStatus === "queued" || status?.jobStatus === "processing") {
    body = (
      <AnalysisProgressView
        fileName={latestMemoSession?.fileName ?? deal.name}
        steps={status.steps}
        phaseProgress={status.phaseProgress}
      />
    );
  } else if (isWaitingForMemo) {
    body = (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold text-slate-700">Still loading results…</p>
        <p className="text-xs text-slate-500">The analysis finished — retrieving your memo. This may take a moment.</p>
      </div>
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
    const dealMetrics = (memoData as { dealMetrics?: Record<string, unknown> } | null)?.dealMetrics;
    const hasStructuredMetrics = dealMetrics != null && Object.keys(dealMetrics).length > 0;
    const showPass3FailedBanner = latestMemoSession != null && !!memoTypedOuter?.pass3Failed;
    const showSchemaMismatchBanner =
      latestMemoSession != null &&
      memoTypedOuter != null &&
      (
        (hasRealShape && !hasStructuredMetrics) ||
        (!memoTypedOuter.deliverable && !memoTypedOuter.pass3Failed)
      );
    body = (
      <>
        {showPass3FailedBanner && (
          <div
            className="mx-6 mt-6 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            data-testid="analysis-pass3-failed-banner"
          >
            <div className="font-medium mb-1">Analysis composition incomplete</div>
            <div className="text-xs text-amber-800/80">
              The final memo could not be assembled from the extracted evidence. Try regenerating or contact support if this persists.
            </div>
          </div>
        )}
        {!showPass3FailedBanner && showSchemaMismatchBanner && (
          <div
            className="mx-6 mt-6 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            data-testid="analysis-preview-banner"
          >
            <div className="font-medium mb-1">Preview view — the polished IC Memo layout is shipping next.</div>
            <div className="text-xs text-amber-800/80">
              The deal-analysis tabs below are a preview while the polished IC memo deliverable view lands.
              The pipeline produced{" "}
              <strong>{(pluck(memoData, "scorecard.claimsExtracted") as number | undefined) ?? "—"}</strong> claims,{" "}
              <strong>{(pluck(memoData, "scorecard.matchRate") as number | undefined) ?? "—"}%</strong> verification rate.
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
            sectorTags: (() => {
              try { return JSON.parse(deal.sectorTags) as string[]; } catch { return []; }
            })(),
            dealSizeMinUsd: deal.dealSizeMinUsd ?? null,
            dealSizeMaxUsd: deal.dealSizeMaxUsd ?? null,
          }}
          dealId={dealId}
          sessionId={latestMemoSession?.sessionId ?? null}
        />
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
          <MvpTopbar.Breadcrumb segments={["Deal Flow", "Deal Analysis"]} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <div className="space-y-6">
            {/* When in complete mode the PageHeader is rendered inside AnalysisTabs
                so it has access to the action buttons. For no_job mode we
                render a minimal header without the deal name to avoid giving the
                impression that analysis is ready. For all other modes we render
                a standard header. */}
            {status?.jobStatus !== "complete" && status?.jobStatus !== "no_job" && (
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
    <DealAnalysisCitationSidebar />
    </>
  );
}
