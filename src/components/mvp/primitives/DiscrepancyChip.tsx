import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/mvp/primitives/hover-card";
import { cn } from "@/lib/utils";
import type { MetricDiscrepancy } from "@shared/simperoTypes";
import { CitationRef } from "./CitationRef";
import { formatUsdShort, formatBpAsPct, formatRatio } from "@/lib/dealMetricsFormat";

export interface DiscrepancyChipProps {
  discrepancy: MetricDiscrepancy;
  onViewClaim?: () => void;
  className?: string;
}

const RATIO_FIELDS = new Set(["evRevenue"]);
const BP_FIELDS = new Set(["irrPct", "equityStakePct", "revenueGrowthPct", "ebitdaMarginPct"]);

function formatForField(field: MetricDiscrepancy["field"], v: number): string {
  if (BP_FIELDS.has(field)) return formatBpAsPct(v);
  if (RATIO_FIELDS.has(field)) return formatRatio(v);
  return formatUsdShort(v);
}

/**
 * Amber ⚠ chip indicating cross-source discrepancy on a metric.
 * Hover-card is scan-optimized: XLSX vs CIM values + delta + "View claim"
 * link. Investigation flow lives on the AnalysisTabs strip; this is a
 * triage chip for dashboard scanning.
 */
export function DiscrepancyChip({ discrepancy, onViewClaim, className }: DiscrepancyChipProps) {
  const { field, xlsxValue, claimValue, deltaPct, citation } = discrepancy;
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full text-amber-600 hover:text-amber-700 cursor-help leading-none",
            className
          )}
          aria-label={`Discrepancy on ${field}`}
        >
          ⚠
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 text-xs">
        <p className="font-medium text-slate-700">Cross-source mismatch</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-600">
          <dt className="font-mono text-slate-400">XLSX</dt>
          <dd className="tabular-nums">{formatForField(field, xlsxValue)}</dd>
          <dt className="font-mono text-slate-400">CIM</dt>
          <dd className="tabular-nums">{formatForField(field, claimValue)}</dd>
          <dt className="font-mono text-slate-400">Δ</dt>
          <dd className="tabular-nums text-amber-700">{deltaPct.toFixed(1)}%</dd>
        </dl>
        {onViewClaim && citation && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <CitationRef
              page={citation.page ?? null}
              section={citation.section ?? null}
              verified={!!citation.verified}
              onClick={onViewClaim}
            />
            <span className="ml-2 text-slate-500">View claim</span>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
