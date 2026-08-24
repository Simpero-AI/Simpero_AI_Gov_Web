import type { ReactNode } from "react";
import { initials } from "@/components/mvp/deals/DealsTable";
import { RadialProgress } from "@/components/mvp/primitives/RadialProgress";
import { formatDealSizeRange } from "@/lib/dealMetricsFormat";
import {
  computeDiligenceProgress,
  computeRiskProfile,
} from "@/pages/dealAnalysis/dealAnalysisUtils";
import type { ICMemoResult } from "@shared/simperoTypes";

export interface DealHeroCardProps {
  name: string;
  sectorTags: string[];
  dealSizeMinUsd: number | null;
  dealSizeMaxUsd: number | null;
  leadName: string | null;
  referredBy: string | null;
  createdAt: string;
  memoTyped: Partial<ICMemoResult> | null;
  className?: string;
}

function StatItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] text-[color:var(--rev-text-1)]">{value}</div>
    </div>
  );
}

/**
 * Deal-detail body header (docs/plans/2026-08-12-web-design-revamp.md's
 * richer avatar/risk-badge/progress-ring header card, sibling to
 * `DealHeaderCard`'s topbar variant). Every field is backed by a real
 * `Deal`/`ICMemoResult` value — no confidential/lock badge here, since no
 * backend field exists for it yet (see `DealHeaderCard`'s own comment).
 */
export function DealHeroCard({
  name,
  sectorTags,
  dealSizeMinUsd,
  dealSizeMaxUsd,
  leadName,
  referredBy,
  createdAt,
  memoTyped,
  className,
}: DealHeroCardProps) {
  const { categories, progressPct } = computeDiligenceProgress(memoTyped);
  const { overallRiskLevel, overallRiskColor } = computeRiskProfile(memoTyped);

  return (
    <section
      aria-label="Deal summary"
      className={`mb-5 flex items-center gap-5 rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className ?? ""}`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[9px] bg-[color:var(--rev-tint-primary)] font-mono text-[18px] font-semibold text-[color:var(--rev-primary)]">
        {initials(name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[22px] text-[color:var(--rev-text-1)]">{name}</div>
        {sectorTags.length > 0 ? (
          <p className="mt-0.5 truncate text-[12.5px] text-[color:var(--rev-text-6)]">{sectorTags.join(", ")}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <StatItem label="Deal size" value={formatDealSizeRange(dealSizeMinUsd, dealSizeMaxUsd)} />
        <StatItem label="Lead" value={leadName ?? "—"} />
        <StatItem label="Opened" value={new Date(createdAt).toLocaleDateString()} />
        <StatItem label="Referred by" value={referredBy ?? "—"} />
      </div>

      {overallRiskLevel !== null ? (
        <span
          className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px]"
          style={{ background: "var(--rev-tint-neutral)", color: overallRiskColor }}
        >
          Risk · {overallRiskLevel}
        </span>
      ) : (
        <span
          className="shrink-0 rounded-md bg-[color:var(--rev-tint-neutral)] px-2 py-0.5 font-mono text-[11px] text-[color:var(--rev-text-6)]"
          title="No risks registered yet"
        >
          Risk · —
        </span>
      )}

      {categories.length > 0 ? (
        <RadialProgress size="sm" value={progressPct} />
      ) : (
        <RadialProgress value={0} valueLabel="—" label="Diligence progress not available" />
      )}
    </section>
  );
}
