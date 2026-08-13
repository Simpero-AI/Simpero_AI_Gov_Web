import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type VerificationState = "verified" | "pending" | "failed";

const STATE_CONFIG: Record<VerificationState, { icon: typeof CheckCircle2; bg: string; fg: string }> = {
  verified: { icon: CheckCircle2, bg: "bg-[color:var(--rev-tint-success)]", fg: "text-[color:var(--rev-success)]" },
  pending: { icon: Clock, bg: "bg-[color:var(--rev-tint-warning)]", fg: "text-[color:var(--rev-warning)]" },
  failed: { icon: XCircle, bg: "bg-[color:var(--rev-tint-danger)]", fg: "text-[color:var(--rev-danger)]" },
};

export interface VerificationPillProps {
  state: VerificationState;
  label: ReactNode;
  /** Small line under the label, e.g. "Clean — no adverse findings". */
  detail?: ReactNode;
  className?: string;
}

/**
 * Background-check / employment-verification style pill (Founders tab,
 * later). A sibling of `common/StatusChip.tsx` rather than an extension:
 * StatusChip is an inline pill with caller-supplied children, while the
 * mockup's check/clock/cross pattern is a filled block (icon+label on top,
 * detail text below) — a different shape, not just a different tone.
 */
export function VerificationPill({ state, label, detail, className }: VerificationPillProps) {
  const { icon: Icon, bg, fg } = STATE_CONFIG[state];
  return (
    <div className={cn("rounded-[10px] px-3.5 py-3", bg, className)}>
      <div className={cn("flex items-center gap-1.5 text-[13px] font-semibold", fg)}>
        <Icon className="h-[13px] w-[13px]" aria-hidden="true" />
        {label}
      </div>
      {detail ? <div className="mt-1 text-[11.5px] text-[color:var(--rev-text-4)]">{detail}</div> : null}
    </div>
  );
}
