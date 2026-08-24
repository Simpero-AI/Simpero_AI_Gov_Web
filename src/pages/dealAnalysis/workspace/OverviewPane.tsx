import { useMemo, type ReactNode } from "react";
import { Compass, FileText, Flag, ShieldAlert, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadialProgress } from "@/components/mvp/primitives/RadialProgress";
import { LabeledBarRow } from "@/components/mvp/primitives/BarRow";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import {
  CorroborationPanel,
  type CorroborationSourceItem,
} from "@/components/mvp/analysis/CorroborationPanel";
import type { ICMemoResult, Sourced } from "@shared/simperoTypes";
import {
  ALL_DD_CATEGORIES,
  computeDiligenceProgress,
  computeRiskProfile,
  type DdCategory,
} from "../dealAnalysisUtils";

interface OverviewPaneProps {
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

const SEVERITY_BAR_COLOR: Record<"H" | "M" | "L", string> = {
  H: "var(--rev-danger)",
  M: "var(--rev-warning)",
  L: "var(--rev-text-7)",
};

function collectOverviewCorroboration(memoTyped: Partial<ICMemoResult> | null): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };
  const dd = memoTyped?.deliverable?.dueDiligenceSummary;
  const riskRegister = memoTyped?.deliverable?.riskRegister;
  if (!dd && !riskRegister) return empty;

  const fields: Array<Sourced<unknown> | undefined> = [];
  (dd?.categories ?? []).forEach((cat) => {
    fields.push(cat.status, cat.findings, cat.completenessPct, cat.flaggedCount);
  });
  if (dd?.conclusion) fields.push(dd.conclusion);
  if (riskRegister) fields.push(riskRegister);

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

function fileExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "FILE" : fileName.slice(dot + 1).toUpperCase();
}

/**
 * Diligence Workspace → Overview pane. Mockup wants a diligence-progress
 * ring, risk profile (H/M/L), per-category workstream progress, top open
 * findings, and recent documents — see docs/plans/2026-08-12-web-design-
 * revamp.md §3 Phase 6. Every section below is derived from real
 * `ICMemoDeliverable` fields (dueDiligenceSummary, riskRegister, fileName)
 * except "Top open findings", which has zero backend today — see
 * FindingsTab.tsx's own comment for why, reused here verbatim rather than a
 * differently-styled empty state.
 */
export function OverviewPane({ memoTyped }: OverviewPaneProps) {
  const corroboration = useMemo(() => collectOverviewCorroboration(memoTyped), [memoTyped]);

  const { categories, completeCount, inReviewCount, notStartedCount, progressPct } = useMemo(
    () => computeDiligenceProgress(memoTyped),
    [memoTyped]
  );
  const { riskCounts, totalRisks, overallRiskLevel, overallRiskColor } = useMemo(
    () => computeRiskProfile(memoTyped),
    [memoTyped]
  );

  // Recent documents — a deal has at most one tracked source file today (no
  // `GET /deals/{id}/documents` listing endpoint exists yet), same
  // constraint MaterialsCard.tsx works within on the Screening tab.
  const fileName = memoTyped?.fileName ?? null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Diligence Progress */}
        <SectionCard eyebrow="Diligence Progress" icon={<Compass className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          {categories.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="Diligence summary not yet extracted"
              description="Per-category status, findings, and completeness will appear here once the source document is processed."
              className="border-none p-0"
            />
          ) : (
            <div className="flex items-center gap-6">
              <RadialProgress size="lg" value={progressPct} caption="complete" />
              <div className="flex flex-1 flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--rev-success)" }} />
                  <span className="flex-1 text-[13px] text-[color:var(--rev-text-4)]">Complete</span>
                  <span className="font-mono text-[13px] text-[color:var(--rev-text-1)]">{completeCount}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--rev-warning)" }} />
                  <span className="flex-1 text-[13px] text-[color:var(--rev-text-4)]">In review</span>
                  <span className="font-mono text-[13px] text-[color:var(--rev-text-1)]">{inReviewCount}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--rev-text-7)" }} />
                  <span className="flex-1 text-[13px] text-[color:var(--rev-text-4)]">Not started</span>
                  <span className="font-mono text-[13px] text-[color:var(--rev-text-1)]">{notStartedCount}</span>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Risk Profile */}
        <SectionCard eyebrow="Risk Profile" icon={<ShieldAlert className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          {totalRisks === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No risks registered yet"
              description="Severity-tagged risks from the source document's risk register will appear here once available."
              className="border-none p-0"
            />
          ) : (
            <>
              <div className="mb-4 flex items-baseline gap-2.5">
                <span className="font-serif text-[26px]" style={{ color: overallRiskColor }}>
                  {overallRiskLevel}
                </span>
                <span className="text-[13px] text-[color:var(--rev-text-7)]">overall exposure</span>
              </div>
              <div className="flex flex-col gap-3">
                <LabeledBarRow
                  label="High"
                  value={riskCounts.H}
                  pct={totalRisks > 0 ? (riskCounts.H / totalRisks) * 100 : 0}
                  color={SEVERITY_BAR_COLOR.H}
                />
                <LabeledBarRow
                  label="Medium"
                  value={riskCounts.M}
                  pct={totalRisks > 0 ? (riskCounts.M / totalRisks) * 100 : 0}
                  color={SEVERITY_BAR_COLOR.M}
                />
                <LabeledBarRow
                  label="Low"
                  value={riskCounts.L}
                  pct={totalRisks > 0 ? (riskCounts.L / totalRisks) * 100 : 0}
                  color={SEVERITY_BAR_COLOR.L}
                />
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Workstream Progress — per-category completenessPct. The mockup
          renders a "done/total task" count per category; that count doesn't
          exist on dueDiligenceSummary (only a single completenessPct number
          per category), so this shows the real percentage instead of
          fabricating task counts. Categories absent from the data are shown
          as "Not started" rather than a fabricated 0% bar with no label. */}
      <SectionCard eyebrow="Workstream Progress" icon={<Workflow className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
        <div className="flex flex-col gap-3">
          {ALL_DD_CATEGORIES.map((category: DdCategory) => {
            const cat = categories.find((c) => c.category === category);
            const pct = cat?.completenessPct.provenance !== "missing" ? cat?.completenessPct.value : undefined;
            return (
              <LabeledBarRow
                key={category}
                label={category}
                labelClassName="w-[150px]"
                value={pct != null ? `${pct}%` : "—"}
                pct={pct ?? 0}
                color={pct != null ? "var(--rev-primary)" : "var(--rev-border)"}
              />
            );
          })}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Open Findings — no findings-register backend exists yet
            (same gap FindingsTab.tsx documents); reusing that tab's exact
            empty/disabled framing rather than a differently-styled one. */}
        <SectionCard
          eyebrow="Top Open Findings"
          icon={<Flag className="h-4 w-4 text-[color:var(--rev-primary)]" />}
          action={<span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">Not yet wired to a backend</span>}
        >
          <EmptyState
            icon={Flag}
            title="No findings logged yet"
            description="Open findings, most severe first, will appear here once the findings register (Findings tab) is wired up to a backend."
            className="border-none p-0"
          />
        </SectionCard>

        {/* Recent Documents — real, single tracked source file per deal. */}
        <SectionCard eyebrow="Recent Documents" icon={<FileText className="h-4 w-4 text-[color:var(--rev-primary)]" />}>
          {!fileName ? (
            <EmptyState
              icon={FileText}
              title="No documents uploaded yet"
              description="Documents submitted via New Deal intake will appear here."
              className="border-none p-0"
            />
          ) : (
            <div className="flex items-center gap-3 rounded-[10px] border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral-subtle)] px-4 py-3">
              <span className="shrink-0 rounded-[5px] bg-[color:var(--rev-tint-neutral)] px-1.5 py-1 font-mono text-[9px] font-semibold text-[color:var(--rev-text-4)]">
                {fileExt(fileName)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-[color:var(--rev-text-2)]">{fileName}</span>
            </div>
          )}
        </SectionCard>
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
