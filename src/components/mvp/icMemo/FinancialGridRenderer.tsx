/**
 * Pure renderer for the §5 financial grid + three metric tiles.
 *
 * Extracted from ICMemoFinancials so the same layout is reusable across the
 * polished /memo deliverable (wrapped in EditableSection) and the /analysis
 * Financials tab (wrapped in a plain container — no per-section regenerate).
 *
 * Class lookups use static maps because Tailwind v4 JIT cannot pick up
 * dynamically interpolated class names like `bg-${color}-50`.
 */
import type { ICMemoDeliverable, Sourced } from "@shared/simperoTypes";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { formatUsdShort, formatBpAsPct } from "@/lib/dealMetricsFormat";

export interface FinancialGridRendererProps {
  financialGrid: ICMemoDeliverable["financialGrid"];
  unitEconomics: ICMemoDeliverable["unitEconomics"];
  retentionMetrics: ICMemoDeliverable["retentionMetrics"];
  salesEfficiency: ICMemoDeliverable["salesEfficiency"];
}

type TileColor = "emerald" | "blue" | "purple";

const TILE_CLASSES: Record<
  TileColor,
  { container: string; heading: string; value: string }
> = {
  emerald: {
    container: "bg-emerald-50 rounded-xl p-6 border border-emerald-200",
    heading: "font-semibold text-emerald-900 mb-4",
    value: "font-semibold text-emerald-900",
  },
  blue: {
    container: "bg-blue-50 rounded-xl p-6 border border-blue-200",
    heading: "font-semibold text-blue-900 mb-4",
    value: "font-semibold text-blue-900",
  },
  purple: {
    container: "bg-purple-50 rounded-xl p-6 border border-purple-200",
    heading: "font-semibold text-purple-900 mb-4",
    value: "font-semibold text-purple-900",
  },
};

export function FinancialGridRenderer({
  financialGrid,
  unitEconomics,
  retentionMetrics,
  salesEfficiency,
}: FinancialGridRendererProps) {
  const grid =
    financialGrid.provenance === "missing" ? null : financialGrid.value;
  return (
    <>
      {grid === null ? (
        <MissingDataPlaceholder
          gapRef={financialGrid.gapRef}
          reason={financialGrid.reason}
        />
      ) : (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-50 border-b-2">
                <th className="text-left py-4 px-4 font-semibold">Metric</th>
                {grid.columns.map((c) => (
                  <th
                    key={c.year}
                    className={`text-right py-4 px-4 font-semibold ${
                      c.kind === "E" ? "bg-blue-50" : ""
                    }`}
                  >
                    {c.year}
                    {c.kind === "A" ? "A" : c.kind === "E" ? "E" : "P"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {grid.rows.map((row, ri) => (
                <tr key={row.metric}>
                  <td className="py-3 px-4 font-medium">{row.metric}</td>
                  {row.values.map((v, ci) => {
                    const prov = grid.cellProvenance[ri]?.[ci];
                    const tint =
                      prov === "modeled"
                        ? "bg-purple-50"
                        : grid.columns[ci]?.kind === "E"
                          ? "bg-blue-50"
                          : "";
                    return (
                      <td key={ci} className={`text-right py-3 px-4 ${tint}`}>
                        {v === null ? (
                          <MissingDataPlaceholder
                            reason={
                              prov === "missing" ? "no_data_for_year" : undefined
                            }
                          />
                        ) : (
                          formatGridCell(v, row.unit)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid grid-cols-3 gap-6">
        <MetricTile color="emerald" title="Unit Economics" sourced={unitEconomics} />
        <MetricTile color="blue" title="Retention Metrics" sourced={retentionMetrics} />
        <MetricTile color="purple" title="Sales Efficiency" sourced={salesEfficiency} />
      </div>
    </>
  );
}

interface MetricTileProps {
  color: TileColor;
  title: string;
  sourced: Sourced<Array<{ metric: string; value: string }>>;
}

function MetricTile({ color, title, sourced }: MetricTileProps) {
  const c = TILE_CLASSES[color];
  return (
    <div className={c.container}>
      <h3 className={c.heading}>{title}</h3>
      {sourced.provenance === "missing" ? (
        <MissingDataPlaceholder gapRef={sourced.gapRef} reason={sourced.reason} />
      ) : (
        <div className="space-y-3">
          {sourced.value.map((row, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{row.metric}</span>
              <span className={c.value}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatGridCell(
  v: number,
  unit: "usdCents" | "pct" | "monthsRunway",
): string {
  if (unit === "usdCents") return formatUsdShort(v);
  if (unit === "pct") return formatBpAsPct(v);
  if (unit === "monthsRunway") return `${v}`;
  return String(v);
}
