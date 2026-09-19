import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Calculator,
  GitCompare,
  LineChart,
  Loader2,
  Minus,
  PieChart,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { ProvenanceGlyph } from "@/components/mvp/primitives/ProvenanceGlyph";
import { CitationRef } from "@/components/mvp/primitives/CitationRef";
import { DiscrepancyChip } from "@/components/mvp/primitives/DiscrepancyChip";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { QueryErrorAlert } from "@/components/mvp/common/QueryErrorAlert";
import { FieldValueList, type FieldValueItem } from "@/components/mvp/common/FieldValueList";
import { ScenarioToggle } from "@/components/mvp/primitives/ScenarioToggle";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeaderRow,
  DenseTableRow,
} from "@/components/mvp/primitives/DenseTable";
import {
  CorroborationPanel,
  type CorroborationSourceItem,
} from "@/components/mvp/analysis/CorroborationPanel";
import { useCitationSafe } from "@/contexts/CitationContext";
import { formatUsdShort, formatBpAsPct, formatRatio } from "@/lib/dealMetricsFormat";
import {
  fetchFinancials,
  financialsQueryKey,
  type FinancialFact,
  type FinancialTrendMetric,
} from "@/api/financials";
import { TrustStatusPill } from "@/components/mvp/primitives/TrustStatusPill";
import type { ICMemoResult, DealMetrics, MetricDiscrepancy, MetricValue, Sourced } from "@shared/simperoTypes";

interface FinancialsTabProps {
  dealId: string;
  memoTyped: Partial<ICMemoResult> | null;
  dealMetrics: DealMetrics | undefined;
  dealMetricDiscrepancies: MetricDiscrepancy[];
}

// ---------------------------------------------------------------------------
// Shared card shell — mirrors CompanyTab.tsx's/MarketTab.tsx's own
// module-private `SectionCard` (mockup's white/bordered/shadowed card + mono
// uppercase eyebrow). Duplicated rather than imported, matching the pattern
// those files already established for this one-site helper.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  icon,
  action,
  children,
  className,
}: {
  eyebrow: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <div className="mb-3.5 flex items-center gap-2.5">
        {icon}
        <span className="flex-1 font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
          {eyebrow}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

/** ProvenanceBadge wrapper that also wires the citation-sidebar click when a CitationProvider is present. */
function ProvenanceAction({
  sourced,
  fieldLabel,
}: {
  sourced: Sourced<unknown> | undefined;
  fieldLabel: string;
}) {
  const citationCtx = useCitationSafe();
  if (!sourced || sourced.provenance === "missing") return null;
  return (
    <ProvenanceBadge
      provenance={sourced.provenance}
      citationVerified={sourced.citation?.verified}
      onClick={citationCtx ? () => citationCtx.openCitation({ fieldLabel, citation: sourced.citation ?? null }) : undefined}
    />
  );
}

// ---------------------------------------------------------------------------
// Empty-section helper — same "don't render a table of all-dash values"
// discipline as CompanyTab/MarketTab's `UnbackedSection`.
// ---------------------------------------------------------------------------

function UnbackedSection({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} className="border-none p-0" />;
}

// Uniform "no evidence" copy for a genuinely-unbuilt box (no deck claim AND no
// web source) — shared across every converted section so the reader sees one
// consistent empty state rather than a per-box "coming soon" placeholder.
const NO_EVIDENCE_TITLE = "No evidence found";
const NO_EVIDENCE_DESCRIPTION = "Nothing on this was found in the deal's materials or public sources.";

// ---------------------------------------------------------------------------
// Financial Figures — claims-driven numeric facts (GET /deals/{id}/financials
// via build_financials_view), self-contained in its own card at the top of the
// tab. Copies MarketTab's Citation/loading-tree conventions verbatim, and uses
// the shared TrustStatusPill, so the same "Cited"/"Verified" datum reads
// identically across the adjacent claims-driven tabs. Deliberately does NOT use
// CitationRef/citationCtx
// (the sidebar-wired citation path the memo-backed cards below use) — these
// facts carry a plain human citation string and an optional source URL, not a
// Sourced<T> with page/section provenance.
// ---------------------------------------------------------------------------

// Trust-status pill is the shared TrustStatusPill primitive, so the same status
// reads identically across Company / Market / Financials.

function Citation({ citation, sourceUrl }: { citation: string | null; sourceUrl: string | null }) {
  // A source URL renders as a link ONLY when it's a non-empty http(s) string --
  // guarding against a javascript:/data: href reaching the anchor. The link text
  // is the URL's hostname (falling back to the citation, then the raw href when a
  // hostname can't be derived). Absent a usable URL, fall back to MarketTab's
  // plain citation span; absent both, render nothing.
  const href = sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null;
  if (href) {
    let text = citation ?? href;
    try {
      text = new URL(href).hostname || citation || href;
    } catch {
      text = citation ?? href;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[12px] text-[color:var(--rev-text-5)] underline underline-offset-2 hover:text-[color:var(--rev-text-3)]"
      >
        {text}
      </a>
    );
  }
  if (!citation) return null;
  return <span className="font-mono text-[12px] text-[color:var(--rev-text-5)]">{citation}</span>;
}

function FinancialFactRow({ fact }: { fact: FinancialFact }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--rev-border-subtle)] py-2.5 last:border-b-0">
      <div className="min-w-0">
        <span className="text-[13.5px] text-[color:var(--rev-text-2)]">{fact.label}</span>
        {fact.period ? (
          <span className="ml-2 text-[11.5px] text-[color:var(--rev-text-6)]">{fact.period}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="font-medium tabular-nums text-[color:var(--rev-text-1)]">{fact.value}</span>
        {fact.reconciliationMismatch ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--rev-warning)]/40 px-1.5 py-0.5 text-[10.5px] font-medium text-[color:var(--rev-warning)]"
            title="This figure failed an arithmetic consistency check (e.g. revenue − COGS ≠ gross profit). It's shown as reported — one of the related figures may be the mis-extracted one."
          >
            <TriangleAlert className="h-3 w-3" aria-hidden="true" />
            Doesn&apos;t reconcile
          </span>
        ) : null}
        <TrustStatusPill status={fact.status} />
        <Citation citation={fact.citation} sourceUrl={fact.sourceUrl} />
      </div>
    </div>
  );
}

/**
 * The claims-backed financial-figures card. Self-contained: it owns its own
 * loading/error/empty states inside a single SectionCard, mirroring
 * MarketTab's loading decision tree. isPending (or a refetch with nothing to
 * show) -> spinner; a never-loaded error -> QueryErrorAlert; a 404 (view ===
 * null) -> neutral "not available yet" EmptyState (NOT the confident
 * per-section negatives, since a 404 is also what a not-yet-deployed backend
 * returns); a 200 with all-empty sections -> a single UnbackedSection. Each of
 * the five statement groupings renders only when it has rows.
 */
function FinancialFiguresSection({ dealId }: { dealId: string }) {
  const financialsQuery = useQuery({
    queryKey: financialsQueryKey(dealId),
    queryFn: () => fetchFinancials(dealId),
  });
  const view = financialsQuery.data ?? null;
  const sections: Array<{ title: string; rows: FinancialFact[] }> = [
    { title: "Income Statement", rows: view?.incomeStatement ?? [] },
    { title: "Profitability", rows: view?.profitability ?? [] },
    { title: "Balance Sheet", rows: view?.balanceSheet ?? [] },
    { title: "Cash Flow", rows: view?.cashFlow ?? [] },
    { title: "Operating", rows: view?.operating ?? [] },
  ];
  const hasAny = sections.some((s) => s.rows.length > 0);

  let content: ReactNode;
  // Guard the definitive "not available" negatives against a load that hasn't
  // produced figures yet -- the initial load (isPending) and a refetch with
  // nothing cached to show (isFetching && !hasAny, e.g. the post-analysis
  // refetch DealDetail fires on completion).
  if (financialsQuery.isPending || (financialsQuery.isFetching && !hasAny)) {
    content = (
      <div role="status" className="flex items-center gap-2 py-2 text-sm text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading…
      </div>
    );
  } else if (financialsQuery.isError && financialsQuery.data === undefined) {
    // A fetch that NEVER loaded (data === undefined) and errored. Key on
    // `data === undefined`, NOT `view === null`: a 404 also coalesces to null,
    // and a cached-404 deal whose refetch then fails must fall through to the
    // neutral unavailable state, not this alert.
    content = (
      <QueryErrorAlert
        message="Couldn't load financial figures for this deal."
        error={financialsQuery.error as Error | null}
      />
    );
  } else if (view === null) {
    // view === null is a 404. It is NOT proof the pipeline ran and extracted
    // nothing -- it is also what a route-not-found returns if the web is
    // deployed ahead of the backend endpoint. Either way, show a neutral
    // unavailable state, not the confident all-empty negative below.
    content = (
      <EmptyState
        icon={BarChart3}
        title="Financial figures not available yet"
        description="This deal's financial figures view hasn't been produced yet. It appears here once the analysis has run and its results are deployed."
      />
    );
  } else if (!hasAny) {
    content = (
      <UnbackedSection
        icon={BarChart3}
        title="No financial figures extracted"
        description="No income-statement, profitability, balance-sheet, cash-flow, or operating figures were extracted from this deal's materials."
      />
    );
  } else {
    content = (
      <div className="space-y-5">
        {sections
          .filter((s) => s.rows.length > 0)
          .map((s) => (
            <div key={s.title}>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.6px] text-[color:var(--rev-text-7)]">
                {s.title}
              </p>
              <div className="rounded-lg border border-[color:var(--rev-border-subtle)] px-4">
                {s.rows.map((f, i) => (
                  <FinancialFactRow key={`${f.label}-${i}`} fact={f} />
                ))}
              </div>
            </div>
          ))}
      </div>
    );
  }

  return (
    <SectionCard eyebrow="Financial Figures" icon={<BarChart3 className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
      {content}
    </SectionCard>
  );
}

// 3-Year Financial Trend — a real multi-year series per headline P&L metric from
// the claims spine (GET /deals/{id}/financials → trend), replacing the dead
// memo_json this box used to read. Metrics are rows, periods are the columns (the
// union of every metric's years); a metric with no value for a year shows "—".
function TrendTable({ trend }: { trend: FinancialTrendMetric[] }) {
  if (trend.length === 0) {
    return (
      <UnbackedSection icon={LineChart} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
    );
  }
  const years = Array.from(new Set(trend.flatMap((m) => m.points.map((p) => p.year)))).sort(
    (a, b) => a - b
  );
  const periodLabel = new Map<number, string>();
  for (const m of trend) {
    for (const p of m.points) if (!periodLabel.has(p.year)) periodLabel.set(p.year, p.period);
  }
  return (
    <div className="overflow-x-auto">
      <DenseTable>
        <DenseTableHeaderRow>
          <DenseTableRow>
            <DenseTableHead>Metric</DenseTableHead>
            {years.map((y) => (
              <DenseTableHead key={y} className="text-right">
                {periodLabel.get(y) ?? `FY${y}`}
              </DenseTableHead>
            ))}
          </DenseTableRow>
        </DenseTableHeaderRow>
        <DenseTableBody>
          {trend.map((m) => {
            const byYear = new Map(m.points.map((p) => [p.year, p.value]));
            return (
              <DenseTableRow key={m.label}>
                <DenseTableCell className="font-medium text-[color:var(--rev-text-1)]">
                  {m.label}
                </DenseTableCell>
                {years.map((y) => (
                  <DenseTableCell key={y} className="text-right tabular-nums">
                    {byYear.get(y) ?? "—"}
                  </DenseTableCell>
                ))}
              </DenseTableRow>
            );
          })}
        </DenseTableBody>
      </DenseTable>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Headline Metrics — real, extracted/xlsx-backed fields (DealMetrics), plus
// cross-source discrepancy flags. Logic unchanged from the pre-restyle
// version (metric selection, citation wiring, discrepancy lookup); only the
// visual shell moves to the DenseTable/SectionCard convention.
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

function HeadlineMetricsCard({
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
    <SectionCard eyebrow="Headline Metrics" icon={<BarChart3 className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
      <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
        <DenseTable>
          <DenseTableHeaderRow>
            <DenseTableRow>
              <DenseTableHead>Field</DenseTableHead>
              <DenseTableHead>Value</DenseTableHead>
              <DenseTableHead className="text-right">Source &amp; Verification</DenseTableHead>
            </DenseTableRow>
          </DenseTableHeaderRow>
          <DenseTableBody>
            {visibleRows.map((row) => {
              const m = metrics[row.field] as MetricValue;
              const discrepancy = discrepancyByField.get(row.field);
              return (
                <DenseTableRow key={row.field}>
                  <DenseTableCell className="text-[color:var(--rev-text-4)]">{row.label}</DenseTableCell>
                  <DenseTableCell className="font-medium text-[color:var(--rev-text-1)]">
                    {m.value != null ? row.format(m.value) : "—"}
                  </DenseTableCell>
                  <DenseTableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
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
                    </div>
                  </DenseTableCell>
                </DenseTableRow>
              );
            })}
          </DenseTableBody>
        </DenseTable>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Corroboration — derives real Verified/Partial counts from this tab's own
// data: DealMetrics (extraction source citation) plus the Sourced fields on
// ICMemoDeliverable (financialGrid, unitEconomics, retentionMetrics,
// salesEfficiency, exitStrategy.scenarios). Same "use real per-field data,
// don't fabricate" approach CompanyTab/MarketTab established. The 3-Year
// Financial Trend, Valuation & Deal Structure, and the DCF-style projection
// table have no backing field, so they contribute nothing here.
// (investmentStructure is deliberately not counted on this
// tab — it's CapTableTab's corroboration signal, not this one's; see the
// note on the Valuation & Deal Structure card below.)
// ---------------------------------------------------------------------------

function collectFinancialsCorroboration(
  memoTyped: Partial<ICMemoResult> | null,
  dealMetrics: DealMetrics | undefined
): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };

  let verified = 0;
  let partial = 0;

  if (dealMetrics) {
    for (const row of STRIP_ROWS) {
      const m = dealMetrics[row.field] as MetricValue | undefined;
      if (!m || m.value == null) continue;
      if (m.citation?.verified) verified += 1;
      else partial += 1;
    }
  }

  const d = memoTyped?.deliverable;
  const fields: Array<Sourced<unknown> | undefined> = [
    d?.financialGrid,
    d?.unitEconomics,
    d?.retentionMetrics,
    d?.salesEfficiency,
    d?.exitStrategy?.scenarios,
  ];
  for (const f of fields) {
    if (!f || f.provenance === "missing" || f.value == null) continue;
    if (f.provenance === "extracted" && f.citation?.verified) verified += 1;
    else partial += 1;
  }

  const total = verified + partial;
  if (total === 0) return empty;

  return {
    items: [{ id: "source-doc", name: memoTyped?.fileName ?? "Source document", kind: "document", citeCount: total }],
    verifiedCount: verified,
    partialCount: partial,
    unverifiedCount: 0,
  };
}

type ExitScenario = {
  label: string;
  probabilityPct: number;
  moic: number;
  exitYear: number;
  exitValueUsd: number;
  irrPct: number;
};

export function FinancialsTab({ dealId, memoTyped, dealMetrics, dealMetricDiscrepancies }: FinancialsTabProps) {
  const d = memoTyped?.deliverable;
  // Same query key as FinancialFiguresSection -> one shared fetch/cache; used
  // here for the claims-driven 3-Year Financial Trend below.
  const financialsQuery = useQuery({
    queryKey: financialsQueryKey(dealId),
    queryFn: () => fetchFinancials(dealId),
  });
  const trend = financialsQuery.data?.trend ?? [];
  const corroboration = useMemo(
    () => collectFinancialsCorroboration(memoTyped, dealMetrics),
    [memoTyped, dealMetrics]
  );

  // Financial Model — real, modeled field (exitStrategy.scenarios). Scenario
  // labels are whatever the pipeline actually produced (e.g. "Base" alone in
  // today's fixtures, or a Downside/Base/Upside-style spread) — the toggle
  // below is built from the real labels rather than a hardcoded 3-way switch.
  const scenarios = d?.exitStrategy?.scenarios;
  const hasScenarios = scenarios?.provenance !== "missing" && !!scenarios?.value?.length;
  const scenarioList = (hasScenarios ? scenarios!.value : []) as ExitScenario[];
  const [selectedScenario, setSelectedScenario] = useState<string | undefined>(undefined);
  const activeLabel = selectedScenario ?? scenarioList.find((s) => s.label === "Base")?.label ?? scenarioList[0]?.label;
  const activeScenario = scenarioList.find((s) => s.label === activeLabel);

  return (
    <div className="space-y-5">
      {/* Claims-backed financial figures (GET /deals/{id}/financials) — self-
          contained with its own loading/empty/error, placed above the memo-
          derived cards below (which self-empty independently of this query). */}
      <FinancialFiguresSection dealId={dealId} />

      {dealMetrics && (
        <HeadlineMetricsCard metrics={dealMetrics} discrepancies={dealMetricDiscrepancies} />
      )}

      {/* Financial Projections */}
      {(() => {
        const grid = d?.financialGrid;
        if (!grid || grid.provenance === "missing" || !grid.value) {
          return (
            <SectionCard eyebrow="Financial Projections" icon={<LineChart className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
              <UnbackedSection
                icon={LineChart}
                title="Financial projections not yet extracted"
                description="Year-by-year actuals, management estimates, and projections will appear here once the source document is processed."
              />
            </SectionCard>
          );
        }
        const gv = grid.value as { columns: Array<{ year: number; kind: "A" | "E" | "P" }>; rows: Array<{ metric: string; values: (number | null)[]; unit: string }> };
        const kindLabel = (kind: "A" | "E" | "P") => kind === "A" ? "Actual" : kind === "E" ? "Mgmt est." : "Projected";
        return (
          <SectionCard
            eyebrow="Financial Projections"
            icon={<LineChart className="h-4 w-4 text-[color:var(--rev-primary)]" />}
            action={
              <span className="text-[11px] text-[color:var(--rev-text-7)]">Management case — unaudited forward estimates</span>
            }
          >
            <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
              <div className="overflow-x-auto">
                <DenseTable>
                  <DenseTableHeaderRow>
                    <DenseTableRow>
                      <DenseTableHead>Metric</DenseTableHead>
                      {gv.columns.map((col, ci) => (
                        <DenseTableHead key={ci} className="text-right">
                          {col.year}{" "}
                          <span
                            className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold normal-case"
                            style={{ background: "var(--rev-tint-success)", color: "var(--rev-success)" }}
                          >
                            {kindLabel(col.kind)}
                          </span>
                        </DenseTableHead>
                      ))}
                    </DenseTableRow>
                  </DenseTableHeaderRow>
                  <DenseTableBody>
                    {gv.rows.map((row, ri) => (
                      <DenseTableRow key={ri}>
                        <DenseTableCell className="font-medium text-[color:var(--rev-text-1)]">{row.metric}</DenseTableCell>
                        {row.values.map((val, vi) => (
                          <DenseTableCell key={vi} numeric>
                            {val == null ? "—" : row.unit === "usdCents" ? formatUsdShort(val) : row.unit === "pct" ? formatBpAsPct(val) : row.unit === "ratio" ? formatRatio(val) : val.toLocaleString()}
                          </DenseTableCell>
                        ))}
                      </DenseTableRow>
                    ))}
                  </DenseTableBody>
                </DenseTable>
              </div>
              <div className="flex items-center justify-end border-t border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral)] px-4 py-2">
                <ProvenanceAction sourced={grid} fieldLabel="Financial Projections" />
              </div>
            </div>
          </SectionCard>
        );
      })()}

      {/* Unit Economics */}
      {(() => {
        const ue = d?.unitEconomics;
        if (!ue || ue.provenance === "missing" || !ue.value?.length) {
          return (
            <SectionCard eyebrow="Unit Economics" icon={<Target className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
              <UnbackedSection
                icon={Target}
                title="Unit economics not yet extracted"
                description="CAC, LTV, payback period, and related unit economics will appear here once the source document is processed."
              />
            </SectionCard>
          );
        }
        const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
        const TREND_COLOR = { up: "var(--rev-success)", down: "var(--rev-danger)", flat: "var(--rev-text-6)" } as const;
        return (
          <SectionCard
            eyebrow="Unit Economics"
            icon={<Target className="h-4 w-4 text-[color:var(--rev-primary)]" />}
            action={<ProvenanceAction sourced={ue} fieldLabel="Unit Economics" />}
          >
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              {(ue.value as Array<{ metric: string; value: string; trend?: "up" | "down" | "flat" }>).map((m, i) => {
                const TrendIcon = m.trend ? TREND_ICON[m.trend] : null;
                return (
                  <div key={i} className="rounded-lg border border-[color:var(--rev-border-subtle)] p-4">
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.6px] text-[color:var(--rev-text-7)]">{m.metric}</p>
                    <p className="font-serif text-xl text-[color:var(--rev-text-1)]">{m.value ?? "—"}</p>
                    {TrendIcon && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: TREND_COLOR[m.trend!] }}>
                        <TrendIcon className="h-3 w-3" /> {m.trend}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        );
      })()}

      {/* Revenue Breakdown — the mockup's version of this section (revenue by
          segment) is the same field already rendered on CompanyTab's Business
          Model card (companyOverview.revenueMix); there's no separate
          revenue-breakdown field on ICMemoDeliverable, so this section is
          empty-stated rather than re-rendering that same data under a second
          label. */}
      <SectionCard eyebrow="Revenue Breakdown" icon={<PieChart className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={PieChart}
          title="See Company tab for revenue mix"
          description="Revenue-by-segment breakdown is the same extracted field already shown under Company → Business Model; there's no separate financials-specific revenue breakdown produced by the current pipeline."
        />
      </SectionCard>

      {/* Retention Metrics */}
      {(() => {
        const rm = d?.retentionMetrics;
        if (!rm || rm.provenance === "missing" || !rm.value?.length) return null;
        const items: FieldValueItem[] = (rm.value as Array<{ metric: string; value: string }>).map((m, i) => ({
          id: `rm-${i}`,
          field: m.metric,
          value: m.value ?? "—",
        }));
        return (
          <SectionCard
            eyebrow="Retention Metrics"
            icon={<TrendingUp className="h-4 w-4 text-[color:var(--rev-primary)]" />}
            action={<ProvenanceAction sourced={rm} fieldLabel="Retention Metrics" />}
          >
            <FieldValueList items={items} />
          </SectionCard>
        );
      })()}

      {/* Sales Efficiency */}
      {(() => {
        const se = d?.salesEfficiency;
        if (!se || se.provenance === "missing" || !se.value?.length) return null;
        const items: FieldValueItem[] = (se.value as Array<{ metric: string; value: string }>).map((m, i) => ({
          id: `se-${i}`,
          field: m.metric,
          value: m.value ?? "—",
        }));
        return (
          <SectionCard
            eyebrow="Sales Efficiency"
            icon={<BarChart3 className="h-4 w-4 text-[color:var(--rev-primary)]" />}
            action={<ProvenanceAction sourced={se} fieldLabel="Sales Efficiency" />}
          >
            <FieldValueList items={items} />
          </SectionCard>
        );
      })()}

      {/* 3-Year Financial Trend — now claims-driven (GET /deals/{id}/financials
          → trend): a real multi-year series per headline P&L metric, built from
          the same multi-period revenue/EBITDA/net-income claims the statement
          sections use. Empty (honest "no evidence") when the deal reports no
          metric across >= 2 periods. */}
      <SectionCard eyebrow="3-Year Financial Trend" icon={<LineChart className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <TrendTable trend={trend} />
      </SectionCard>

      {/* Valuation & Deal Structure (mockup ~L3087-3116: one card, figures
          grid — Enterprise Value / EV per Revenue / EV per EBITDA / Proposed
          Structure / Fund Allocation / Target Close — on top, methodology +
          comparables below a divider). None of those figures have a backing
          field on DealMetrics or ICMemoDeliverable: EV/Revenue is the only
          overlap (dealMetrics.evRevenue, already shown in Headline Metrics
          above), and there's no Enterprise Value / EV-EBITDA / deal-
          structure-narrative field. NOTE: investmentStructure (investment
          amount, pre/post-money valuation, ownership %, governance rights)
          is NOT reused here even though it's a tempting fit for a "deal
          terms" grid — it's already the real backing for CapTableTab's "Key
          Deal Terms" card, which matches the mockup's actual CapTable-tab
          section (~L3577-3589) field-for-field; rendering it again here
          would recreate the exact cross-tab duplication this audit removed
          from SummaryTab. So the whole card, including the figures grid,
          stays 100% unbacked. */}
      <SectionCard eyebrow="Valuation &amp; Deal Structure" icon={<Scale className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection icon={Scale} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
      </SectionCard>

      {/* Financial Model — exitStrategy.scenarios has real per-scenario
          label/probability/MOIC/exit-year/exit-value/IRR; the DCF-style
          inputs (Revenue CAGR, Exit Multiple, Hold Period) and the
          year-by-year projection table have no backing field, so only that
          sub-piece is empty-stated. */}
      <SectionCard
        eyebrow="Financial Model"
        icon={<Calculator className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        action={
          hasScenarios ? (
            <div className="flex items-center gap-2.5">
              <ScenarioToggle
                aria-label="Financial model scenario"
                value={activeLabel ?? ""}
                onValueChange={setSelectedScenario}
                options={scenarioList.map((s) => ({ value: s.label, label: s.label }))}
              />
              <ProvenanceAction sourced={scenarios} fieldLabel="Financial Model" />
            </div>
          ) : undefined
        }
      >
        {!hasScenarios || !activeScenario ? (
          <UnbackedSection
            icon={Calculator}
            title="Financial model not yet available"
            description="Scenario-based return projections will appear here once exit-scenario modeling is available for this deal."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5 rounded-lg border border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] p-4 md:grid-cols-5">
              <div>
                <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">Probability</p>
                <p className="font-serif text-lg text-[color:var(--rev-text-1)]">{activeScenario.probabilityPct}%</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">Exit Year</p>
                <p className="font-serif text-lg text-[color:var(--rev-text-1)]">{activeScenario.exitYear}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">Projected Exit Value</p>
                <p className="font-serif text-lg text-[color:var(--rev-text-1)]">{formatUsdShort(activeScenario.exitValueUsd)}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">MOIC</p>
                <p className="font-serif text-lg" style={{ color: "var(--rev-primary)" }}>{formatRatio(activeScenario.moic)}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">IRR</p>
                <p className="font-serif text-lg" style={{ color: "var(--rev-primary)" }}>{formatBpAsPct(activeScenario.irrPct)}</p>
              </div>
            </div>

            <div className="border-t border-[color:var(--rev-border-subtle)] pt-4">
              <UnbackedSection
                icon={LineChart}
                title="Full DCF-style model inputs not yet available"
                description="Revenue CAGR, exit multiple, hold period assumptions, and a year-by-year projection table aren't produced by the current pipeline — only the scenario-level outputs above are modeled today."
              />
            </div>
            <p className="text-[11px] italic text-[color:var(--rev-text-7)]">
              Illustrative, exit-scenario model based on management projections and stated deal assumptions; not a
              substitute for a full-scope QoE or independent valuation.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Valuation Cross-Check — per the plan's confirmed, deliberate decision
          (docs/plans/2026-08-12-web-design-revamp.md §4c), the DCF build,
          Precedent Transactions, and Comparable Companies EV/Revenue pieces
          are a known, accepted backend gap for this whole redesign. 100%
          unbacked; honest coming-soon state, no fabricated ranges. */}
      <SectionCard eyebrow="Valuation Cross-Check" icon={<GitCompare className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection icon={GitCompare} title={NO_EVIDENCE_TITLE} description={NO_EVIDENCE_DESCRIPTION} />
      </SectionCard>

      <CorroborationPanel
        items={corroboration.items}
        verifiedCount={corroboration.verifiedCount}
        partialCount={corroboration.partialCount}
        unverifiedCount={corroboration.unverifiedCount}
      />
    </div>
  );
}
