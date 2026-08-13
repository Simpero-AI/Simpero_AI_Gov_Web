import { useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Calculator,
  GitCompare,
  Landmark,
  LineChart,
  Minus,
  PieChart,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { ProvenanceGlyph } from "@/components/mvp/primitives/ProvenanceGlyph";
import { CitationRef } from "@/components/mvp/primitives/CitationRef";
import { DiscrepancyChip } from "@/components/mvp/primitives/DiscrepancyChip";
import { EmptyState } from "@/components/mvp/common/EmptyState";
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
import type { ICMemoResult, DealMetrics, MetricDiscrepancy, MetricValue, Sourced } from "@shared/simperoTypes";

interface FinancialsTabProps {
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
// don't fabricate" approach CompanyTab/MarketTab established. Balance Sheet
// Snapshot, the 3-Year Financial Trend, Valuation & Deal Structure, and the
// DCF-style projection table have no backing field, so they contribute
// nothing here. (investmentStructure is deliberately not counted on this
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

export function FinancialsTab({ memoTyped, dealMetrics, dealMetricDiscrepancies }: FinancialsTabProps) {
  const d = memoTyped?.deliverable;
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
                description="Year-by-year actuals, management estimates, and projections (ref: G-42) will appear here once the source document is processed."
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

      {/* 3-Year Financial Trend (mockup: Meridian Diligence.dc.html
          ~L3061-3073, Revenue/EBITDA/EBITDA Margin by historical year) — no
          per-year historical-actuals array exists anywhere on DealMetrics or
          ICMemoDeliverable. financialGrid (the Financial Projections card
          above) is forward-looking A/E/P columns for a different purpose,
          not a 3-year actuals trend, so it isn't reused here; 100% unbacked. */}
      <SectionCard eyebrow="3-Year Financial Trend" icon={<LineChart className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={LineChart}
          title="Multi-year financial trend not yet available"
          description="A 3-year historical revenue/EBITDA trend isn't produced by the current pipeline — only latest-period figures (Headline Metrics) and forward projections (Financial Projections) are extracted today."
        />
      </SectionCard>

      {/* Balance Sheet Snapshot — no assets/liabilities/cash/debt field exists
          anywhere on ICMemoDeliverable; 100% unbacked, per the same
          verify-against-the-real-type discipline as Company/Market tabs. */}
      <SectionCard eyebrow="Balance Sheet Snapshot" icon={<Landmark className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <UnbackedSection
          icon={Landmark}
          title="Balance sheet data coming soon"
          description="Cash, debt, working capital, and other balance-sheet line items aren't extracted by the current pipeline."
        />
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
        <UnbackedSection
          icon={Scale}
          title="Valuation & deal-structure figures coming soon"
          description="Enterprise value, EV/EBITDA, proposed structure, fund allocation, target close, an analyst-written valuation rationale, and a comparable-transactions multiple table aren't produced by the current pipeline. (Investment amount, pre/post-money valuation, ownership %, and governance rights are already shown under Cap Table → Key Deal Terms.)"
        />
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
        <UnbackedSection
          icon={GitCompare}
          title="Valuation cross-check coming soon"
          description="A DCF build, precedent-transaction benchmarking, and comparable-companies EV/Revenue analysis are a known gap in the current pipeline — deferred to a future memo-synthesis/analysis-content engine, not silently dropped."
        />
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
