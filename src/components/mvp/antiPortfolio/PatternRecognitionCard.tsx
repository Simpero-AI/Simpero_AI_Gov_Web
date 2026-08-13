import { Network } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { cn } from "@/lib/utils";

export interface PatternRecognitionCardProps {
  className?: string;
}

/**
 * Mockup's "Pattern Recognition" block — clusters recurring decline reasons
 * and reports whether each has historically been a reliable screen (mostly
 * validated) or a costly one (mostly missed opportunities). No backend
 * endpoint aggregates decline reasons yet (tmp/backend-prompts.md prompt 4),
 * so this is an honest empty state, same pattern as `FundPerformanceCard`/
 * Institutional Memory's `PatternEnginePane`.
 */
export function PatternRecognitionCard({ className }: PatternRecognitionCardProps) {
  return (
    <section
      aria-label="Pattern Recognition"
      className={cn(
        "rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-[20px_22px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--rev-text-5)]">
        Pattern Recognition
      </p>
      <p className="mb-3.5 mt-1 text-[12.5px] text-[color:var(--rev-text-6)]">
        Recurring decline reasons, and whether they&apos;ve held up.
      </p>
      <EmptyState
        icon={Network}
        title="No decline patterns yet"
        description="This will cluster tracked declines by recurring pass reason (e.g. concentration risk, margin durability) and flag whether each has correctly predicted risk, or cost more missed upside than it prevented."
      />
    </section>
  );
}
