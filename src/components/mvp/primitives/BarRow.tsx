import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function clampPct(pct: number): number {
  return Math.min(100, Math.max(0, pct));
}

export interface LabeledBarRowProps {
  label: ReactNode;
  /** Pre-formatted value text rendered right of the bar (mono, tabular). */
  value: ReactNode;
  /** 0-100 fill width. */
  pct: number;
  /** CSS color for the fill; defaults to the brand primary. */
  color?: string;
  /** Tailwind width class for the label column — mockup varies it per use (e.g. "w-16", "w-[140px]"). */
  labelClassName?: string;
  className?: string;
}

/**
 * Label + horizontal bar + value row — the mockup's most-reused pattern
 * (mandate-fit criteria, risk-profile bars, workstream progress, allocation
 * breakdowns; ~15 mount points across later phases).
 */
export function LabeledBarRow({
  label,
  value,
  pct,
  color = "var(--rev-primary)",
  labelClassName,
  className,
}: LabeledBarRowProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className={cn("shrink-0 text-[13px] text-[color:var(--rev-text-4)]", labelClassName ?? "w-16")}>
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--rev-tint-neutral)]">
        <div className="h-full rounded-full" style={{ width: `${clampPct(pct)}%`, background: color }} />
      </div>
      <span className="w-5 shrink-0 text-right font-mono text-[13px] tabular-nums text-[color:var(--rev-text-1)]">
        {value}
      </span>
    </div>
  );
}

export interface DualBarRowSeries {
  pct: number;
  /** Pre-formatted value text shown alongside this series' bar. */
  valueLabel: ReactNode;
  color?: string;
}

export interface DualBarRowProps {
  label: ReactNode;
  portfolio: DualBarRowSeries;
  benchmark: DualBarRowSeries;
  /** Right-hand delta column, e.g. excess return. */
  deltaLabel?: ReactNode;
  deltaColor?: string;
  className?: string;
}

/**
 * Portfolio-vs-benchmark variant of `LabeledBarRow` — two stacked bars per
 * row (mockup's Quarterly Return History). Fund Performance / Attribution
 * screens use this later; built now per the shared-primitives phase.
 */
export function DualBarRow({ label, portfolio, benchmark, deltaLabel, deltaColor, className }: DualBarRowProps) {
  return (
    <div className={cn("grid grid-cols-[60px_1fr_80px] items-center gap-3", className)}>
      <span className="font-mono text-[11.5px] text-[color:var(--rev-text-4)]">{label}</span>
      <div className="flex flex-col gap-[3px]">
        <div className="flex items-center gap-2">
          <div
            className="h-2 rounded-full"
            style={{ width: `${clampPct(portfolio.pct)}%`, background: portfolio.color ?? "var(--rev-primary)" }}
          />
          <span className="font-mono text-[11px] text-[color:var(--rev-text-4)]">{portfolio.valueLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-2 rounded-full"
            style={{ width: `${clampPct(benchmark.pct)}%`, background: benchmark.color ?? "var(--rev-text-7)" }}
          />
          <span className="font-mono text-[11px] text-[color:var(--rev-text-6)]">{benchmark.valueLabel}</span>
        </div>
      </div>
      {deltaLabel !== undefined ? (
        <span
          className="text-right font-mono text-[11.5px] font-semibold"
          style={{ color: deltaColor ?? "var(--rev-text-1)" }}
        >
          {deltaLabel}
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}
