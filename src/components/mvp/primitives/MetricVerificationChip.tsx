import { cn } from "@/lib/utils";
import type { MetricValue } from "@shared/simperoTypes";

export interface MetricVerificationChipProps {
  tier: NonNullable<MetricValue["confidenceTier"]> | undefined;
  className?: string;
}

const LABEL_BY_TIER: Record<"high" | "medium" | "low", { label: string; classes: string }> = {
  high:   { label: "Verified",   classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  medium: { label: "Extracted",  classes: "bg-slate-100 text-slate-600 ring-slate-200" },
  low:    { label: "Unverified", classes: "bg-amber-50 text-amber-700 ring-amber-200" },
};

/**
 * Renders the confidenceTier as a chip with ClaimBlock vocabulary
 * (Verified / Extracted / Unverified) — NOT "high/low confidence",
 * which reads to analysts as "don't trust this number".
 */
export function MetricVerificationChip({ tier, className }: MetricVerificationChipProps) {
  if (!tier) return null;
  const config = LABEL_BY_TIER[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
