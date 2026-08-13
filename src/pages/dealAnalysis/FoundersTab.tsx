import { useMemo, useState, type ReactNode } from "react";
import {
  Briefcase,
  Columns2,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/mvp/primitives/button";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { FieldValueList, type FieldValueItem } from "@/components/mvp/common/FieldValueList";
import { VerificationPill, type VerificationState } from "@/components/mvp/common/VerificationPill";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeaderRow,
  DenseTableRow,
} from "@/components/mvp/primitives/DenseTable";
import {
  CorroborationPanel,
  type CorroborationSourceItem,
} from "@/components/mvp/analysis/CorroborationPanel";
import { useCitationSafe } from "@/contexts/CitationContext";
import type { Claim, ICMemoResult, Sourced, SourcedSentence } from "@shared/simperoTypes";

interface FoundersTabProps {
  memoTyped: Partial<ICMemoResult> | null;
}

type FounderMember = {
  name: string;
  title: string;
  background: string | SourcedSentence[];
  keyAchievement?: string | SourcedSentence[];
};

// ---------------------------------------------------------------------------
// Shared card shell — duplicated from CompanyTab.tsx/MarketTab.tsx/
// FinancialsTab.tsx's own module-private `SectionCard`, matching those
// files' precedent of a one-site helper per tab rather than a shared
// extraction.
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

/** ProvenanceBadge wrapper that also wires the citation-sidebar click when a CitationProvider is present. */
function ProvenanceAction({
  sourced,
  fieldLabel,
}: {
  sourced: Sourced<unknown> | undefined;
  fieldLabel: string;
}) {
  const citationCtx = useCitationSafe();
  if (!sourced || sourced.provenance === "missing") return null;
  return (
    <ProvenanceBadge
      provenance={sourced.provenance}
      citationVerified={sourced.citation?.verified}
      onClick={citationCtx ? () => citationCtx.openCitation({ fieldLabel, citation: sourced.citation ?? null }) : undefined}
    />
  );
}

function UnbackedSection({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} className="border-none p-0" />;
}

// ---------------------------------------------------------------------------
// Background Checks / Employment History / Track Record — none of these
// have a backing field on ICMemoDeliverable today (plan §4c: per-founder
// background checks, employment verification, and track-record claims are
// a confirmed net-new backend gap; only name/title/background/keyAchievement
// are real). These three sub-components are built against the shape the
// mockup expects (VerificationPill states, a source, an optional note) so
// the layout is ready the day that data exists — but they're only ever
// invoked with an empty array today, and fall back to the same
// UnbackedSection empty-state convention as every other unbacked section on
// the sibling tabs. Nothing here fabricates a verification outcome.
// ---------------------------------------------------------------------------

interface FounderCheck {
  label: string;
  detail: string;
  state: VerificationState;
}

function BackgroundChecksGrid({ checks }: { checks: FounderCheck[] }) {
  if (checks.length === 0) {
    return (
      <UnbackedSection
        icon={ShieldCheck}
        title="Background checks not yet available"
        description="Identity, employment, education, criminal record, credit, and litigation checks aren't run by the current pipeline."
      />
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {checks.map((c, i) => (
        <VerificationPill
          key={i}
          state={c.state}
          label={c.label}
          detail={c.detail}
        />
      ))}
    </div>
  );
}

interface FounderEmploymentEntry {
  role: string;
  period: string;
  detail: string;
  state: VerificationState;
  source: string;
}

function EmploymentHistoryList({ entries }: { entries: FounderEmploymentEntry[] }) {
  if (entries.length === 0) {
    return (
      <UnbackedSection
        icon={Briefcase}
        title="Employment history not yet available"
        description="Prior roles and reference/LinkedIn verification status aren't extracted by the current pipeline."
      />
    );
  }
  return (
    <div className="flex flex-col">
      {entries.map((e, i) => (
        <div key={i} className="border-t border-[color:var(--rev-border-subtle)] py-3 first:border-t-0">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13.5px] font-medium text-[color:var(--rev-text-1)]">{e.role}</span>
            <VerificationPill state={e.state} label={e.source} className="px-2.5 py-1" />
          </div>
          <p className="mt-0.5 text-[12px] text-[color:var(--rev-text-7)]">
            {e.period} · {e.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

interface FounderAchievementClaim {
  claim: string;
  state: VerificationState;
  source: string;
  note?: string;
}

function TrackRecordTable({ achievements }: { achievements: FounderAchievementClaim[] }) {
  if (achievements.length === 0) {
    return (
      <UnbackedSection
        icon={Briefcase}
        title="Track record claims not yet available"
        description="A structured list of individually-sourced achievement claims isn't extracted by the current pipeline — the one achievement sentence the pipeline does produce is shown as the pull-quote above, not duplicated here."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
      <DenseTable>
        <DenseTableHeaderRow>
          <DenseTableRow>
            <DenseTableHead>Claim</DenseTableHead>
            <DenseTableHead className="text-right">Source &amp; Verification</DenseTableHead>
          </DenseTableRow>
        </DenseTableHeaderRow>
        <DenseTableBody>
          {achievements.map((a, i) => (
            <DenseTableRow key={i}>
              <DenseTableCell className="text-[color:var(--rev-text-1)]">
                {a.claim}
                {a.note ? <p className="mt-0.5 text-[11px] italic text-[color:var(--rev-text-7)]">{a.note}</p> : null}
              </DenseTableCell>
              <DenseTableCell numeric>
                <VerificationPill state={a.state} label={a.source} className="inline-block px-2.5 py-1" />
              </DenseTableCell>
            </DenseTableRow>
          ))}
        </DenseTableBody>
      </DenseTable>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare — with ≥2 founders, a minimal real comparison (title/background/
// key achievement) is honest to build since those fields are real; the
// mockup's richer per-check comparison matrix isn't, since Background
// Checks has no backing data (see BackgroundChecksGrid above).
// ---------------------------------------------------------------------------

function FounderCompareTable({ founders, claims }: { founders: FounderMember[]; claims: Claim[] }) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <DenseTable>
        <DenseTableHeaderRow>
          <DenseTableRow>
            <DenseTableHead>Field</DenseTableHead>
            {founders.map((f, i) => (
              <DenseTableHead key={i}>{f.name}</DenseTableHead>
            ))}
          </DenseTableRow>
        </DenseTableHeaderRow>
        <DenseTableBody>
          <DenseTableRow>
            <DenseTableCell className="text-[color:var(--rev-text-4)]">Title</DenseTableCell>
            {founders.map((f, i) => (
              <DenseTableCell key={i} className="font-medium text-[color:var(--rev-text-1)]">{f.title}</DenseTableCell>
            ))}
          </DenseTableRow>
          <DenseTableRow>
            <DenseTableCell className="text-[color:var(--rev-text-4)]">Background</DenseTableCell>
            {founders.map((f, i) => (
              <DenseTableCell key={i} className="text-[color:var(--rev-text-2)]">
                <ProseWithClaims content={f.background} claims={claims} />
              </DenseTableCell>
            ))}
          </DenseTableRow>
          <DenseTableRow>
            <DenseTableCell className="text-[color:var(--rev-text-4)]">Key Achievement</DenseTableCell>
            {founders.map((f, i) => (
              <DenseTableCell key={i} className="text-[color:var(--rev-text-2)]">
                {f.keyAchievement ? <ProseWithClaims content={f.keyAchievement} claims={claims} /> : "—"}
              </DenseTableCell>
            ))}
          </DenseTableRow>
        </DenseTableBody>
      </DenseTable>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corroboration — derives real Verified/Partial counts from this tab's own
// Sourced fields (managementTeam + board — the only two genuinely real,
// founder/governance-adjacent fields on ICMemoDeliverable), same "use real
// per-field data, don't fabricate" approach the other tabs established.
// ---------------------------------------------------------------------------

function collectFoundersCorroboration(memoTyped: Partial<ICMemoResult> | null): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };
  const fields: Array<Sourced<unknown> | undefined> = [
    memoTyped?.deliverable?.managementTeam,
    memoTyped?.deliverable?.board,
  ];

  let verified = 0;
  let partial = 0;
  for (const f of fields) {
    if (!f || f.provenance === "missing" || f.value == null) continue;
    if (f.provenance === "extracted" && f.citation?.verified) verified += 1;
    else partial += 1;
  }
  const total = verified + partial;
  if (total === 0) return empty;

  return {
    items: [{ id: "source-doc", name: memoTyped?.fileName ?? "Source document", kind: "document", citeCount: total }],
    verifiedCount: verified,
    partialCount: partial,
    unverifiedCount: 0,
  };
}

export function FoundersTab({ memoTyped }: FoundersTabProps) {
  const team = memoTyped?.deliverable?.managementTeam;
  const board = memoTyped?.deliverable?.board;
  const [compareOpen, setCompareOpen] = useState(false);
  const corroboration = useMemo(() => collectFoundersCorroboration(memoTyped), [memoTyped]);

  const allClaims = useMemo<Claim[]>(
    () => (memoTyped?.sections ?? []).flatMap((s) => s.claims ?? []),
    [memoTyped]
  );

  const founders = (team?.provenance !== "missing" ? team?.value : []) as FounderMember[] | undefined;
  const hasFounders = !!founders?.length;

  if (!hasFounders) {
    return (
      <div className="space-y-5">
        <SectionCard eyebrow="Founders & Leadership" icon={<UserRound className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          <UnbackedSection
            icon={UserRound}
            title="Founder & leadership profiles not yet extracted"
            description="Names, titles, background, and key achievements for founders/leadership will appear here once the source document is processed."
          />
        </SectionCard>
        <CorroborationPanel
          items={corroboration.items}
          verifiedCount={corroboration.verifiedCount}
          partialCount={corroboration.partialCount}
          unverifiedCount={corroboration.unverifiedCount}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <p className="text-[12.5px] text-[color:var(--rev-text-7)]">
          Background checks and verification status for each founder/leader.
        </p>
        <div className="flex-1" />
        {founders!.length > 1 && (
          <Button variant="outline" size="sm" onClick={() => setCompareOpen((v) => !v)}>
            <Columns2 className="mr-1.5 h-3.5 w-3.5" />
            {compareOpen ? "Hide comparison" : "Compare founders"}
          </Button>
        )}
      </div>

      {compareOpen && founders!.length > 1 && (
        <FounderCompareTable founders={founders!} claims={allClaims} />
      )}

      {founders!.map((f, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        >
          <div className="flex items-center gap-4 border-b border-[color:var(--rev-border-subtle)] p-5">
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[color:var(--rev-tint-primary)]">
              <UserRound className="h-6 w-6 text-[color:var(--rev-primary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg text-[color:var(--rev-text-1)]">{f.name}</p>
              <p className="text-[13px] text-[color:var(--rev-text-7)]">{f.title}</p>
            </div>
            <ProvenanceAction sourced={team} fieldLabel={`${f.name} — Management Team`} />
          </div>

          <div className="border-b border-[color:var(--rev-border-subtle)] p-5">
            <p className="text-[13.5px] leading-[1.65] text-[color:var(--rev-text-2)]">
              <ProseWithClaims content={f.background} claims={allClaims} />
            </p>
            {f.keyAchievement && (
              <div className="mt-3.5 rounded-lg border-l-[3px] border-[color:var(--rev-primary)] bg-[color:var(--rev-tint-neutral)] px-4 py-3">
                <p className="text-[13px] italic leading-[1.55] text-[color:var(--rev-text-2)]">
                  &ldquo;<ProseWithClaims content={f.keyAchievement} claims={allClaims} />&rdquo;
                </p>
              </div>
            )}
          </div>

          <div className="space-y-5 p-5">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.6px] text-[color:var(--rev-text-7)]">
                Background Checks
              </p>
              <BackgroundChecksGrid checks={[]} />
            </div>
            <div>
              <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.6px] text-[color:var(--rev-text-7)]">
                Employment History
              </p>
              <EmploymentHistoryList entries={[]} />
            </div>
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.6px] text-[color:var(--rev-text-7)]">
                Track Record &amp; Achievements
              </p>
              <TrackRecordTable achievements={[]} />
            </div>
          </div>
        </div>
      ))}

      {/* Board Members — the mockup's Founders sub-tab has no board section,
          but `board` is real, citable data with no other tab to live on
          (Cap Table isn't built yet); shown here rather than dropped, since
          it's the same "Management & Governance" memo section (§6) as the
          founder cards above. */}
      {board && board.provenance !== "missing" && !!board.value?.length && (
        <SectionCard
          eyebrow="Board Members"
          icon={<Briefcase className="h-4 w-4 text-[color:var(--rev-primary)]" />}
          action={<ProvenanceAction sourced={board} fieldLabel="Board Members" />}
        >
          <FieldValueList
            items={board.value.map((b, i): FieldValueItem => ({ id: `board-${i}`, field: b.role, value: b.name }))}
          />
        </SectionCard>
      )}

      <CorroborationPanel
        items={corroboration.items}
        verifiedCount={corroboration.verifiedCount}
        partialCount={corroboration.partialCount}
        unverifiedCount={corroboration.unverifiedCount}
      />
    </div>
  );
}
