import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RadialProgressSize = "sm" | "lg";

const SIZES: Record<RadialProgressSize, { outer: number; inner: number; valueFont: string }> = {
  // Mockup measurements: 76/60px in the deal-workspace header ring,
  // 120/92px in the Diligence Workspace overview ring.
  sm: { outer: 76, inner: 60, valueFont: "text-[17px]" },
  lg: { outer: 120, inner: 92, valueFont: "text-[26px]" },
};

export interface RadialProgressProps {
  /** 0-100; clamped. */
  value: number;
  size?: RadialProgressSize;
  /** Overrides the displayed value text (defaults to `${Math.round(value)}%`). */
  valueLabel?: ReactNode;
  /** Small caption under the value — only meaningful at size="lg" (mockup shows it there only). */
  caption?: ReactNode;
  /** Overrides the default `${Math.round(value)}% complete` aria-label. */
  label?: string;
  className?: string;
}

/**
 * Conic-gradient donut used for completion percentages (Diligence Workspace
 * overview, deal-header progress). Net-new — `primitives/progress.tsx` only
 * re-exports the linear shadcn `<Progress>`.
 */
export function RadialProgress({ value, size = "sm", valueLabel, caption, label, className }: RadialProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const { outer, inner, valueFont } = SIZES[size];

  const ringStyle: CSSProperties = {
    width: outer,
    height: outer,
    background: `conic-gradient(var(--rev-primary) ${clamped * 3.6}deg, var(--rev-border) 0)`,
  };

  return (
    <div
      role="img"
      aria-label={label ?? `${Math.round(clamped)}% complete`}
      className={cn("flex shrink-0 items-center justify-center rounded-full", className)}
      style={ringStyle}
    >
      <div
        style={{ width: inner, height: inner }}
        className="flex flex-col items-center justify-center rounded-full bg-[color:var(--rev-surface)]"
      >
        <span className={cn("font-mono font-semibold leading-none text-[color:var(--rev-primary)]", valueFont)}>
          {valueLabel ?? `${Math.round(clamped)}%`}
        </span>
        {caption ? (
          <span className="mt-[3px] font-mono text-[11px] text-[color:var(--rev-text-6)]">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}
