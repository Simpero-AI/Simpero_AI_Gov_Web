import { Target } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { cn } from "@/lib/utils";
import { TONE_COLOR, type ScreeningCriterion, type ScreeningMandateFit } from "./types";

export interface MandateFitPanelProps {
  fit: ScreeningMandateFit | null;
  className?: string;
}

function CriterionRow({ criterion }: { criterion: ScreeningCriterion }) {
  const color = TONE_COLOR[criterion.status];
  return (
    <div className="mb-2 flex items-start gap-2.5 rounded-lg px-2.5 py-2" style={{ background: `color-mix(in srgb, ${color} 8%, white)` }}>
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[color:var(--rev-text-2)]">{criterion.label}</div>
        <div className="mt-0.5 text-xs leading-relaxed" style={{ color }}>
          {criterion.detail}
        </div>
        {criterion.citation ? (
          <div className="mt-0.5 text-[10.5px] italic leading-tight text-[color:var(--rev-text-7)]">&ldquo;{criterion.citation}&rdquo;</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Mandate-fit sidebar card (fit bar + pass/review/fail counts, Investment Fit
 * criteria = green signals, Deal Breakers criteria). Fed by mapScreening from
 * GET /deals/{id}/screening; `fit` is `null` until the deal has been screened.
 */
export function MandateFitPanel({ fit, className }: MandateFitPanelProps) {
  if (!fit) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
          className
        )}
      >
        <EmptyState
          icon={Target}
          title="Mandate fit coming soon"
          description="Pass/review/fail scoring against your investment mandate's criteria and financial thresholds will appear here."
          className="m-4 border-none"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <div className="border-b border-[color:var(--rev-border-subtle)] px-5 py-4">
        <div className="mb-2.5 font-mono text-[9.5px] uppercase tracking-wider text-[color:var(--rev-text-6)]">
          {fit.fundLabel} · Mandate Fit
        </div>
        <div className="mb-2.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--rev-tint-neutral)]">
          <div
            className="h-full rounded-full bg-[color:var(--rev-primary)]"
            style={{ width: `${Math.min(100, Math.max(0, fit.fitPct))}%` }}
          />
        </div>
        <div className="flex items-center gap-3.5 text-xs text-[color:var(--rev-text-4)]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR.pass }} />
            {fit.passCount} pass
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR.review }} />
            {fit.reviewCount} review
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR.fail }} />
            {fit.failCount} fail
          </span>
        </div>
      </div>

      <div className="border-b border-[color:var(--rev-border-subtle)] px-5 py-4">
        <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-[color:var(--rev-text-4)]">
          Investment Fit
        </div>
        {fit.fitCriteria.map((c) => (
          <CriterionRow key={c.label} criterion={c} />
        ))}
      </div>

      <div className="px-5 py-4">
        <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-[color:var(--rev-text-4)]">
          Deal Breakers
        </div>
        {fit.thresholdCriteria.map((c) => (
          <CriterionRow key={c.label} criterion={c} />
        ))}
      </div>
    </div>
  );
}
