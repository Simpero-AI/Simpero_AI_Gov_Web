import { useMemo } from "react";
import { Info, FileText } from "lucide-react";
import { CitationRef } from "@/components/mvp/primitives/CitationRef";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";
import { useCitationSafe } from "@/contexts/CitationContext";
import { formatUsdShort, formatBpAsPct, formatRatio } from "@/lib/dealMetricsFormat";
import { useAuth } from "@/_core/hooks/useAuth";
import type { ICMemoResult, MetricValue, Claim, SourcedSentence } from "@shared/simperoTypes";

interface SummaryTabProps {
  memoTyped: Partial<ICMemoResult> | null;
  onSelectTab?: (tab: "parser-verification") => void;
}

export function SummaryTab({ memoTyped, onSelectTab }: SummaryTabProps) {
  const { user } = useAuth();
  const citationCtx = useCitationSafe();
  const allClaims = useMemo<Claim[]>(
    () => (memoTyped?.sections ?? []).flatMap(s => s.claims ?? []),
    [memoTyped],
  );

  return (
    <div className="space-y-8">

      {/* Executive Summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0">
            Executive Summary
          </p>
          {user?.role === "admin" && (
            <button
              onClick={() => onSelectTab?.("parser-verification")}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Verify Raw Text
            </button>
          )}
        </div>
        {memoTyped?.deliverable?.executiveSummary ? (
          <>
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed text-left">
              {memoTyped.deliverable.executiveSummary.paragraphs.map((p, i) => (
                <p key={i}>
                  <ProseWithClaims content={p.value} claims={allClaims} />
                </p>
              ))}
            </div>
            {memoTyped.deliverable.executiveSummary.investmentHighlight &&
              memoTyped.deliverable.executiveSummary.investmentHighlight.provenance !== "missing" && (
                <div className="mt-4 border-l-4 border-slate-900 pl-4 py-0.5">
                  <p className="text-sm font-medium text-slate-800 text-left">
                    <SourcedValue sourced={memoTyped.deliverable.executiveSummary.investmentHighlight} />
                  </p>
                </div>
              )}
          </>
        ) : (
          <MissingDataPlaceholder gapRef="G-42" />
        )}
      </div>

      {/* Key Metrics Strip */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Key Metrics
        </p>
        {(() => {
          const dm = memoTyped?.dealMetrics;
          const ue = memoTyped?.deliverable?.unitEconomics;
          const rm = memoTyped?.deliverable?.retentionMetrics;

          const findUe = (keyword: string) => {
            if (!ue || ue.provenance === "missing" || !ue.value?.length) return null;
            return (ue.value as Array<{ metric: string; value: unknown; trend?: string }>).find(
              (m) => m.metric.toLowerCase().includes(keyword.toLowerCase()),
            );
          };
          const findRm = (keyword: string) => {
            if (!rm || rm.provenance === "missing" || !rm.value?.length) return null;
            return (rm.value as Array<{ metric: string; value: unknown }>).find(
              (m) => m.metric.toLowerCase().includes(keyword.toLowerCase()),
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
                <div key={i} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">{m.label}</p>
                    {m.citation && (
                      <CitationRef
                        page={m.citation.page ?? null}
                        section={m.citation.section ?? null}
                        verified={!!m.citation.verified}
                        onClick={() => citationCtx?.openCitation({ fieldLabel: m.label, citation: m.citation! })}
                      />
                    )}
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{m.value}</p>
                  {m.sub && <p className="text-xs text-slate-500 mt-0.5">{m.sub}</p>}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Investment Thesis */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Investment Thesis
        </p>
        {memoTyped?.deliverable?.investmentThesisCards &&
        memoTyped.deliverable.investmentThesisCards.provenance !== "missing" &&
        memoTyped.deliverable.investmentThesisCards.value?.length ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            {(memoTyped.deliverable.investmentThesisCards.value as Array<{ theme: string; iconKey?: string; bullets: Array<string | SourcedSentence> }>).map((card, i) => {
              const thesisCitation = memoTyped.deliverable!.investmentThesisCards.provenance === "extracted"
                ? (memoTyped.deliverable!.investmentThesisCards.citation ?? null)
                : null;
              return (
                <div key={i} className="flex gap-5 px-5 py-4">
                  <span className="text-[10px] font-bold text-slate-300 mt-0.5 w-5 flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-900">{card.theme}</p>
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
                        <li key={j} className="text-xs text-slate-600 leading-relaxed">
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
      </div>

      {/* Proposed Deal Terms */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Proposed Deal Terms
        </p>
        {(() => {
          const is = memoTyped?.deliverable?.investmentStructure;
          if (!is) {
            return (
              <div className="border border-slate-200 rounded-lg px-5 py-4 text-sm text-slate-500 italic">
                Deal terms sourced from pipeline — not yet available.
              </div>
            );
          }
          const v = is;
          return (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-900">
                    <td className="py-3 px-5 text-xs text-slate-400">Investment Amount</td>
                    <td className="py-3 px-5 text-right text-sm font-semibold text-white">
                      {v.investmentAmountUsd ? <SourcedValue sourced={v.investmentAmountUsd} format={(val) => val != null ? formatUsdShort(val) : "—"} fieldLabel="Investment Amount" /> : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-xs text-slate-500">Pre-Money Valuation</td>
                    <td className="py-3 px-5 text-right text-sm font-semibold text-slate-900">
                      {v.valuationPreUsd ? <SourcedValue sourced={v.valuationPreUsd} format={(val) => val != null ? formatUsdShort(val) : "—"} fieldLabel="Pre-Money Valuation" /> : "—"}
                    </td>
                  </tr>
                  <tr className="bg-slate-900">
                    <td className="py-3 px-5 text-xs text-slate-400">Post-Money Valuation</td>
                    <td className="py-3 px-5 text-right text-sm font-semibold text-white">
                      {v.valuationPostUsd ? <SourcedValue sourced={v.valuationPostUsd} format={(val) => val != null ? formatUsdShort(val) : "—"} fieldLabel="Post-Money Valuation" /> : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-xs text-slate-500">Ownership %</td>
                    <td className="py-3 px-5 text-right text-sm font-semibold text-slate-900">
                      {v.ownershipPct ? <SourcedValue sourced={v.ownershipPct} format={(val) => val != null ? formatBpAsPct(val) : "—"} fieldLabel="Ownership %" /> : "—"}
                    </td>
                  </tr>
                  {v.governanceRights && v.governanceRights.provenance !== "missing" && v.governanceRights.value?.length ? (
                    <tr>
                      <td className="py-3 px-5 text-xs text-slate-500 align-top">Governance Rights</td>
                      <td className="py-3 px-5 text-right text-sm font-semibold text-slate-900">
                        <div className="flex flex-col items-end gap-0.5">
                          {v.governanceRights.value.map((r, ri) => (
                            <span key={ri} className="text-xs font-medium text-slate-700">{r.value || r.label}</span>
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
      </div>

      {/* Header Metrics (Target IRR, Exit Valuation, MOIC) */}
      {(() => {
        const hm = memoTyped?.deliverable?.headerMetrics;
        if (!hm) return null;
        const hasAny =
          (hm.targetIrrPct?.value != null) ||
          (hm.exitValuationUsd?.value != null) ||
          (hm.moic?.value != null);
        if (!hasAny) return null;
        return (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Return Targets
            </p>
            <div className="grid grid-cols-3 gap-3">
              {hm.targetIrrPct?.value != null && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">Target IRR</p>
                  <p className="text-xl font-bold text-slate-900">
                    <SourcedValue
                      sourced={hm.targetIrrPct}
                      format={(v) => v != null ? formatBpAsPct(v) : "—"}
                      fieldLabel="Target IRR"
                    />
                  </p>
                </div>
              )}
              {hm.exitValuationUsd?.value != null && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">Exit Valuation</p>
                  <p className="text-xl font-bold text-slate-900">
                    <SourcedValue
                      sourced={hm.exitValuationUsd}
                      format={(v) => v != null ? formatUsdShort(v) : "—"}
                      fieldLabel="Exit Valuation"
                    />
                  </p>
                </div>
              )}
              {hm.moic?.value != null && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1">MOIC</p>
                  <p className="text-xl font-bold text-slate-900">
                    <SourcedValue
                      sourced={hm.moic}
                      format={(v) => v != null ? formatRatio(v) : "—"}
                      fieldLabel="MOIC"
                    />
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Valuation & Multiples Analysis */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Valuation &amp; Multiples Analysis
        </p>
        {(() => {
          const dm = memoTyped?.dealMetrics;
          const hasAny = dm?.evRevenue?.value != null || dm?.revenueLatestUsd?.value != null || dm?.revenueGrowthPct?.value != null || dm?.ebitdaMarginPct?.value != null;

          if (!hasAny) {
            return (
              <div className="border border-slate-200 rounded-lg px-5 py-4 bg-slate-50">
                <p className="text-xs text-slate-500 italic">
                  Valuation multiples and comparable benchmarks are sourced from the pipeline. Not yet available for this deal.
                </p>
                <span className="mt-2 inline-block text-[10px] text-gray-400 italic">Sourced from pipeline</span>
              </div>
            );
          }

          const renderCell = (mv: MetricValue | undefined, label: string, fmt: (v: number) => string) => {
            if (!mv || mv.value == null) return null;
            return (
              <tr>
                <td className="py-3 px-5 text-xs text-slate-600">{label}</td>
                <td className="py-3 px-5 text-right text-sm font-semibold text-slate-900 tabular-nums">
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
                </td>
              </tr>
            );
          };

          return (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Metric</th>
                    <th className="text-right py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">This Deal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {renderCell(dm?.evRevenue, "EV / Revenue", formatRatio)}
                  {renderCell(dm?.revenueLatestUsd, "Total Revenue", formatUsdShort)}
                  {renderCell(dm?.revenueGrowthPct, "YoY Growth", formatBpAsPct)}
                  {renderCell(dm?.ebitdaMarginPct, "EBITDA Margin", formatBpAsPct)}
                </tbody>
              </table>
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 italic">Sector medians and premium benchmarks coming soon</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Exit Strategy */}
      {(() => {
        const es = memoTyped?.deliverable?.exitStrategy;
        if (!es) return null;
        const hasScenarios = es.scenarios?.provenance !== "missing" && es.scenarios?.value?.length;
        const hasWeighted = es.weightedReturn?.provenance !== "missing" && es.weightedReturn?.value;
        if (!hasScenarios && !hasWeighted) return null;
        return (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Exit Strategy</p>
            {hasScenarios && (
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Scenario</th>
                      <th className="text-right py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">MOIC</th>
                      <th className="text-right py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">IRR</th>
                      <th className="text-right py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Exit Year</th>
                      <th className="text-right py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Probability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(es.scenarios.value as Array<{ label: string; probabilityPct: number; moic: number; exitYear: number; exitValueUsd: number; irrPct: number }>).map((sc, si) => (
                      <tr key={si}>
                        <td className="py-2.5 px-4 text-sm font-medium text-slate-900">{sc.label}</td>
                        <td className="py-2.5 px-4 text-right text-sm text-slate-700">{formatRatio(sc.moic)}</td>
                        <td className="py-2.5 px-4 text-right text-sm text-slate-700">{formatBpAsPct(sc.irrPct)}</td>
                        <td className="py-2.5 px-4 text-right text-sm text-slate-700">{sc.exitYear}</td>
                        <td className="py-2.5 px-4 text-right text-sm text-slate-500">{sc.probabilityPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 italic">Exit scenario projections</span>
                  <ProvenanceBadge
                    provenance={es.scenarios.provenance}
                    citationVerified={es.scenarios.citation?.verified}
                    onClick={citationCtx ? () => citationCtx.openCitation({ fieldLabel: "Exit Scenarios", citation: es.scenarios.citation ?? null }) : undefined}
                  />
                </div>
              </div>
            )}
            {hasWeighted && (
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-2">Weighted Return</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400">Weighted MOIC</p>
                    <p className="text-lg font-bold text-slate-900">
                      <SourcedValue
                        sourced={es.weightedReturn}
                        format={(v) => v ? formatRatio(v.weightedMoic) : "—"}
                        fieldLabel="Weighted MOIC"
                      />
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Weighted IRR</p>
                    <p className="text-lg font-bold text-slate-900">{formatBpAsPct((es.weightedReturn.value as { weightedMoic: number; weightedIrrPct: number; expectedValueUsd: number; returnPeriodYears: number }).weightedIrrPct)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Return Period</p>
                    <p className="text-lg font-bold text-slate-900">{(es.weightedReturn.value as { weightedMoic: number; weightedIrrPct: number; expectedValueUsd: number; returnPeriodYears: number }).returnPeriodYears}yr</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Market Reviews placeholder */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Market &amp; Product Reviews
        </p>
        <div className="border border-slate-200 rounded-lg px-5 py-6 bg-slate-50 flex flex-col items-center text-center gap-2">
          <Info className="w-6 h-6 text-slate-400" />
          <p className="text-sm font-medium text-slate-600">Market &amp; product review data coming soon</p>
          <p className="text-xs text-slate-400">
            AI-analyzed customer sentiment, G2, and analyst review aggregation will appear here once available.
          </p>
        </div>
      </div>

      {/* Risk Assessment (top 3) */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Risk Assessment</p>
        {(() => {
          const rr = memoTyped?.deliverable?.riskRegister;
          if (!rr || rr.provenance === "missing" || !rr.value?.length) {
            return <MissingDataPlaceholder />;
          }
          const top3 = (rr.value as Array<{ risk: string; description?: string | SourcedSentence[]; severity: string; mitigation: string | SourcedSentence[] | undefined }>).slice(0, 3);
          return (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Risk Factor</th>
                    <th className="text-left py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Severity</th>
                    <th className="text-left py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Mitigation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {top3.map((item, i) => {
                    const s = item.severity;
                    const rowBorderCls = s === "H" ? "border-l-4 border-l-red-500" : s === "M" ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-slate-300";
                    const severityStyle = s === "H" ? "bg-red-50 text-red-700 border border-red-200" : s === "M" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-50 text-slate-600 border border-slate-200";
                    const sevLabel = s === "H" ? "High" : s === "M" ? "Medium" : "Low";
                    return (
                      <tr key={i} className={rowBorderCls}>
                        <td className="py-4 px-5">
                          <p className="font-semibold text-slate-900">{item.risk}</p>
                          {item.description && <p className="text-xs text-slate-500 mt-0.5"><ProseWithClaims content={item.description} claims={allClaims} /></p>}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${severityStyle}`}>{sevLabel}</span>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-600 leading-relaxed"><ProseWithClaims content={item.mitigation} claims={allClaims} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

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
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Critical Questions for Management Meeting
            </p>
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {parsed.map((p, i) => (
                <div key={i} className="grid grid-cols-[200px_1fr] gap-4 px-5 py-3">
                  {p.theme && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 pt-0.5">{p.theme}</span>
                  )}
                  <span className={`text-xs text-slate-600 leading-relaxed ${!p.theme ? "col-span-2" : ""}`}>
                    {p.question}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
