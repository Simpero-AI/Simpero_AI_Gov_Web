import { Button } from "@/components/mvp/primitives/button";
import { cn } from "@/lib/utils";
import { TONE_COLOR, type ScreeningDecision } from "./types";

export interface ScreeningDecisionBarProps {
  decision: ScreeningDecision | null;
  onAdvance?: () => void;
  onReject?: () => void;
  onReopen?: () => void;
  className?: string;
}

/**
 * Mockup's advance/reject decision bar (+ reopen once decided). No
 * screening-decision endpoint exists on the backend yet (plan §4c), so
 * `decision` is always `null` and the action buttons are disabled with an
 * explanatory tooltip rather than wired to a no-op handler.
 */
export function ScreeningDecisionBar({ decision, onAdvance, onReject, onReopen, className }: ScreeningDecisionBarProps) {
  if (decision) {
    const color = decision.status === "rejected" ? TONE_COLOR.fail : TONE_COLOR.pass;
    const label =
      decision.status === "rejected"
        ? `Rejected at Initial Screening · ${decision.at}`
        : `Advanced to full diligence · ${decision.at}`;
    return (
      <div
        className={cn(
          "mb-5 flex items-center justify-between gap-4 rounded-xl bg-[color:var(--rev-tint-neutral)] px-5 py-4",
          className
        )}
      >
        <span className="flex items-center gap-2.5 text-[13.5px] text-[color:var(--rev-text-3)]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
          {label}
        </span>
        <Button variant="outline" size="sm" onClick={onReopen}>
          Reopen decision
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("mb-5 flex items-center justify-end gap-2.5", className)}>
      <Button
        variant="outline"
        disabled={!onReject}
        title="Coming soon — screening decisions aren't wired to the backend yet"
        className="border-[color:var(--rev-danger)]/30 text-[color:var(--rev-danger)] disabled:opacity-50"
        onClick={onReject}
      >
        Reject deal
      </Button>
      <Button
        disabled={!onAdvance}
        title="Coming soon — screening decisions aren't wired to the backend yet"
        onClick={onAdvance}
      >
        Advance to full diligence →
      </Button>
    </div>
  );
}
