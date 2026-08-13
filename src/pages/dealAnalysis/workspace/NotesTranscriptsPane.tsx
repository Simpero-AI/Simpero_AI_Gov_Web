import type { ReactNode } from "react";
import { MessageCircleQuestion, MessageSquare, Plus, Users } from "lucide-react";
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

// The mockup drafts agent questions one audience at a time (an audience
// picker + "Draft Questions"), then lists the drafted set with a per-row
// audience chip — it does not persist three separate lists. Rendered here
// as three static, honestly-empty columns instead of one flat empty box so
// the grouping the mockup implies is still visible, without fabricating
// per-audience drafted content.
const QUESTION_AUDIENCES = ["Founder / Management", "Customer Reference", "Industry Expert"] as const;

/**
 * Diligence Workspace → Notes & Transcripts pane. Three sub-sections per the
 * mockup, none backed today:
 *  - Analyst Notes: a running log of call/meeting notes — unbacked, same
 *    disabled-action pattern as FindingsTab.tsx.
 *  - Agent-Drafted Questions: the mockup groups drafted questions by
 *    Founder/Customer/Expert audience. `icRecommendation.highlightBullets`
 *    (already reused twice — SummaryTab.tsx's "Critical Questions for
 *    Management Meeting", DraftMemoPane.tsx's Recommendation prose) has no
 *    audience tagging at all, so force-fitting it a third time here would
 *    misrepresent its real shape. This section is its own honest empty
 *    state instead.
 *  - Interview Log: founder/customer/expert call notes — unbacked, same
 *    disabled-action pattern.
 * Takes no props — there is no backing data source to receive for any of
 * the three.
 */
export function NotesTranscriptsPane() {
  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Analyst Notes"
        icon={<MessageSquare className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        action={<span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Not yet wired to a backend</span>}
      >
        <p className="mb-4 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          Notes aren&apos;t persisted yet — adding one here won&apos;t be saved. This previews the running log of
          calls, meeting notes, and investor feedback that will ship once this model is wired up to a backend.
        </p>
        <div className="mb-4 flex items-center gap-3.5">
          <span className="flex-1" />
          <Button disabled title="Coming soon — not yet wired to a backend" className="disabled:opacity-60">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add note
          </Button>
        </div>
        <EmptyState
          icon={MessageSquare}
          title="No notes logged yet"
          description="Add a call summary or transcript to start this deal's living record."
          className="border-none p-0"
        />
      </SectionCard>

      <SectionCard
        eyebrow="Agent-Drafted Questions"
        icon={<MessageCircleQuestion className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        action={<span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Not yet wired to a backend</span>}
      >
        <p className="mb-4 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          Question drafting isn&apos;t wired up yet — this previews the prep list, generated from open findings,
          risk flags, and unconfirmed mandate criteria on file, that will ship grouped by audience once available.
        </p>
        <div className="mb-4 flex items-center gap-3.5">
          <span className="flex-1" />
          <Button disabled title="Coming soon — not yet wired to a backend" className="disabled:opacity-60">
            Draft Questions
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUESTION_AUDIENCES.map((audience) => (
            <div
              key={audience}
              className="rounded-lg border border-dashed border-[color:var(--rev-border)] px-3.5 py-4 text-center"
            >
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.5px] text-[color:var(--rev-text-6)]">
                {audience}
              </p>
              <p className="text-[11.5px] text-[color:var(--rev-text-7)]">No questions drafted yet</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Interview Log"
        icon={<Users className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        action={<span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Not yet wired to a backend</span>}
      >
        <p className="mb-4 text-[12.5px] leading-relaxed text-[color:var(--rev-text-6)]">
          Interview notes aren&apos;t persisted yet — logging one here won&apos;t be saved. This previews the log of
          founder, customer, and expert calls that will ship once this model is wired up to a backend.
        </p>
        <div className="mb-4 flex items-center gap-3.5">
          <span className="flex-1" />
          <Button disabled title="Coming soon — not yet wired to a backend" className="disabled:opacity-60">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Log interview
          </Button>
        </div>
        <EmptyState
          icon={Users}
          title="No interviews logged yet"
          description="Founder, customer, and expert call notes and takeaways will appear here once this model is wired up."
          className="border-none p-0"
        />
      </SectionCard>
    </div>
  );
}
