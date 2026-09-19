import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, MessageSquare, Plus, Users } from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { Textarea } from "@/components/mvp/primitives/textarea";
import { Input } from "@/components/mvp/primitives/input";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import {
  fetchDealNotes,
  recordDealNote,
  dealNotesQueryKey,
  type DealNote,
  type DealNoteKind,
} from "@/api/dealNotes";

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

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function NoteRow({ note }: { note: DealNote }) {
  return (
    <div className="rounded-lg border border-[color:var(--rev-border)] bg-[color:var(--rev-tint-neutral)]/40 px-3.5 py-3">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[color:var(--rev-text-6)]">
        {note.interviewee ? (
          <span className="font-medium text-[color:var(--rev-text-3)]">{note.interviewee}</span>
        ) : null}
        {note.actorEmail ? <span>{note.actorEmail}</span> : null}
        <span>· {formatNoteDate(note.createdAt)}</span>
      </div>
      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[color:var(--rev-text-3)]">
        {note.body}
      </p>
    </div>
  );
}

// A running, append-only note log (Analyst Notes or Interview Log). Both are
// the same surface differing only in whether an interviewee is captured.
function NoteLogSection({
  dealId,
  kind,
  eyebrow,
  icon,
  addLabel,
  bodyPlaceholder,
  withInterviewee,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  dealId: string;
  kind: DealNoteKind;
  eyebrow: string;
  icon: ReactNode;
  addLabel: string;
  bodyPlaceholder: string;
  withInterviewee?: boolean;
  emptyIcon: typeof MessageSquare;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [interviewee, setInterviewee] = useState("");

  const { data: notes, isLoading } = useQuery({
    queryKey: dealNotesQueryKey(dealId, kind),
    queryFn: () => fetchDealNotes(dealId, kind),
  });

  const mutation = useMutation({
    mutationFn: () =>
      recordDealNote(dealId, {
        kind,
        body: body.trim(),
        interviewee: withInterviewee ? interviewee.trim() || null : null,
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<DealNote[]>(dealNotesQueryKey(dealId, kind), (prev) => [
        created,
        ...(prev ?? []),
      ]);
      setBody("");
      setInterviewee("");
    },
  });

  const canSubmit = body.trim().length > 0 && !mutation.isPending;

  return (
    <SectionCard eyebrow={eyebrow} icon={icon}>
      {withInterviewee ? (
        <Input
          value={interviewee}
          onChange={(e) => setInterviewee(e.target.value)}
          placeholder="Interviewee (e.g. Jane Founder, CEO)"
          disabled={mutation.isPending}
          className="mb-2.5 text-[12.5px]"
        />
      ) : null}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={bodyPlaceholder}
        rows={3}
        disabled={mutation.isPending}
        className="mb-3 text-[12.5px]"
      />
      <div className="mb-4 flex items-center gap-3.5">
        <span className="flex-1" />
        <Button disabled={!canSubmit} onClick={() => mutation.mutate()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {mutation.isPending ? "Saving…" : addLabel}
        </Button>
      </div>

      {mutation.isError ? (
        <p className="mb-3 text-[12px] text-[color:var(--rev-danger)]">
          Couldn&apos;t save. Please try again.
        </p>
      ) : null}

      {notes && notes.length > 0 ? (
        <div className="space-y-2.5">
          {notes.map((note, i) => (
            <NoteRow key={`${note.createdAt}-${i}`} note={note} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={emptyIcon}
          title={isLoading ? "Loading…" : emptyTitle}
          description={emptyDescription}
          className="border-none p-0"
        />
      )}
    </SectionCard>
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
 * Diligence Workspace → Notes & Transcripts pane.
 *  - Analyst Notes: a running, append-only log of call/meeting notes — wired to
 *    GET/POST /deals/{id}/notes?kind=analyst.
 *  - Interview Log: founder/customer/expert call notes (with an interviewee) —
 *    same endpoint, kind=interview.
 *  - Agent-Drafted Questions: a generation feature, not persistence. No backing
 *    model exists (`icRecommendation.highlightBullets` has no audience tagging),
 *    so force-fitting it here would misrepresent its real shape — kept as an
 *    honest empty state.
 */
export function NotesTranscriptsPane({ dealId }: { dealId: string }) {
  return (
    <div className="space-y-5">
      <NoteLogSection
        dealId={dealId}
        kind="analyst"
        eyebrow="Analyst Notes"
        icon={<MessageSquare className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        addLabel="Add note"
        bodyPlaceholder="Log a call summary, meeting note, or investor feedback…"
        emptyIcon={MessageSquare}
        emptyTitle="No notes logged yet"
        emptyDescription="Add a call summary or note to start this deal's living record."
      />

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

      <NoteLogSection
        dealId={dealId}
        kind="interview"
        eyebrow="Interview Log"
        icon={<Users className="h-4 w-4 text-[color:var(--rev-primary)]" />}
        addLabel="Log interview"
        bodyPlaceholder="Founder, customer, or expert call notes and takeaways…"
        withInterviewee
        emptyIcon={Users}
        emptyTitle="No interviews logged yet"
        emptyDescription="Founder, customer, and expert call notes and takeaways will appear here."
      />
    </div>
  );
}
