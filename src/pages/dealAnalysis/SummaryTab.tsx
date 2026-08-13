import { useMemo, type ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CitationRef } from "@/components/mvp/primitives/CitationRef";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { Button } from "@/components/mvp/primitives/button";
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
  governanceFlagReviewerNote,
  type ICMemoResult,
  type MetricValue,
  type Claim,
  type SourcedSentence,
  type Sourced,
} from "@shared/simperoTypes";

interface SummaryTabProps {
  memoTyped: Partial<ICMemoResult> | null;
}

// ---------------------------------------------------------------------------
// Shared card shell — mockup's white/bordered/shadowed card with a mono
// uppercase eyebrow label (docs/plans/2026-08-12-web-design-revamp.md §3
// Phase 5). Local to this tab rather than a new shared primitive — none of
// the other already-revamped surfaces (Deals, Screening) use this exact
// eyebrow+card combination yet, so extracting it now would be a one-site
// abstraction.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  action,
  children,
  className,
}: {
  eyebrow: ReactNode;
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
        <span className="flex-1 font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
          {eyebrow}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  citation,
  onCiteClick,
}: {
  label: string;
  value: string;
  sub?: string;
  citation?: { page: number | null; section: string | null; verified: boolean } | null;
  onCiteClick?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] px-5 py-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
          {label}
        </p>
        {citation && onCiteClick ? (
          <CitationRef
            page={citation.page}
            section={citation.section}
            verified={citation.verified}
            onClick={onCiteClick}
          />
        ) : null}
      </div>
      <p className="font-serif text-[22px] text-[color:var(--rev-text-1)]">{value}</p>
      {sub ? <p className="mt-1 text-[12px] text-[color:var(--rev-text-6)]">{sub}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk Assessment — folds RisksTab's two data sources (governance_flags +
// deliverable.riskRegister) into one table (plan §3 item 2: this section
// "absorbs" the deleted Risks tab rather than dropping its data).
// ---------------------------------------------------------------------------

const SEVERITY_STYLE: Record<"H" | "M" | "L", { chip: string; label: string; bar: string }> = {
  H: { chip: "bg-red-50 text-red-700 border border-red-200", label: "High", bar: "var(--rev-danger)" },
  M: { chip: "bg-amber-50 text-amber-700 border border-amber-200", label: "Medium", bar: "var(--rev-warning)" },
  L: { chip: "bg-slate-50 text-slate-600 border border-slate-200", label: "Low", bar: "var(--rev-text-7)" },
};

interface RiskAssessmentRow {
  key: string;
  factor: string;
  sub?: string;
  severity: "H" | "M" | "L";
  origin: "Compliance" | "Business";
  detail: ReactNode;
}

function buildRiskAssessmentRows(
  memoTyped: Partial<ICMemoResult> | null,
  allClaims: Claim[]
): RiskAssessmentRow[] {
  const rows: RiskAssessmentRow[] = [];

  (memoTyped?.governance_flags ?? []).forEach((flag, i) => {
    const note = governanceFlagReviewerNote(flag);
    rows.push({
      key: `gov-${i}`,
      factor: flag.category,
      sub: flag.regulation,
      severity: flag.severity,
      origin: "Compliance",
      detail: (
        <>
          <p>{flag.description}</p>
          {note ? <p className="mt-1 italic text-[color:var(--rev-text-7)]">{note}</p> : null}
        </>
      ),
    });
  });

  const rr = memoTyped?.deliverable?.riskRegister;
  if (rr && rr.provenance !== "missing" && rr.value?.length) {
    (
      rr.value as Array<{
        risk: string;
        severity: "H" | "M" | "L";
        probability?: string;
        mitigation: string | SourcedSentence[];
      }>
    ).forEach((item, i) => {
      rows.push({
        key: `reg-${i}`,
        factor: item.risk,
        sub: item.probability ? `${item.probability} probability` : undefined,
        severity: item.severity,
        origin: "Business",
        detail: <ProseWithClaims content={item.mitigation} claims={allClaims} />,
      });
    });
  }

  const order: Record<"H" | "M" | "L", number> = { H: 0, M: 1, L: 2 };
  return rows.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------------------------
// Corroboration — derives real Verified/Partial counts from this tab's own
// Sourced fields (citation.verified) rather than fabricating source data
// that doesn't exist yet (plan §3 item 4). Missing fields are excluded
// (nothing rendered to corroborate); everything else is either backed by a
// verified document citation ("verified") or not ("partial") — mirroring
// the same extracted/verified heuristic already used elsewhere on this page
// (see the Company tab's `getStatus` helper in DealDetail.tsx).
// ---------------------------------------------------------------------------

function collectSummaryCorroboration(memoTyped: Partial<ICMemoResult> | null): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const d = memoTyped?.deliverable;
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };
  if (!d) return empty;

  const fields: Array<Sourced<unknown> | undefined> = [
    d.executiveSummary?.investmentHighlight,
    d.investmentThesisCards,
    d.riskRegister,
    d.investmentStructure?.investmentAmountUsd,
    d.investmentStructure?.valuationPreUsd,
    d.investmentStructure?.valuationPostUsd,
    d.investmentStructure?.ownershipPct,
    d.investmentStructure?.governanceRights,
    d.headerMetrics?.targetIrrPct,
    d.headerMetrics?.exitValuationUsd,
    d.headerMetrics?.moic,
    d.exitStrategy?.scenarios,
    d.exitStrategy?.weightedReturn,
    ...(d.icRecommendation?.highlightBullets ?? []),
  ];

  let verified = 0;
  let partial = 0;
  for (const f of fields) {
    if (!f || f.provenance === "missing") continue;
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

export function SummaryTab({ memoTyped }: SummaryTabProps) {
  const citationCtx = useCitationSafe();
  const allClaims = useMemo<Claim[]>(
    () => (memoTyped?.sections ?? []).flatMap(s => s.claims ?? []),
    [memoTyped],
  );
  const riskRows = useMemo(() => buildRiskAssessmentRows(memoTyped, allClaims), [memoTyped, allClaims]);
  const corroboration = useMemo(() => collectSummaryCorroboration(memoTyped), [memoTyped]);
  const riskRegister = memoTyped?.deliverable?.riskRegister;

  return (
    <div className="space-y-5">

      {/* Executive Summary */}
      <SectionCard
        eyebrow="Executive Summary"
        action={
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[color:var(--rev-text-7)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--rev-primary)]" />
            Click any badge to inspect source
          </span>
        }
      >
        {memoTyped?.deliverable?.executiveSummary ? (
          <>
            <div className="space-y-3 text-[14.5px] leading-[1.9] text-[color:var(--rev-text-3)]">
              {memoTyped.deliverable.executiveSummary.paragraphs.map((p, i) => (
                <p key={i}>
                  <ProseWithClaims content={p.value} claims={allClaims} />
                </p>
              ))}
            </div>
            {memoTyped.deliverable.executiveSummary.investmentHighlight &&
              memoTyped.deliverable.executiveSummary.investmentHighlight.provenance !== "missing" && (
                <div className="mt-4 border-l-4 border-[color:var(--rev-primary)] pl-4 py-0.5">
                  <p className="text-sm font-medium text-[color:var(--rev-text-2)]">
                    <SourcedValue sourced={memoTyped.deliverable.executiveSummary.investmentHighlight} />
                  </p>
                </div>
              )}
          </>
        ) : (
          <MissingDataPlaceholder gapRef="G-42" />
        )}
      </SectionCard>

      {/* Key Metrics */}
      <div>
        {(() => {
          const dm = memoTyped?.dealMetrics;
          const ue = memoTyped?.deliverable?.unitEconomics;
          const rm = memoTyped?.deliverable?.retentionMetrics;

          const findUe = (keyword: string) => {
            if (!ue || ue.provenance === "missing" || !ue.value?.length) return null;
            return (ue.value as Array<{ metric: string; value: unknown; trend?: string }>).find(
              m => m.metric.toLowerCase().includes(keyword.toLowerCase()),
            );
          };
          const findRm = (keyword: string) => {
            if (!rm || rm.provenance === "missing" || !rm.value?.length) return null;
            return (rm.value as Array<{ metric: string; value: unknown }>).find(
              m => m.metric.toLowerCase().includes(keyword.toLowerCase()),
            );
          };

          const arrEntry = dm?.revenueLatestUsd?.value != null
            ? { label: "Total Revenue", value: formatUsdShort(dm.revenueLatestUsd.value), sub: "From pipeline", citation: dm.revenueLatestUsd.citation }
            : { label: "Total Revenue", value: "—", sub: "From pipeline", citation: undefined };

          const gmEntry = dm?.grossMarginPct?.value != null
            ? { label: "Gross Margin", value: formatBpAsPct(dm.grossMarginPct.value), sub: "From pipeline", citation: dm.grossMarginPct.citation }
            : { label: "Gross Margin", value: "—", sub: "From pipeline", citation: undefined };

          const nrrEntry = (() => {
            const hit = findRm("nrr") ?? findRm("net revenue retention") ?? findUe("nrr") ?? findUe("net revenue retention");
            if (hit) return { label: "NRR", value: String(hit.value ?? "—"), sub: (hit as { trend?: string }).trend ?? "", citation: undefined };
            return { label: "NRR", value: "—", sub: "From pipeline", citation: undefined };
          })();

          const ltvEntry = (() => {
            const hit = findUe("ltv") ?? findUe("ltv/cac") ?? findUe("ltv / cac");
            if (hit) return { label: "LTV / CAC", value: String(hit.value ?? "—"), sub: hit.trend ?? "", citation: undefined };
            return { label: "LTV / CAC", value: "—", sub: "From pipeline", citation: undefined };
          })();

          const metrics = [arrEntry, gmEntry, nrrEntry, ltvEntry];
          return (
            <div className="grid grid-cols-4 gap-3">
              {metrics.map((m, i) => (
                <MetricCard
                  key={i}
                  label={m.label}
                  value={m.value}
                  sub={m.sub}
                  citation={m.citation}
                  onCiteClick={m.citation ? () => citationCtx?.openCitation({ fieldLabel: m.label, citation: m.citation! }) : undefined}
                />
              ))}
            </div>
          );
        })()}
      </div>

      {/* Investment Thesis */}
      <SectionCard eyebrow="Investment Thesis">
        {memoTyped?.deliverable?.investmentThesisCards &&
        memoTyped.deliverable.investmentThesisCards.provenance !== "missing" &&
        memoTyped.deliverable.investmentThesisCards.value?.length ? (
          <div className="divide-y divide-[color:var(--rev-border-subtle)]">
            {(memoTyped.deliverable.investmentThesisCards.value as Array<{ theme: string; iconKey?: string; bullets: Array<string | SourcedSentence> }>).map((card, i) => {
              const thesisCitation = memoTyped.deliverable!.investmentThesisCards.provenance === "extracted"
                ? (memoTyped.deliverable!.investmentThesisCards.citation ?? null)
                : null;
              return (
                <div key={i} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="mt-0.5 w-5 shrink-0 font-mono text-[11px] text-[color:var(--rev-text-7)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-start justify-between gap-2">
                      <p className="text-[14.5px] font-semibold text-[color:var(--rev-text-2)]">{card.theme}</p>
                      {thesisCitation && (
                        <CitationRef
                          page={thesisCitation.page ?? null}
                          section={thesisCitation.section ?? null}
                          verified={!!thesisCitation.verified}
                          onClick={() => citationCtx?.openCitation({ fieldLabel: `Investment Thesis — ${card.theme}`, citation: thesisCitation })}
                        />
                      )}
                    </div>
                    <ul className="space-y-0.5">
                      {card.bullets.map((b, j) => (
                        <li key={j} className="text-[13px] leading-relaxed text-[color:var(--rev-text-4)]">
                          <ProseWithClaims content={typeof b === "string" ? b : [b as SourcedSentence]} claims={allClaims} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <MissingDataPlaceholder gapRef="G-42" />
        )}
      </SectionCard>

      {/* Proposed Deal Terms */}
      <SectionCard eyebrow="Proposed Deal Terms">
        {(() => {
          const is = memoTyped?.deliverable?.investmentStructure;
          if (!is) {
            return (
              <p className="text-sm italic text-[color:var(--rev-text-6)]">
                Deal terms sourced from pipeline — not yet available.
              </p>
            );
          }
          const v = is;
          return (
            <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-[color:var(--rev-border-subtle)]">
                  <tr className="bg-[color:var(--mvp-sidebar-bg)]">
                    <td className="py-3 px-5 text-xs text-[color:var(--mvp-sidebar-muted)]">Investment Amount</td>
                    <td className="py-3 px-5 text-right text-sm font-semibold text-white">
                      {v.investmentAmountUsd ? <SourcedValue sourced={v.investmentAmountUsd} format={(val) => val != null ? formatUsdShort(val) : "—"} fieldLabel="Investment Amount" /> : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-xs text-[color:var(--rev-text-6)]">Pre-Money Valuation</td>
                    <td className="py-3 px-5 text-right text-sm font-semibold text-[color:var(--rev-text-1)]">
                      {v.valuationPreUsd ? <SourcedValue sourced={v.valuationPreUsd} format={(val) => val != null ? formatUsdShort(val) : "—"} fieldLabel="Pre-Money Valuation" /> : "—"}
                    </td>
                  </tr>
                  <tr className="bg-[color:var(--mvp-sidebar-bg)]">
                    <td className="py-3 px-5 text-xs text-[color:var(--mvp-sidebar-muted)]">Post-Money Valuation</td>
                    <td className="py-3 px-5 text-right text-sm font-semibold text-white">
                      {v.valuationPostUsd ? <SourcedValue sourced={v.valuationPostUsd} format={(val) => val != null ? formatUsdShort(val) : "—"} fieldLabel="Post-Money Valuation" /> : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-xs text-[color:var(--rev-text-6)]">Ownership %</td>
                    <td className="py-3 px-5 text-right text-sm font-semibold text-[color:var(--rev-text-1)]">
                      {v.ownershipPct ? <SourcedValue sourced={v.ownershipPct} format={(val) => val != null ? formatBpAsPct(val) : "—"} fieldLabel="Ownership %" /> : "—"}
                    </td>
                  </tr>
                  {v.governanceRights && v.governanceRights.provenance !== "missing" && v.governanceRights.value?.length ? (
                    <tr>
                      <td className="py-3 px-5 text-xs text-[color:var(--rev-text-6)] align-top">Governance Rights</td>
                      <td className="py-3 px-5 text-right text-sm font-semibold text-[color:var(--rev-text-1)]">
                        <div className="flex flex-col items-end gap-0.5">
                          {v.governanceRights.value.map((r, ri) => (
                            <span key={ri} className="text-xs font-medium text-[color:var(--rev-text-3)]">{r.value || r.label}</span>
                          ))}
                          <ProvenanceBadge
                            provenance={v.governanceRights.provenance}
                            citationVerified={v.governanceRights.citation?.verified}
                            onClick={citationCtx ? () => citationCtx.openCitation({ fieldLabel: "Governance Rights", citation: v.governanceRights?.citation ?? null }) : undefined}
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          );
        })()}
      </SectionCard>

      {/* Return Targets (Target IRR, Exit Valuation, MOIC) */}
      {(() => {
        const hm = memoTyped?.deliverable?.headerMetrics;
        if (!hm) return null;
        const hasAny = hm.targetIrrPct?.value != null || hm.exitValuationUsd?.value != null || hm.moic?.value != null;
        if (!hasAny) return null;
        return (
          <SectionCard eyebrow="Return Targets">
            <div className="grid grid-cols-3 gap-3">
              {hm.targetIrrPct?.value != null && (
                <div className="rounded-xl border border-[color:var(--rev-border)] px-5 py-4">
                  <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">Target IRR</p>
                  <p className="font-serif text-xl text-[color:var(--rev-text-1)]">
                    <SourcedValue sourced={hm.targetIrrPct} format={(v) => v != null ? formatBpAsPct(v) : "—"} fieldLabel="Target IRR" />
                  </p>
                </div>
              )}
              {hm.exitValuationUsd?.value != null && (
                <div className="rounded-xl border border-[color:var(--rev-border)] px-5 py-4">
                  <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">Exit Valuation</p>
                  <p className="font-serif text-xl text-[color:var(--rev-text-1)]">
                    <SourcedValue sourced={hm.exitValuationUsd} format={(v) => v != null ? formatUsdShort(v) : "—"} fieldLabel="Exit Valuation" />
                  </p>
                </div>
              )}
              {hm.moic?.value != null && (
                <div className="rounded-xl border border-[color:var(--rev-border)] px-5 py-4">
                  <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">MOIC</p>
                  <p className="font-serif text-xl text-[color:var(--rev-text-1)]">
                    <SourcedValue sourced={hm.moic} format={(v) => v != null ? formatRatio(v) : "—"} fieldLabel="MOIC" />
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        );
      })()}

      {/* Valuation & Multiples Analysis */}
      <SectionCard eyebrow="Valuation & Multiples Analysis">
        {(() => {
          const dm = memoTyped?.dealMetrics;
          const hasAny = dm?.evRevenue?.value != null || dm?.revenueLatestUsd?.value != null || dm?.revenueGrowthPct?.value != null || dm?.ebitdaMarginPct?.value != null;

          if (!hasAny) {
            return (
              <p className="text-xs italic text-[color:var(--rev-text-6)]">
                Valuation multiples and comparable benchmarks are sourced from the pipeline. Not yet available for this deal.
              </p>
            );
          }

          const renderCell = (mv: MetricValue | undefined, label: string, fmt: (v: number) => string) => {
            if (!mv || mv.value == null) return null;
            return (
              <DenseTableRow key={label}>
                <DenseTableCell>{label}</DenseTableCell>
                <DenseTableCell numeric>
                  <span className="inline-flex items-center gap-1.5">
                    {fmt(mv.value)}
                    {mv.citation ? (
                      <CitationRef
                        page={mv.citation.page ?? null}
                        section={mv.citation.section ?? null}
                        verified={!!mv.citation.verified}
                        onClick={() => citationCtx?.openCitation({ fieldLabel: label, citation: mv.citation! })}
                      />
                    ) : (
                      <ProvenanceBadge
                        provenance="synthesized"
                        onClick={() => citationCtx?.openCitation({ fieldLabel: label, citation: null })}
                      />
                    )}
                  </span>
                </DenseTableCell>
              </DenseTableRow>
            );
          };

          return (
            <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
              <DenseTable>
                <DenseTableHeaderRow>
                  <DenseTableRow>
                    <DenseTableHead>Metric</DenseTableHead>
                    <DenseTableHead className="text-right">This Deal</DenseTableHead>
                  </DenseTableRow>
                </DenseTableHeaderRow>
                <DenseTableBody>
                  {renderCell(dm?.evRevenue, "EV / Revenue", formatRatio)}
                  {renderCell(dm?.revenueLatestUsd, "Total Revenue", formatUsdShort)}
                  {renderCell(dm?.revenueGrowthPct, "YoY Growth", formatBpAsPct)}
                  {renderCell(dm?.ebitdaMarginPct, "EBITDA Margin", formatBpAsPct)}
                </DenseTableBody>
              </DenseTable>
              <div className="border-t border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral)] px-5 py-2.5">
                <span className="text-[10px] italic text-[color:var(--rev-text-7)]">Sector medians and premium benchmarks coming soon</span>
              </div>
            </div>
          );
        })()}
      </SectionCard>

      {/* Exit Strategy */}
      {(() => {
        const es = memoTyped?.deliverable?.exitStrategy;
        if (!es) return null;
        const hasScenarios = es.scenarios?.provenance !== "missing" && es.scenarios?.value?.length;
        const hasWeighted = es.weightedReturn?.provenance !== "missing" && es.weightedReturn?.value;
        if (!hasScenarios && !hasWeighted) return null;
        return (
          <SectionCard eyebrow="Exit Strategy">
            {hasScenarios && (
              <div className="mb-3 overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
                <DenseTable>
                  <DenseTableHeaderRow>
                    <DenseTableRow>
                      <DenseTableHead>Scenario</DenseTableHead>
                      <DenseTableHead className="text-right">MOIC</DenseTableHead>
                      <DenseTableHead className="text-right">IRR</DenseTableHead>
                      <DenseTableHead className="text-right">Exit Year</DenseTableHead>
                      <DenseTableHead className="text-right">Probability</DenseTableHead>
                    </DenseTableRow>
                  </DenseTableHeaderRow>
                  <DenseTableBody>
                    {(es.scenarios.value as Array<{ label: string; probabilityPct: number; moic: number; exitYear: number; exitValueUsd: number; irrPct: number }>).map((sc, si) => (
                      <DenseTableRow key={si}>
                        <DenseTableCell className="font-medium text-[color:var(--rev-text-1)]">{sc.label}</DenseTableCell>
                        <DenseTableCell numeric>{formatRatio(sc.moic)}</DenseTableCell>
                        <DenseTableCell numeric>{formatBpAsPct(sc.irrPct)}</DenseTableCell>
                        <DenseTableCell numeric>{sc.exitYear}</DenseTableCell>
                        <DenseTableCell numeric>{sc.probabilityPct}%</DenseTableCell>
                      </DenseTableRow>
                    ))}
                  </DenseTableBody>
                </DenseTable>
                <div className="flex items-center justify-between border-t border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral)] px-4 py-2">
                  <span className="text-[10px] italic text-[color:var(--rev-text-7)]">Exit scenario projections</span>
                  <ProvenanceBadge
                    provenance={es.scenarios.provenance}
                    citationVerified={es.scenarios.citation?.verified}
                    onClick={citationCtx ? () => citationCtx.openCitation({ fieldLabel: "Exit Scenarios", citation: es.scenarios.citation ?? null }) : undefined}
                  />
                </div>
              </div>
            )}
            {hasWeighted && (
              <div className="rounded-lg border border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] p-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">Weighted Return</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-[color:var(--rev-text-7)]">Weighted MOIC</p>
                    <p className="font-serif text-lg text-[color:var(--rev-text-1)]">
                      <SourcedValue
                        sourced={es.weightedReturn}
                        format={(v) => v ? formatRatio(v.weightedMoic) : "—"}
                        fieldLabel="Weighted MOIC"
                      />
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[color:var(--rev-text-7)]">Weighted IRR</p>
                    <p className="font-serif text-lg text-[color:var(--rev-text-1)]">{formatBpAsPct((es.weightedReturn.value as { weightedMoic: number; weightedIrrPct: number; expectedValueUsd: number; returnPeriodYears: number }).weightedIrrPct)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[color:var(--rev-text-7)]">Return Period</p>
                    <p className="font-serif text-lg text-[color:var(--rev-text-1)]">{(es.weightedReturn.value as { weightedMoic: number; weightedIrrPct: number; expectedValueUsd: number; returnPeriodYears: number }).returnPeriodYears}yr</p>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        );
      })()}

      {/* Third-Party Reviews (folds the old "Market & Product Reviews" placeholder) */}
      <SectionCard
        eyebrow="Market & Product Reviews"
        action={
          <span
            className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
            style={{ background: "color-mix(in srgb, var(--rev-info) 12%, white)", color: "var(--rev-info)" }}
          >
            Third-Party Reviews
          </span>
        }
      >
        <EmptyState
          icon={Star}
          title="Third-party review aggregation coming soon"
          description="AI-analyzed customer sentiment, G2, and analyst review data — with Positives/Concerns breakdowns per source — will appear here once that pipeline ships."
          className="border-none p-0"
        />
      </SectionCard>

      {/* Risk Assessment (folds RisksTab's governance_flags + riskRegister) */}
      <SectionCard
        eyebrow="Risk Assessment"
        action={
          riskRegister && riskRegister.provenance !== "missing" ? (
            <ProvenanceBadge
              provenance={riskRegister.provenance}
              citationVerified={riskRegister.citation?.verified}
              onClick={citationCtx ? () => citationCtx.openCitation({ fieldLabel: "Risk Assessment", citation: riskRegister.citation ?? null }) : undefined}
            />
          ) : undefined
        }
      >
        {riskRows.length === 0 ? (
          <MissingDataPlaceholder />
        ) : (
          <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
            <DenseTable>
              <DenseTableHeaderRow>
                <DenseTableRow>
                  <DenseTableHead>Risk Factor</DenseTableHead>
                  <DenseTableHead className="w-24">Severity</DenseTableHead>
                  <DenseTableHead>Detail</DenseTableHead>
                </DenseTableRow>
              </DenseTableHeaderRow>
              <DenseTableBody>
                {riskRows.map(row => {
                  const s = SEVERITY_STYLE[row.severity];
                  return (
                    <DenseTableRow key={row.key} style={{ borderLeft: `3px solid ${s.bar}` }}>
                      <DenseTableCell>
                        <p className="font-semibold text-[color:var(--rev-text-1)]">{row.factor}</p>
                        {row.sub ? <p className="mt-0.5 text-xs text-[color:var(--rev-text-7)]">{row.sub} · {row.origin}</p> : (
                          <p className="mt-0.5 text-xs text-[color:var(--rev-text-7)]">{row.origin}</p>
                        )}
                      </DenseTableCell>
                      <DenseTableCell>
                        <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", s.chip)}>
                          {s.label}
                        </span>
                      </DenseTableCell>
                      <DenseTableCell className="text-xs leading-relaxed text-[color:var(--rev-text-4)]">
                        {row.detail}
                      </DenseTableCell>
                    </DenseTableRow>
                  );
                })}
              </DenseTableBody>
            </DenseTable>
          </div>
        )}
      </SectionCard>

      {/* Critical Questions for Management Meeting */}
      {(() => {
        const bullets = memoTyped?.deliverable?.icRecommendation?.highlightBullets;
        if (!bullets?.length) return null;
        const parsed = bullets
          .filter((b) => b.provenance !== "missing" && b.value)
          .map((b) => {
            const raw = b.value as string;
            const match = raw.match(/^\*\*(.+?)\*\*[:\s]+([\s\S]*)/);
            return match
              ? { theme: match[1].trim(), question: match[2].trim() }
              : { theme: "", question: raw };
          })
          .filter((p) => p.question);
        if (parsed.length === 0) return null;
        return (
          <SectionCard eyebrow="Critical Questions for Management Meeting">
            <div className="divide-y divide-[color:var(--rev-border-subtle)]">
              {parsed.map((p, i) => (
                <div key={i} className="grid grid-cols-[200px_1fr] gap-4 py-3 first:pt-0 last:pb-0">
                  {p.theme && (
                    <span className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-[color:var(--rev-text-6)]">{p.theme}</span>
                  )}
                  <span className={cn("text-xs leading-relaxed text-[color:var(--rev-text-4)]", !p.theme && "col-span-2")}>
                    {p.question}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        );
      })()}

      {/* IC Sign-off — no backend persistence exists yet (plan §3 item 2):
          renders a real-looking, visibly disabled control rather than a fake
          success state. */}
      <SectionCard
        eyebrow="IC Sign-off"
        action={<span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Not yet wired to a backend</span>}
      >
        <p className="mb-4 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          IC sign-off tracking isn&apos;t persisted yet — approving or declining here won&apos;t be saved. This previews
          the control that will ship once per-firm IC membership and voting are wired up.
        </p>
        <div className="flex items-center gap-2.5">
          <Button
            disabled
            variant="outline"
            title="Coming soon — not yet wired to a backend"
            className="border-[color:var(--rev-success)]/40 text-[color:var(--rev-success)] disabled:opacity-60"
          >
            Approve
          </Button>
          <Button
            disabled
            variant="outline"
            title="Coming soon — not yet wired to a backend"
            className="border-[color:var(--rev-danger)]/40 text-[color:var(--rev-danger)] disabled:opacity-60"
          >
            Decline
          </Button>
        </div>
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
