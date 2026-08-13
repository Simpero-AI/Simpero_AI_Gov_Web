import { LineChart } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { cn } from "@/lib/utils";

export interface FundPerformanceCardProps {
  className?: string;
}

/**
 * Mockup's "Fund Performance" card (realized-portfolio MOIC/IRR/blended
 * return + quarterly NAV chart) — no backend data exists for this today
 * (docs/plans/2026-08-12-web-design-revamp.md §4c: dashboard-stats only
 * covers the live pipeline, not realized/closed positions). A backend
 * prompt for this was sent separately. Shipping an honest coming-soon state
 * rather than fabricating MOIC/IRR/NAV numbers.
 */
export function FundPerformanceCard({ className }: FundPerformanceCardProps) {
  return (
    <section
      aria-label="Fund Performance"
      className={cn(
        "mb-5 rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-[22px_24px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--rev-text-6)]">
        Existing Portfolio
      </p>
      <h2 className="mt-1 font-serif text-[19px] font-semibold text-[color:var(--rev-text-1)]">Fund Performance</h2>
      <EmptyState
        icon={LineChart}
        title="Realized performance tracking is coming soon"
        description="Blended MOIC, blended IRR, and quarterly NAV across closed investments aren't tracked by the platform yet — this card will populate once that data model ships."
        className="mt-4"
      />
    </section>
  );
}
