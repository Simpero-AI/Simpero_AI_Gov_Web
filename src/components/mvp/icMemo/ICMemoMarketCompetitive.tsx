/**
 * §4 Market Opportunity & Competitive Landscape.
 *
 * Left column: TAM / SAM / SOM horizontal bars (widths relative to TAM) plus a
 * one-line CAGR caption. Right column: competitor cards (name, win rate,
 * weakness) plus a callout summarising the synthesized competitive advantage.
 *
 * Wrapped in EditableSection for per-section regenerate
 * (composeKey = market_competitive).
 */
import type { ICMemoDeliverable, Sourced } from "@shared/simperoTypes";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { formatUsdShort, formatBpAsPct } from "@/lib/dealMetricsFormat";

export interface ICMemoMarketCompetitiveProps {
  marketCompetitive: ICMemoDeliverable["marketCompetitive"];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

type BarColor = "blue" | "purple" | "emerald";

const BAR_FILL: Record<BarColor, string> = {
  blue: "bg-blue-600",
  purple: "bg-purple-600",
  emerald: "bg-emerald-600",
};

function relativeWidth(
  numerator: Sourced<number | null>,
  denominator: Sourced<number | null>,
): number {
  if (numerator.value === null || denominator.value === null) return 0;
  if (denominator.value === 0) return 0;
  return Math.round((numerator.value / denominator.value) * 100);
}

export function ICMemoMarketCompetitive({
  marketCompetitive,
  onRegenerate,
  onEditText,
}: ICMemoMarketCompetitiveProps) {
  const {
    tamUsd,
    samUsd,
    somUsd,
    growthCagrPct,
    competitors,
    competitiveAdvantage,
  } = marketCompetitive;

  return (
    <EditableSection
      sectionLabel="Market & Competitive Landscape"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b bg-gray-50">
        <h2 className="text-2xl font-semibold mb-6">
          4. Market Opportunity &amp; Competitive Landscape
        </h2>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Market Size &amp; Growth</h3>
            <div className="space-y-4">
              <MarketBar
                label="TAM (Total Addressable)"
                sourced={tamUsd}
                color="blue"
                widthPct={tamUsd.value !== null ? 100 : 0}
              />
              <MarketBar
                label="SAM (Serviceable)"
                sourced={samUsd}
                color="purple"
                widthPct={relativeWidth(samUsd, tamUsd)}
              />
              <MarketBar
                label="SOM (Target)"
                sourced={somUsd}
                color="emerald"
                widthPct={relativeWidth(somUsd, tamUsd)}
              />
            </div>
            <p className="text-sm text-gray-600 mt-4">
              {growthCagrPct.value !== null
                ? `Growing at ${formatBpAsPct(growthCagrPct.value)} CAGR.`
                : null}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Competitive Positioning</h3>
            {competitors.provenance === "missing" || competitors.value === null ? (
              <MissingDataPlaceholder
                gapRef={competitors.gapRef}
                reason={competitors.reason}
              />
            ) : (
              <div className="space-y-3">
                {competitors.value.map((c, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      {c.winRatePct !== undefined && (
                        <span className="text-sm font-semibold text-emerald-700">
                          Win: {formatBpAsPct(c.winRatePct)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{c.weakness}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-900">
                <strong>Competitive Advantage:</strong>{" "}
                <SourcedValue sourced={competitiveAdvantage} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </EditableSection>
  );
}

interface MarketBarProps {
  label: string;
  sourced: Sourced<number | null>;
  color: BarColor;
  widthPct: number;
}

function MarketBar({ label, sourced, color, widthPct }: MarketBarProps) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="font-semibold">
          <SourcedValue
            sourced={sourced}
            format={(v) => (v === null ? "—" : formatUsdShort(v))}
          />
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${BAR_FILL[color]}`}
          style={{ width: `${Math.max(2, widthPct)}%` }}
        />
      </div>
    </div>
  );
}
