import { BarChart3, Target, TrendingUp } from "lucide-react";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { ProvenanceGlyph } from "@/components/mvp/primitives/ProvenanceGlyph";
import { CitationRef } from "@/components/mvp/primitives/CitationRef";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { DiscrepancyChip } from "@/components/mvp/primitives/DiscrepancyChip";
import { useCitationSafe } from "@/contexts/CitationContext";
import { formatUsdShort, formatBpAsPct, formatRatio } from "@/lib/dealMetricsFormat";
import type { ICMemoResult, DealMetrics, MetricDiscrepancy, MetricValue } from "@shared/simperoTypes";

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

interface FinancialsTabProps {
  memoTyped: Partial<ICMemoResult> | null;
  dealMetrics: DealMetrics | undefined;
  dealMetricDiscrepancies: MetricDiscrepancy[];
}

export function FinancialsTab({ memoTyped, dealMetrics, dealMetricDiscrepancies }: FinancialsTabProps) {
  const citationCtx = useCitationSafe();

  return (
    <div className="space-y-5">
      {dealMetrics && (
        <DealMetricsStrip metrics={dealMetrics} discrepancies={dealMetricDiscrepancies} />
      )}

      {/* Financial Projections Table */}
      {(() => {
        const grid = memoTyped?.deliverable?.financialGrid;
        if (!grid || grid.provenance === "missing" || !grid.value) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900 text-sm">Financial Projections</span>
              </div>
              <div className="px-4 py-4"><MissingDataPlaceholder gapRef="G-42" /></div>
            </div>
          );
        }
        const gv = grid.value as { columns: Array<{ year: number; kind: "A" | "E" | "P" }>; rows: Array<{ metric: string; values: (number | null)[]; unit: string }> };
        const kindLabel = (kind: "A" | "E" | "P") => kind === "A" ? "Actual" : kind === "E" ? "Mgmt est." : "Projected";
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900 text-sm">Financial Projections</span>
                <ProvenanceBadge
                  provenance={grid.provenance}
                  citationVerified={grid.citation?.verified}
                  onClick={() => citationCtx?.openCitation({ fieldLabel: "Financial Projections", citation: grid.citation ?? null })}
                />
              </div>
              <span className="text-xs text-gray-500">Management case — unaudited forward estimates</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Metric</th>
                    {gv.columns.map((col, ci) => (
                      <th key={ci} className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <span>{col.year}</span>
                        <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold normal-case">{kindLabel(col.kind)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gv.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-gray-100">
                      <td className="p-3 font-medium text-gray-800 text-xs">{row.metric}</td>
                      {row.values.map((val, vi) => (
                        <td key={vi} className="p-3 text-xs text-gray-700 tabular-nums">
                          {val == null ? "—" : row.unit === "usdCents" ? formatUsdShort(val) : row.unit === "pct" ? formatBpAsPct(val) : row.unit === "ratio" ? formatRatio(val) : val.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Unit Economics */}
      {(() => {
        const ue = memoTyped?.deliverable?.unitEconomics;
        if (!ue || ue.provenance === "missing" || !ue.value?.length) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <Target className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-gray-900 text-sm">Unit Economics</span>
              </div>
              <div className="px-4 py-4"><MissingDataPlaceholder /></div>
            </div>
          );
        }
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <Target className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-900 text-sm">Unit Economics</span>
              <ProvenanceBadge
                provenance={ue.provenance}
                citationVerified={ue.citation?.verified}
                onClick={() => citationCtx?.openCitation({ fieldLabel: "Unit Economics", citation: ue.citation ?? null })}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-100">
              {(ue.value as Array<{ metric: string; value: unknown; trend?: string }>).map((m, i) => (
                <div key={i} className="px-4 py-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">{m.metric}</p>
                  <p className="text-xl font-bold text-gray-900">{m.value != null ? String(m.value) : "—"}</p>
                  {m.trend && <p className="text-xs text-gray-500 mt-0.5">{m.trend}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Retention Metrics */}
      {(() => {
        const rm = memoTyped?.deliverable?.retentionMetrics;
        if (!rm || rm.provenance === "missing" || !rm.value?.length) return null;
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-gray-900 text-sm">Retention Metrics</span>
              <ProvenanceBadge
                provenance={rm.provenance}
                citationVerified={rm.citation?.verified}
                onClick={() => citationCtx?.openCitation({ fieldLabel: "Retention Metrics", citation: rm.citation ?? null })}
              />
            </div>
            <div className="divide-y divide-gray-100">
              {(rm.value as Array<{ metric: string; value: unknown }>).map((m, i) => (
                <div key={i} className="flex justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-600">{m.metric}</span>
                  <span className="text-xs font-semibold text-gray-900">{m.value != null ? String(m.value) : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Sales Efficiency */}
      {(() => {
        const se = memoTyped?.deliverable?.salesEfficiency;
        if (!se || se.provenance === "missing" || !se.value?.length) return null;
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">Sales Efficiency</span>
              <ProvenanceBadge
                provenance={se.provenance}
                citationVerified={se.citation?.verified}
                onClick={() => citationCtx?.openCitation({ fieldLabel: "Sales Efficiency", citation: se.citation ?? null })}
              />
            </div>
            <div className="divide-y divide-gray-100">
              {(se.value as Array<{ metric: string; value: unknown }>).map((m, i) => (
                <div key={i} className="flex justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-600">{m.metric}</span>
                  <span className="text-xs font-semibold text-gray-900">{m.value != null ? String(m.value) : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
