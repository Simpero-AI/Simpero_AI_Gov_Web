import type { ReactNode } from "react";
import { ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { EmptyState } from "@/components/mvp/common/EmptyState";

// ---------------------------------------------------------------------------
// Shared card shell — mirrors FindingsTab.tsx's/OverviewPane.tsx's own
// module-private `SectionCard`, matching those files' precedent of a
// one-site helper per tab/pane rather than a shared extraction.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  icon,
  action,
  children,
}: {
  eyebrow: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3.5 flex items-center gap-2.5">
        {icon}
        <span className="flex-1 font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
          {eyebrow}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

/**
 * Diligence Workspace → Checklist pane. A per-deal diligence checklist
 * (request description, assignee, status — not started / in review /
 * complete) has no backend at all today (docs/plans/2026-08-12-web-design-
 * revamp.md §4c, already prompted). Unlike Data Room, there is no real data
 * to show here — following FindingsTab.tsx's precedent, this renders the
 * real UI shape (a real, disabled "Add request" action with an explanatory
 * note, and an explicit empty list state) rather than either faking a
 * working create/advance-status flow with local-only React state that would
 * silently vanish on refresh, or a bare "coming soon". Takes no props —
 * there is no backing data source to receive.
 */
export function ChecklistPane() {
  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Diligence Checklist"
        icon={<ListChecks className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        action={<span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Not yet wired to a backend</span>}
      >
        <p className="mb-4 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          The diligence checklist isn&apos;t persisted yet — adding a request here won&apos;t be saved. This
          previews the checklist that will ship once diligence requests (description, assignee, and status through
          to complete) are wired up to a backend.
        </p>

        <div className="mb-4 flex items-center gap-3.5">
          <span className="text-[12.5px] text-[color:var(--rev-text-7)]">0 of 0 requests complete</span>
          <span className="flex-1" />
          <Button disabled title="Coming soon — not yet wired to a backend" className="disabled:opacity-60">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add request
          </Button>
        </div>

        <EmptyState
          icon={ListChecks}
          title="No checklist requests yet"
          description="Track diligence requests sent to management or advisors — description, assignee, and status through not started, in review, and complete."
          className="border-none p-0"
        />
      </SectionCard>
    </div>
  );
}
