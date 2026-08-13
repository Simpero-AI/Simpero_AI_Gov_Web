import { Compass } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { cn } from "@/lib/utils";

export interface ThesisDriftCardProps {
  className?: string;
}

/**
 * Mockup's "Drift From Investment Thesis" block — flags tracked declines
 * whose sector sits outside the *current* mandate, i.e. the thesis narrowed
 * since the decline. Doubly-unbacked today: no backend endpoint aggregates
 * declines at all yet, and computing drift against the mandate as it stood
 * *at decline time* (vs. just today's mandate) needs mandate version
 * history, which doesn't exist yet either (Phase 7 finding — no versioning
 * on `investmentProfile`; see tmp/backend-prompts.md prompt 4, which flags
 * this same gap). So even once declines are tracked, this card can only
 * compare against today's mandate, not "was this drift already true when we
 * passed," until mandate history ships.
 */
export function ThesisDriftCard({ className }: ThesisDriftCardProps) {
  return (
    <section
      aria-label="Drift From Investment Thesis"
      className={cn(
        "rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-[20px_22px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--rev-text-5)]">
        Drift From Investment Thesis
      </p>
      <p className="mb-3.5 mt-1 text-[12.5px] text-[color:var(--rev-text-6)]">
        Where these declines sit relative to today&apos;s mandate.
      </p>
      <EmptyState
        icon={Compass}
        title="No drift analysis yet"
        description="Needs both tracked declines (not sourced yet) and mandate version history (doesn't exist yet — today's mandate has no versioning) to compare a decline's sector against the mandate as it stood when the call was made, not just today's."
      />
    </section>
  );
}
