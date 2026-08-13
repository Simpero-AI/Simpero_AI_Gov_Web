import type { ReactNode } from "react";
import { Flag, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/mvp/primitives/button";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { CorroborationPanel } from "@/components/mvp/analysis/CorroborationPanel";

// ---------------------------------------------------------------------------
// Shared card shell — mirrors CapTableTab.tsx's/CompanyTab.tsx's own
// module-private `SectionCard`, matching those files' precedent of a
// one-site helper per tab rather than a shared extraction.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  icon,
  action,
  children,
  className,
}: {
  eyebrow: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
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
 * Findings tab — an analyst-logged findings register (category/severity/
 * status/note per finding, plus a resolve action), distinct from the
 * AI-extracted `governance_flags`/`riskRegister` data already rendered in
 * SummaryTab's Risk Assessment table.
 *
 * Per the plan (docs/plans/2026-08-12-web-design-revamp.md §4c), there is no
 * findings-register model or create/resolve endpoint in the backend at all —
 * unlike every other Phase 5 tab, nothing here can be derived from real
 * ICMemoResult fields. Following SummaryTab.tsx's IC Sign-off precedent: this
 * renders the real UI shape (a real, disabled "Log a finding" action with an
 * explanatory note, and an explicit empty list state) rather than either
 * faking a working create/resolve flow with local-only React state that
 * would silently vanish on refresh, or a bare "coming soon" with no shape.
 * Takes no props — there is no backing data source to receive.
 */
export function FindingsTab() {
  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Findings Register"
        icon={<Flag className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        action={<span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Not yet wired to a backend</span>}
      >
        <p className="mb-4 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          The findings register isn&apos;t persisted yet — logging or resolving a finding here won&apos;t be saved. This
          previews the register that will ship once analyst-logged findings (category, severity, status, note per
          finding, with a resolve action per open item) are wired up to a backend.
        </p>

        <div className="mb-4 flex items-center gap-3.5">
          <span className="text-[12.5px] text-[color:var(--rev-text-7)]">0 open · 0 resolved</span>
          <span className="flex-1" />
          <Button disabled title="Coming soon — not yet wired to a backend" className="disabled:opacity-60">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Log a finding
          </Button>
        </div>

        <EmptyState
          icon={Flag}
          title="No findings logged yet"
          description="Flag a risk discovered during due diligence — financial, legal, commercial, operational, tax, HR, IT & security, or environmental — and track it through to resolution."
          className="border-none p-0"
        />
      </SectionCard>

      <CorroborationPanel items={[]} verifiedCount={0} partialCount={0} unverifiedCount={0} />
    </div>
  );
}
