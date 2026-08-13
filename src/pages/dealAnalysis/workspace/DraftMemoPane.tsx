import { useMemo, type ReactNode } from "react";
import { FileText, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import {
  CorroborationPanel,
  type CorroborationSourceItem,
} from "@/components/mvp/analysis/CorroborationPanel";
import { proseFieldToString, type ICMemoResult, type Sourced, type SourcedSentence } from "@shared/simperoTypes";

interface DraftMemoPaneProps {
  memoTyped: Partial<ICMemoResult> | null;
}

// ---------------------------------------------------------------------------
// Shared card shell — mirrors CapTableTab.tsx's/FindingsTab.tsx's own
// module-private `SectionCard`, matching those files' precedent of a
// one-site helper per tab/pane rather than a shared extraction.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  icon,
  children,
  className,
}: {
  eyebrow: ReactNode;
  icon?: ReactNode;
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
        <span className="font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
          {eyebrow}
        </span>
      </div>
      {children}
    </div>
  );
}

const SEVERITY_ORDER: Record<"H" | "M" | "L", number> = { H: 0, M: 1, L: 2 };
const SEVERITY_LABEL: Record<"H" | "M" | "L", string> = { H: "High", M: "Medium", L: "Low" };
const SEVERITY_CHIP: Record<"H" | "M" | "L", string> = {
  H: "bg-[color:var(--rev-tint-danger)] text-[color:var(--rev-danger)] border border-[color:var(--rev-border)]",
  M: "bg-[color:var(--rev-tint-warning)] text-[color:var(--rev-warning)] border border-[color:var(--rev-border)]",
  L: "bg-[color:var(--rev-tint-neutral)] text-[color:var(--rev-text-6)] border border-[color:var(--rev-border)]",
};

// Top-N cap for the risks summary — this is a condensed callout, not a
// replacement for Summary tab's full Risk Assessment table (governance
// flags + full mitigation detail per risk).
const TOP_RISKS_LIMIT = 5;

function collectDraftMemoCorroboration(memoTyped: Partial<ICMemoResult> | null): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const d = memoTyped?.deliverable;
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };
  if (!d) return empty;

  const fields: Array<Sourced<unknown> | undefined> = [
    d.icRecommendation?.prose,
    d.investmentThesisCards,
    d.riskRegister,
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

/**
 * Diligence Workspace → Draft Memo pane. Per the plan's field-reuse
 * judgment call:
 *  - Recommendation ← `icRecommendation.prose` only. `highlightBullets` on
 *    the same field is already repurposed by SummaryTab.tsx as "Critical
 *    Questions for Management Meeting" (a different framing of the same raw
 *    bullets) — reusing it again here for a third purpose would be
 *    confusingly inconsistent, so this pane sticks to prose alone.
 *  - Key Deal Merits ← `investmentThesisCards`, the same field SummaryTab's
 *    "Investment Thesis" section renders in full (numbered cards, full
 *    bullet lists, per-card citation). These cards genuinely *are* the
 *    deal's merits, so reusing the field is the right call — rendered here
 *    as a condensed one-line-per-theme list instead, so it reads as a
 *    summary rather than a duplicate of Summary's full treatment.
 *  - Key Deal Risks ← `riskRegister`, the same field SummaryTab's "Risk
 *    Assessment" table folds together with governance_flags (full
 *    factor/severity/detail table). Condensed here to the top 5 by
 *    severity, name + severity chip only, no mitigation detail — distinct
 *    enough to read as a summary rather than a duplicate table.
 */
export function DraftMemoPane({ memoTyped }: DraftMemoPaneProps) {
  const d = memoTyped?.deliverable;
  const corroboration = useMemo(() => collectDraftMemoCorroboration(memoTyped), [memoTyped]);

  const prose = d?.icRecommendation?.prose;
  const hasProse = prose && prose.provenance !== "missing" && prose.value != null;

  const thesisCards = (
    d?.investmentThesisCards?.provenance !== "missing" ? d?.investmentThesisCards?.value : []
  ) as Array<{ theme: string; bullets: string[] | SourcedSentence[] }> | undefined;
  const merits = (thesisCards ?? []).map((card) => ({
    theme: card.theme,
    firstBullet: card.bullets.length > 0 ? proseFieldToString(card.bullets[0]) : "",
  }));

  const riskRows = (
    d?.riskRegister?.provenance !== "missing" ? d?.riskRegister?.value : []
  ) as Array<{ risk: string; severity: "H" | "M" | "L" }> | undefined;
  const topRisks = [...(riskRows ?? [])]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, TOP_RISKS_LIMIT);

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <p className="text-[12.5px] text-[color:var(--rev-text-6)]">
          Generated from: {memoTyped?.fileName ?? "source document"}. This is a starting draft, not a final document.
        </p>
      </div>

      <SectionCard eyebrow="Recommendation" icon={<FileText className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        {!hasProse ? (
          <MissingDataPlaceholder gapRef={prose?.gapRef} reason={prose?.reason} />
        ) : (
          <p className="whitespace-pre-line text-[14px] leading-[1.8] text-[color:var(--rev-text-3)]">
            <SourcedValue sourced={prose!} fieldLabel="IC Recommendation" />
          </p>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard eyebrow="Key Deal Merits" icon={<Plus className="h-4 w-4 text-[color:var(--rev-success)]" />}>
          {merits.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="Merits not yet extracted"
              description="Investment thesis themes will appear here once the source document is processed."
              className="border-none p-0"
            />
          ) : (
            <ul className="space-y-2">
              {merits.map((m, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-[color:var(--rev-text-3)]">
                  <span className="mt-0.5 shrink-0 font-semibold text-[color:var(--rev-success)]">+</span>
                  <span>
                    <span className="font-semibold text-[color:var(--rev-text-1)]">{m.theme}</span>
                    {m.firstBullet ? <>{" — "}{m.firstBullet}</> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard eyebrow="Key Deal Risks" icon={<Minus className="h-4 w-4 text-[color:var(--rev-danger)]" />}>
          {topRisks.length === 0 ? (
            <EmptyState
              icon={Minus}
              title="Risks not yet extracted"
              description="Risk register entries will appear here once the source document is processed."
              className="border-none p-0"
            />
          ) : (
            <ul className="space-y-2">
              {topRisks.map((r, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[13.5px] leading-relaxed text-[color:var(--rev-text-3)]">
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      SEVERITY_CHIP[r.severity]
                    )}
                  >
                    {SEVERITY_LABEL[r.severity]}
                  </span>
                  <span>{r.risk}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="rounded-xl border border-dashed border-[color:var(--rev-border)] bg-[color:var(--rev-tint-neutral-subtle)] px-5 py-3.5 text-[12px] leading-relaxed text-[color:var(--rev-text-7)]">
        Pulls from initial screening synthesis and analyst notes on file. A memo-template upload flow (Data Room) will
        let future drafts follow your firm&apos;s format once that pane is wired up.
      </div>

      <CorroborationPanel
        items={corroboration.items}
        verifiedCount={corroboration.verifiedCount}
        partialCount={corroboration.partialCount}
        unverifiedCount={corroboration.unverifiedCount}
      />
    </div>
  );
}
