import { formatBpAsPct, formatUsdShort } from "@/lib/dealMetricsFormat";
import { cn } from "@/lib/utils";

/**
 * How a tracked decline has aged since we passed — mirrors the mockup's
 * `catMeta` (Meridian Diligence.dc.html `buildAntiPortfolio()`): whether the
 * company went on to do well without us (`validated` — good pass), poorly
 * (`missed` — we should've done it), stayed flat (`neutral`), or has no
 * public update yet (`pending`).
 */
export type AntiPortfolioCategory = "validated" | "missed" | "neutral" | "pending";

const CATEGORY_META: Record<AntiPortfolioCategory, { label: string; fg: string; bg: string }> = {
  validated: { label: "Validated pass", fg: "text-[color:var(--rev-success)]", bg: "bg-[color:var(--rev-tint-success)]" },
  missed: { label: "Missed opportunity", fg: "text-[color:var(--rev-danger)]", bg: "bg-[color:var(--rev-tint-danger)]" },
  neutral: { label: "Roughly flat", fg: "text-[color:var(--rev-warning)]", bg: "bg-[color:var(--rev-tint-warning)]" },
  pending: { label: "Tracking pending", fg: "text-[color:var(--rev-text-5)]", bg: "bg-[color:var(--rev-tint-neutral)]" },
};

/**
 * One tracked decline (a deal we passed on, tracked against what actually
 * happened). No backend endpoint produces this shape yet — see
 * tmp/backend-prompts.md prompt 4 and docs/plans/2026-08-12-web-design-
 * revamp.md §4c. Defined here so the card is ready to wire the moment that
 * data exists, rather than re-deriving the shape later.
 */
export interface DeclineRecord {
  id: string;
  name: string;
  sector: string;
  /** ISO date string — when the deal was passed on. */
  passedDate: string;
  /** Free-text reason captured at decline time (e.g. screening's reject note). */
  reason: string;
  category: AntiPortfolioCategory;
  /** USD cents, dealMetricsFormat.ts convention. Null when not yet known. */
  valuationAtPassCents: number | null;
  /** USD cents. Null when no later valuation has been tracked. */
  valuationNowCents: number | null;
  /** Basis points change from valuationAtPass to valuationNow. Null when not yet known. */
  changeBp: number | null;
  /** Freeform current status line, e.g. "Raised Series C at 3x" or "No public update tracked yet". */
  statusNow: string;
  /** Analyst note on the outcome. */
  note: string;
}

export interface DeclineCardProps {
  record: DeclineRecord;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function DeclineCard({ record, className }: DeclineCardProps) {
  const meta = CATEGORY_META[record.category];
  const changeLabel =
    record.changeBp == null ? "Not yet known" : `${record.changeBp > 0 ? "+" : ""}${formatBpAsPct(record.changeBp)} since pass`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <div className="flex items-center gap-3.5 border-b border-[color:var(--rev-border-subtle)] px-5 py-4">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] bg-[color:var(--rev-tint-primary)] font-mono text-[13px] font-semibold text-[color:var(--rev-primary)]">
          {initials(record.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-[color:var(--rev-text-1)]">{record.name}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-[color:var(--rev-text-6)]">
            {record.sector} · Passed {new Date(record.passedDate).toLocaleDateString()} · {record.reason}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
            meta.bg,
            meta.fg
          )}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 px-5 py-4">
        <div>
          <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">Valuation at pass</p>
          <p className="text-[15px] font-medium text-[color:var(--rev-text-1)]">
            {record.valuationAtPassCents == null ? "—" : formatUsdShort(record.valuationAtPassCents)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">Valuation now</p>
          <p className="text-[15px] font-medium text-[color:var(--rev-text-1)]">
            {record.valuationNowCents == null ? "—" : formatUsdShort(record.valuationNowCents)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">Change since pass</p>
          <p className={cn("text-[15px] font-semibold", meta.fg)}>{changeLabel}</p>
        </div>
        <div>
          <p className="mb-1 text-[11px] text-[color:var(--rev-text-7)]">Status</p>
          <p className="text-sm text-[color:var(--rev-text-3)]">{record.statusNow}</p>
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="rounded-lg border border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[color:var(--rev-text-4)]">
          {record.note}
        </p>
      </div>
    </div>
  );
}
