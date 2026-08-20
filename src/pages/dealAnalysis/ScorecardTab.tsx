import { useMemo, type ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle, Loader2, Shield, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/mvp/primitives/sonner";
import { Button } from "@/components/mvp/primitives/button";
import { RadialProgress } from "@/components/mvp/primitives/RadialProgress";
import {
  CorroborationPanel,
  type CorroborationSourceItem,
} from "@/components/mvp/analysis/CorroborationPanel";
import { DealScorecardPanel, NotConfiguredScorecard } from "@/components/mvp/mandate/ScoreCardBlock";
import { ROUTES } from "@/components/mvp/nav/mvpNav";
import { trpc } from "@/lib/trpc";
import type { ComplianceScorecard, ICMemoResult } from "@shared/simperoTypes";
import type { FrameworkResult } from "@shared/complianceFrameworks";

interface ScorecardTabProps {
  memoTyped: Partial<ICMemoResult> | null;
  sessionId: string | null;
  dealId: string;
}

// ---------------------------------------------------------------------------
// Shared card shell — mirrors SummaryTab.tsx's `SectionCard` (mockup's
// white/bordered/shadowed card + mono uppercase eyebrow). Duplicated rather
// than imported: SummaryTab's version is a deliberate module-private,
// one-site helper (see its own comment); extracting a shared primitive now
// that there are two call sites is a judgment call outside this restyle's
// scope, so this file keeps its own copy for now.
// ---------------------------------------------------------------------------

function SectionCard({
  eyebrow,
  action,
  children,
  className,
}: {
  eyebrow: ReactNode;
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
        <span className="flex-1 font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
          {eyebrow}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corroboration — derives real Verified/Partial/Unverified counts from the
// Compliance Summary's own claim-verification tallies (plan §3 item 4),
// same "use real per-field data, don't fabricate" approach SummaryTab
// established: claimsMatched are the claims that matched a source citation
// ("verified"), claimsFlagged are claims a reviewer flagged as
// unsupported/contradicted ("unverified"), and any remainder is extracted
// but neither confirmed nor flagged ("partial").
// ---------------------------------------------------------------------------

function collectScorecardCorroboration(
  sc: ComplianceScorecard | undefined,
  fileName: string | null | undefined
): {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
} {
  const empty = { items: [] as CorroborationSourceItem[], verifiedCount: 0, partialCount: 0, unverifiedCount: 0 };
  if (!sc || sc.claimsExtracted === 0) return empty;

  const verified = sc.claimsMatched;
  const unverified = sc.claimsFlagged;
  const partial = Math.max(0, sc.claimsExtracted - verified - unverified);

  return {
    items: [{ id: "source-doc", name: fileName ?? "Source document", kind: "document", citeCount: sc.claimsExtracted }],
    verifiedCount: verified,
    partialCount: partial,
    unverifiedCount: unverified,
  };
}

export function ScorecardTab({ memoTyped, sessionId, dealId }: ScorecardTabProps) {
  const utils = trpc.useUtils();
  const profileQuery = trpc.investmentProfile.get.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const rescoreMutation = trpc.memo.rescore.useMutation({
    // ponytail: trpc.deals.get still expects the frozen legacy numeric dealId
    // (untouched, Phase 3 territory) — this invalidate is a no-op against the
    // new UUID deal space until this file migrates off tRPC.
    onSuccess: () => { void utils.deals.get.invalidate({ dealId: Number(dealId) }); },
    onError: (err) => toast.error(err.message || "Scoring failed"),
  });

  const profile = profileQuery.data;
  const hasFramework = Array.isArray((profile?.weights?.["framework"] as { categories?: unknown[] } | undefined)?.categories) &&
    ((profile!.weights["framework"] as { categories: unknown[] }).categories.length > 0);
  const hasScoringResult = Boolean(memoTyped?.scoringResult);
  const hasFailed = Boolean(memoTyped?.pass4Failed);

  const sr = memoTyped?.scoringResult;
  // Same completion formula as ScoreCardBlock's internal header bar — kept
  // in sync deliberately since that component's internals aren't editable
  // here (shared with the legacy MemoDeliverable page, see below).
  const completion = useMemo(() => {
    if (!sr) return null;
    const total = sr.categoryScores.reduce((s, cs) => s + cs.criterionScores.length, 0);
    const scored = sr.categoryScores.reduce(
      (s, cs) => s + cs.criterionScores.filter((cr) => cr.score > 0).length,
      0
    );
    return { total, scored, pct: total > 0 ? Math.round((scored / total) * 100) : 0 };
  }, [sr]);

  const sc = memoTyped?.scorecard;
  const corroboration = useMemo(
    () => collectScorecardCorroboration(sc, memoTyped?.fileName),
    [sc, memoTyped?.fileName]
  );

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[color:var(--rev-text-6)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }
  if (profileQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-[color:var(--rev-warning)]" />
        <p className="text-sm font-medium text-[color:var(--rev-text-2)]">Failed to load investment profile</p>
        <p className="text-xs text-[color:var(--rev-text-6)]">{profileQuery.error?.message ?? "An unexpected error occurred."}</p>
        <Button variant="outline" size="sm" onClick={() => void profileQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  if (!profile || !hasFramework) {
    return <NotConfiguredScorecard />;
  }

  const finraStatus = sc?.finra3110Status;
  const finraCfg = finraStatus === "COMPLIANT"
    ? { tint: "var(--rev-tint-success)", tone: "var(--rev-success)", icon: ShieldCheck, label: "COMPLIANT" }
    : finraStatus === "REVIEW_REQUIRED"
    ? { tint: "var(--rev-tint-warning)", tone: "var(--rev-warning)", icon: AlertTriangle, label: "REVIEW REQUIRED" }
    : finraStatus === "NON_COMPLIANT"
    ? { tint: "var(--rev-tint-danger)", tone: "var(--rev-danger)", icon: AlertTriangle, label: "NON-COMPLIANT" }
    : null;
  const frameworkResults: FrameworkResult[] = sc?.frameworkResults ?? [];

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => sessionId && rescoreMutation.mutate({ sessionId })}
          disabled={!sessionId || rescoreMutation.isPending}
          size="sm"
          variant={hasScoringResult ? "outline" : "default"}
        >
          {rescoreMutation.isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scoring…</>
            : <><Zap className="mr-2 h-4 w-4" />{hasScoringResult ? "Re-score" : hasFailed ? "Retry scoring" : "Score this deal"}</>}
        </Button>
        {rescoreMutation.error && (
          <p className="text-xs text-[color:var(--rev-danger)]">{rescoreMutation.error.message}</p>
        )}
      </div>

      {memoTyped?.scoringResult?.criterionIdMismatchWarning && (
        <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs" style={{ background: "var(--rev-tint-warning)", borderColor: "color-mix(in srgb, var(--rev-warning) 30%, white)", color: "var(--rev-warning)" }}>
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Scoring may be inaccurate — some criterion IDs from the AI response didn&apos;t match your framework configuration.</span>
        </div>
      )}

      {/* AI scoring breakdown + Overall Score / Completion sidebar */}
      <div className={cn("grid items-start gap-5", sr ? "grid-cols-[1.6fr_1fr]" : "grid-cols-1")}>
        <div>
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
            AI Scoring Breakdown
          </p>
          {/* DealScorecardPanel is shared with the legacy MemoDeliverable
              viewer page (src/pages/MemoDeliverable.tsx) — its internals
              (including its own AI Score / Mandate Fit / Completion header
              bar) are intentionally left untouched per the revamp plan;
              only this call site's surrounding chrome is restyled. */}
          <DealScorecardPanel
            scoringResult={memoTyped?.scoringResult}
            pass4Failed={memoTyped?.pass4Failed}
          />
        </div>

        {sr && completion && (
          <div
            className="flex flex-col gap-5 rounded-xl p-6 text-white"
            style={{ background: "var(--mvp-sidebar-bg)" }}
          >
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: "var(--mvp-sidebar-muted)" }}>
                Overall Score
              </p>
              <div className="mt-3 flex justify-center">
                <RadialProgress size="lg" value={sr.aiScore} valueLabel={sr.aiScore} caption="/ 100" />
              </div>
            </div>

            <div className="h-px w-full bg-white/10" />

            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: "var(--mvp-sidebar-muted)" }}>
                Completion
              </p>
              <div className="mt-3 flex flex-col items-center gap-2">
                <RadialProgress size="sm" value={completion.pct} />
                <p className="font-mono text-[11px]" style={{ color: "var(--mvp-sidebar-muted)" }}>
                  {completion.scored}/{completion.total} criteria scored
                </p>
              </div>
            </div>

            {/* Deal Scorecard tab (Phase 7) — manual per-criterion scoring,
                pre-selected to this deal via the ?dealId= query param. */}
            <Link
              to={`${ROUTES.mandateScorecardScorecard}?dealId=${encodeURIComponent(dealId)}`}
              className="rounded-lg border border-white/20 px-3 py-2.5 text-center text-[13px] text-white transition-colors hover:bg-white/10"
            >
              Edit scores in Mandate &amp; Scorecard →
            </Link>
          </div>
        )}
      </div>

      {/* Compliance Summary */}
      {sc && (
        <SectionCard
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-[color:var(--rev-primary)]" />
              Compliance Summary
            </span>
          }
        >
          <div className="space-y-4">
            {/* FINRA 3110 status */}
            {finraCfg && (() => {
              const FIcon = finraCfg.icon;
              return (
                <div
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                  style={{ background: finraCfg.tint, borderColor: `color-mix(in srgb, ${finraCfg.tone} 30%, white)` }}
                >
                  <FIcon className="h-5 w-5 shrink-0" style={{ color: finraCfg.tone }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: finraCfg.tone }}>FINRA Rule 3110</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: finraCfg.tone }}>Written Supervisory Procedures — claim verification review</p>
                  </div>
                  <span
                    className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: `color-mix(in srgb, ${finraCfg.tone} 18%, white)`, color: finraCfg.tone }}
                  >
                    {finraCfg.label}
                  </span>
                </div>
              );
            })()}

            {/* Claim stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Extracted", value: sc.claimsExtracted, color: "var(--rev-text-2)" },
                { label: "Verified", value: sc.claimsMatched, color: "var(--rev-success)" },
                { label: "Flagged", value: sc.claimsFlagged, color: sc.claimsFlagged > 0 ? "var(--rev-warning)" : "var(--rev-text-7)" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] px-3 py-2.5 text-center"
                >
                  <p className="font-mono text-xl font-semibold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-[color:var(--rev-text-6)]">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Framework results */}
            {frameworkResults.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">Framework Results</p>
                <div className="space-y-1.5">
                  {frameworkResults.map((fr) => {
                    const fCfg = fr.status === "COMPLIANT"
                      ? { tone: "var(--rev-success)", tint: "var(--rev-tint-success)" }
                      : fr.status === "REVIEW_REQUIRED"
                      ? { tone: "var(--rev-warning)", tint: "var(--rev-tint-warning)" }
                      : { tone: "var(--rev-danger)", tint: "var(--rev-tint-danger)" };
                    return (
                      <div
                        key={fr.frameworkId}
                        className="flex items-center gap-3 rounded-lg border border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] px-3 py-2"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: fCfg.tone }} />
                        <span className="flex-1 text-xs font-medium text-[color:var(--rev-text-2)]">{fr.shortName}</span>
                        {fr.relevantHFlags > 0 && (
                          <span className="text-[10px] font-semibold" style={{ color: "var(--rev-danger)" }}>
                            {fr.relevantHFlags} HIGH flag{fr.relevantHFlags > 1 ? "s" : ""}
                          </span>
                        )}
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: fCfg.tint, color: fCfg.tone }}
                        >
                          {fr.status === "COMPLIANT" ? "OK" : fr.status === "REVIEW_REQUIRED" ? "Review" : "Non-compliant"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
