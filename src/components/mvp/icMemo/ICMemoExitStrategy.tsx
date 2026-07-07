/**
 * §9 Exit Strategy & Expected Returns.
 *
 * Three scenario gradient cards (Base / Bull / Bear) + Exit Paths list +
 * Probability-Weighted Return Analysis tile. Wrapped in EditableSection for
 * per-section regenerate (composeKey = exit_strategy).
 *
 * Class lookups use a static palette map because Tailwind v4 JIT cannot pick
 * up dynamically interpolated class names like `from-${color}-500`.
 */
import type { ICMemoDeliverable } from "@shared/simperoTypes";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { formatUsdShort, formatBpAsPct } from "@/lib/dealMetricsFormat";

export interface ICMemoExitStrategyProps {
  exitStrategy: ICMemoDeliverable["exitStrategy"];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

const SCENARIO_PALETTE: Record<string, string> = {
  Base: "from-emerald-500 to-green-600",
  Bull: "from-blue-500 to-indigo-600",
  Bear: "from-amber-500 to-orange-600",
};

export function ICMemoExitStrategy({
  exitStrategy,
  onRegenerate,
  onEditText,
}: ICMemoExitStrategyProps) {
  const { scenarios, paths, weightedReturn } = exitStrategy;
  const currentYear = new Date().getFullYear();
  return (
    <EditableSection
      sectionLabel="Exit Strategy"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b">
        <h2 className="text-2xl font-semibold mb-6">
          9. Exit Strategy &amp; Expected Returns
        </h2>
        {scenarios.provenance === "missing" ? (
          <div className="mb-8">
            <MissingDataPlaceholder
              gapRef={scenarios.gapRef}
              reason={scenarios.reason}
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6 mb-8">
            {scenarios.value.map((s, i) => {
              const gradient =
                SCENARIO_PALETTE[s.label] ?? "from-slate-500 to-gray-600";
              const yearsOut = s.exitYear - currentYear;
              return (
                <div
                  key={i}
                  className={`bg-gradient-to-br ${gradient} text-white rounded-xl p-6`}
                >
                  <div className="text-sm opacity-90 mb-2">
                    {s.label} Case ({s.probabilityPct}% probability)
                  </div>
                  <div className="text-4xl font-bold mb-4">
                    {s.moic.toFixed(1)}x MOIC
                  </div>
                  <div className="space-y-2 text-sm">
                    <Row
                      label="Exit Year:"
                      value={`${s.exitYear} (${yearsOut} year${yearsOut === 1 ? "" : "s"})`}
                    />
                    <Row label="Exit Value:" value={formatUsdShort(s.exitValueUsd)} />
                    <Row label="IRR:" value={formatBpAsPct(s.irrPct)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">Exit Strategy Paths</h3>
          {paths.provenance === "missing" ? (
            <MissingDataPlaceholder gapRef={paths.gapRef} reason={paths.reason} />
          ) : (
            <div className="space-y-4">
              {paths.value.map((p, i) => (
                <div
                  key={i}
                  className="border-2 border-blue-200 bg-blue-50 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">
                        {p.path}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-900">
                          {p.probabilityPct}% Probability
                        </span>
                        <span className="text-sm text-gray-600">
                          Timeline: {p.timeline}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{p.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        {weightedReturn.provenance === "missing" ? (
          <MissingDataPlaceholder
            gapRef={weightedReturn.gapRef}
            reason={weightedReturn.reason}
          />
        ) : (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
            <h3 className="font-semibold text-lg text-purple-900 mb-3">
              Probability-Weighted Return Analysis
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <WeightedTile
                label="Weighted MOIC"
                value={`${weightedReturn.value.weightedMoic.toFixed(1)}x`}
              />
              <WeightedTile
                label="Weighted IRR"
                value={formatBpAsPct(weightedReturn.value.weightedIrrPct)}
              />
              <WeightedTile
                label="Expected Value"
                value={formatUsdShort(weightedReturn.value.expectedValueUsd)}
              />
              <WeightedTile
                label="Return Period"
                value={`${weightedReturn.value.returnPeriodYears.toFixed(1)} yrs`}
              />
            </div>
          </div>
        )}
      </div>
    </EditableSection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="opacity-90">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function WeightedTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-4 text-center">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-3xl font-bold text-purple-700">{value}</div>
    </div>
  );
}
