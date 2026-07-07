/**
 * Header recommendation card — big score + verdict pill +
 * proposed-investment / valuation lines + rationale callout + three header
 * metric cards (Target IRR, Exit Valuation, MOIC).
 *
 * Wrapped in EditableSection so the analyst can regenerate just the
 * recommendation_card composer or open the inline-edit affordance.
 */
import type { ICMemoDeliverable, Sourced } from "@shared/simperoTypes";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { formatUsdShort, formatUsdLong, formatBpAsPct } from "@/lib/dealMetricsFormat";

export interface ICMemoRecommendationCardProps {
  recommendation: ICMemoDeliverable["recommendation"];
  headerMetrics: ICMemoDeliverable["headerMetrics"];
  proposedInvestmentUsd: number | null;
  equityStakePct: number | null;
  valuationPostUsd: number | null;
  valuationPreUsd: number | null;
  onRegenerateSection: (steering?: string) => void;
  onEditText: () => void;
}

export function ICMemoRecommendationCard({
  recommendation,
  headerMetrics,
  proposedInvestmentUsd,
  equityStakePct,
  valuationPostUsd,
  valuationPreUsd,
  onRegenerateSection,
  onEditText,
}: ICMemoRecommendationCardProps) {
  const verdictValue = recommendation.verdict.value;
  const verdictPalette =
    verdictValue === "PROCEED"
      ? {
          Icon: CheckCircle,
          iconClass: "text-emerald-600",
          labelClass: "text-emerald-700",
          label: "RECOMMEND: APPROVE",
        }
      : verdictValue === "CAUTION"
        ? {
            Icon: AlertTriangle,
            iconClass: "text-amber-600",
            labelClass: "text-amber-700",
            label: "RECOMMEND: CAUTION",
          }
        : verdictValue === "DECLINE"
          ? {
              Icon: XCircle,
              iconClass: "text-red-600",
              labelClass: "text-red-700",
              label: "RECOMMEND: DECLINE",
            }
          : null;

  return (
    <EditableSection
      sectionLabel="Recommendation"
      onRegenerate={onRegenerateSection}
      onEditText={onEditText}
    >
      <div className="p-10 border-b bg-gradient-to-br from-emerald-50 to-green-50">
        <h2 className="text-2xl font-semibold mb-6">Investment Recommendation</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-xl border-2 border-emerald-300 p-8">
            <div className="flex items-start gap-6">
              <div className="text-center">
                <div className="text-7xl font-bold text-emerald-700 mb-2">
                  <SourcedValue
                    sourced={recommendation.score}
                    format={(v) => (v as number).toFixed(2)}
                    hideBadge
                  />
                </div>
                <div className="text-lg text-emerald-600">/10.0</div>
                <div className="text-xs text-gray-500 mt-1">Investment Score</div>
              </div>
              <div className="flex-1">
                {verdictPalette ? (
                  <div className="flex items-center gap-3 mb-4">
                    <verdictPalette.Icon className={`w-8 h-8 ${verdictPalette.iconClass}`} />
                    <span className={`text-3xl font-semibold ${verdictPalette.labelClass}`}>
                      {verdictPalette.label}
                    </span>
                  </div>
                ) : (
                  <div className="mb-4">
                    <SourcedValue sourced={recommendation.verdict} />
                  </div>
                )}
                <div className="space-y-2 text-gray-700">
                  <p className="text-lg">
                    <strong>Proposed Investment:</strong>{" "}
                    {proposedInvestmentUsd !== null ? formatUsdShort(proposedInvestmentUsd) : "N/A"}
                    {equityStakePct !== null
                      ? ` for ${formatBpAsPct(equityStakePct)} equity stake`
                      : ""}
                  </p>
                  <p className="text-lg">
                    <strong>Valuation:</strong>{" "}
                    {valuationPostUsd !== null
                      ? `${formatUsdLong(valuationPostUsd)} post-money`
                      : "N/A"}
                    {valuationPreUsd !== null
                      ? ` (${formatUsdLong(valuationPreUsd)} pre-money)`
                      : ""}
                  </p>
                  <div className="text-sm text-emerald-800 bg-emerald-100 rounded-lg p-3 mt-3">
                    <strong>Rationale:</strong>{" "}
                    <SourcedValue sourced={recommendation.oneLineRationale} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <HeaderMetricCard
              label="Target IRR"
              sourced={headerMetrics.targetIrrPct}
              format={(v) => formatBpAsPct(v as number)}
              sublabel="5-year projection"
              valueClass="text-blue-700"
            />
            <HeaderMetricCard
              label="Exit Valuation"
              sourced={headerMetrics.exitValuationUsd}
              format={(v) => formatUsdShort(v as number)}
              sublabel="Base case scenario"
              valueClass="text-purple-700"
            />
            <HeaderMetricCard
              label="Expected MOIC"
              sourced={headerMetrics.moic}
              format={(v) => `${(v as number).toFixed(1)}x`}
              sublabel="Money-on-money return"
              valueClass="text-emerald-700"
            />
          </div>
        </div>
      </div>
    </EditableSection>
  );
}

interface HeaderMetricCardProps {
  label: string;
  sourced: Sourced<number | null>;
  format: (v: unknown) => string;
  sublabel: string;
  valueClass: string;
}

function HeaderMetricCard({ label, sourced, format, sublabel, valueClass }: HeaderMetricCardProps) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-3xl font-semibold ${valueClass}`}>
        <SourcedValue sourced={sourced} format={format} />
      </div>
      <div className="text-xs text-gray-500">{sublabel}</div>
    </div>
  );
}
