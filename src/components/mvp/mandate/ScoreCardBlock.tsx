import { useState } from "react";
import { Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoringResult } from "@shared/simperoTypes";

// ── Score colour helpers ───────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-700 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

// ── Empty / error states ───────────────────────────────────────────────────

function EmptyScorecard() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-lg">
      <Sliders className="w-8 h-8 mb-3 text-muted-foreground" />
      <p className="font-semibold text-sm text-foreground mb-1">No score yet</p>
      <p className="text-xs text-muted-foreground max-w-sm">
        Use the "Score this deal" button above, or set up your{" "}
        <a href="/mandate-scorecard/framework" className="underline hover:text-foreground">
          Investment Framework
        </a>{" "}
        first.
      </p>
    </div>
  );
}

function FailedScorecard() {
  return (
    <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
      <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">⚠️ Scoring failed</p>
      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
        The AI scoring pipeline encountered an error. Use the "Score this deal" button to retry, or check your{" "}
        <a href="/mandate-scorecard/framework" className="underline">Investment Framework</a> has categories configured.
      </p>
    </div>
  );
}

export function NotConfiguredScorecard() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-lg">
      <Sliders className="w-8 h-8 mb-3 text-muted-foreground" />
      <p className="font-semibold text-sm text-foreground mb-1">Investment Framework not configured</p>
      <p className="text-xs text-muted-foreground max-w-sm">
        Define your scoring categories and criteria in{" "}
        <a href="/mandate-scorecard/framework" className="underline hover:text-foreground">
          Mandate &amp; Scorecard → Scoring Framework
        </a>{" "}
        to enable AI deal scoring.
      </p>
    </div>
  );
}

// ── Category row ───────────────────────────────────────────────────────────

interface CategoryRowProps {
  cs: ScoringResult["categoryScores"][number];
  defaultOpen?: boolean;
}

function CategoryRow({ cs, defaultOpen = false }: CategoryRowProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="flex-1 text-sm font-semibold text-foreground">{cs.categoryName}</span>
        <span className="text-[10px] text-muted-foreground">weight {cs.categoryWeight}%</span>
        <span className={cn("text-base font-bold w-10 text-right", scoreColor(cs.score))}>{cs.score}</span>
        <span className="text-muted-foreground text-xs">{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div className="border-t border-border bg-white dark:bg-background">
          {cs.criterionScores.map((cr) => (
            <div key={cr.criterionId} className="flex gap-3 items-start px-4 py-2.5 border-b border-muted last:border-b-0 pl-8">
              <span className={cn("text-sm font-bold min-w-[2rem] tabular-nums", scoreColor(cr.score))}>
                {cr.score}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground mb-0.5">{cr.criterionName}</p>
                {cr.sourceQuote && (
                  <p className={cn("text-[10px] text-muted-foreground mb-1 border-l-2 pl-2", scoreColor(cr.score).replace("text-", "border-"))}>
                    <em>"{cr.sourceQuote}"</em>
                  </p>
                )}
                <p className="text-[11px] text-foreground/80">{cr.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Full scorecard ─────────────────────────────────────────────────────────

function LoadedScorecard({ sr }: { sr: ScoringResult }) {
  const totalCriteria = sr.categoryScores.reduce((s, cs) => s + cs.criterionScores.length, 0);
  const scoredCriteria = sr.categoryScores.reduce(
    (s, cs) => s + cs.criterionScores.filter((cr) => cr.score > 0).length,
    0
  );
  const completionPct = totalCriteria > 0 ? Math.round((scoredCriteria / totalCriteria) * 100) : 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden text-sm">
      {/* Header bar */}
      <div className="bg-slate-900 text-white px-4 py-4 flex gap-6 items-center">
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">AI Score</p>
          <p className="text-2xl font-bold text-white">
            {sr.aiScore} <span className="text-sm font-normal text-slate-400">/ 100</span>
          </p>
          <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full">
            <div className={cn("h-full rounded-full", scoreBarColor(sr.aiScore))} style={{ width: `${sr.aiScore}%` }} />
          </div>
        </div>
        <div className="w-px bg-slate-700 self-stretch" />
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Mandate Fit</p>
          {sr.mandateDimensions.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-white">
                {sr.mandateFitPct} <span className="text-sm font-normal text-slate-400">%</span>
              </p>
              <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${sr.mandateFitPct}%` }} />
              </div>
            </>
          ) : (
            <p className="text-2xl font-bold text-slate-500">N/A</p>
          )}
        </div>
        <div className="w-px bg-slate-700 self-stretch" />
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Completion</p>
          <p className="text-2xl font-bold text-white">
            {completionPct} <span className="text-sm font-normal text-slate-400">%</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{scoredCriteria} / {totalCriteria} criteria</p>
        </div>
        <div className="w-px bg-slate-700 self-stretch" />
        <div className="text-right">
          <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Scored at</p>
          <p className="text-[11px] text-slate-300">{new Date(sr.scoredAt).toLocaleString()}</p>
          {sr.dealBreakerTriggered && sr.mandateDimensions.length > 0 && sr.mandateFitPct === 0 && (
            <p className="text-[10px] text-red-400 mt-1 font-semibold">⚠ Deal-breaker triggered</p>
          )}
        </div>
      </div>

      {/* Category rows */}
      <div>
        {sr.categoryScores.map((cs, i) => (
          <CategoryRow key={cs.categoryId} cs={cs} defaultOpen={i === 0} />
        ))}
      </div>

      {/* Mandate fit dimensions */}
      {sr.mandateDimensions.length > 0 && (
        <div className="border-t-2 border-border px-4 py-3">
          <p className="text-xs font-semibold text-foreground mb-2">Mandate Fit Dimensions</p>
          <ul className="space-y-1.5">
            {sr.mandateDimensions.map((dim) => (
              <li key={dim.dimension} className="flex items-start gap-2 text-[11px]">
                <span className={cn("mt-0.5 font-bold", dim.fits ? "text-green-600" : "text-red-600")}>
                  {dim.fits ? "✓" : "✗"}
                </span>
                <span>
                  <span className="font-medium">{dim.dimension}</span>
                  {dim.rationale && ` — ${dim.rationale}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings (partial failure) */}
      {sr.warnings && sr.warnings.length > 0 && (
        <div className="border-t border-border px-4 py-2 bg-amber-50 dark:bg-amber-950/20">
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            ⚠ Partial scoring: {sr.warnings.join("; ")}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main export — props-driven, no queries ─────────────────────────────────

interface DealScorecardPanelProps {
  scoringResult: ScoringResult | null | undefined;
  pass4Failed?: boolean;
}

export function DealScorecardPanel({ scoringResult, pass4Failed }: DealScorecardPanelProps) {
  // Partial results beat an error state — show what we have with a warning banner.
  if (scoringResult) return <LoadedScorecard sr={scoringResult} />;
  if (pass4Failed) return <FailedScorecard />;
  return <EmptyScorecard />;
}
