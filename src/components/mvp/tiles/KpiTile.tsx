import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTileTint = "primary" | "success" | "warning" | "danger" | "info";

const TINT_CLASSES: Record<KpiTileTint, { bg: string; fg: string }> = {
  primary: { bg: "bg-[color:var(--rev-tint-primary)]", fg: "text-[color:var(--rev-primary)]" },
  success: { bg: "bg-[color:var(--rev-tint-success)]", fg: "text-[color:var(--rev-success)]" },
  warning: { bg: "bg-[color:var(--rev-tint-warning)]", fg: "text-[color:var(--rev-warning)]" },
  danger: { bg: "bg-[color:var(--rev-tint-danger)]", fg: "text-[color:var(--rev-danger)]" },
  // No dedicated --rev-tint-info token exists yet — derive one the same way
  // index.css's own `.citation-badge` already derives tints from `--info`.
  info: { bg: "bg-[color:color-mix(in_srgb,var(--rev-info)_14%,white)]", fg: "text-[color:var(--rev-info)]" },
};

export interface KpiTileFooter {
  /** Label on the toggle button, e.g. "Screening analysis across scored deals". */
  toggleLabel: ReactNode;
  /** Revealed content, e.g. "Driven by: ...". */
  content: ReactNode;
}

export interface KpiTileProps {
  /** Mono uppercase eyebrow label, e.g. "PIPELINE VALUE". */
  eyebrow: ReactNode;
  /** Large numeral — pass pre-formatted text (see dealMetricsFormat.ts). */
  value: ReactNode;
  icon: LucideIcon;
  tint?: KpiTileTint;
  sub?: ReactNode;
  /** Optional expandable footer, e.g. AI score drivers. */
  footer?: KpiTileFooter;
  className?: string;
}

/**
 * Design-revamp KPI tile (docs/plans/2026-08-12-web-design-revamp.md §3).
 *
 * Deliberately a sibling of `tiles/StatTile.tsx`, not an in-place extension:
 * StatTile is still live on Dashboard.tsx/MandateScorecard.tsx (untouched,
 * old-design surfaces) and uses a different visual vocabulary (sans numeral,
 * up/down trend arrow, no expandable footer, arbitrary Tailwind color
 * classes for the icon square). This tile matches the mockup's KPI tile
 * instead: mono eyebrow + tinted icon square + mono numeral + optional
 * expandable "score drivers" footer, all on `--rev-*` tokens.
 */
export function KpiTile({ eyebrow, value, icon: Icon, tint = "primary", sub, footer, className }: KpiTileProps) {
  const [footerOpen, setFooterOpen] = useState(false);
  const { bg, fg } = TINT_CLASSES[tint];

  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-[18px_20px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--rev-text-6)]">{eyebrow}</p>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]", bg)}>
          <Icon className={cn("h-[15px] w-[15px]", fg)} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 font-mono text-[29px] font-semibold leading-none tabular-nums text-[color:var(--rev-text-1)]">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-[color:var(--rev-text-6)]">{sub}</p> : null}
      {footer ? (
        <>
          <button
            type="button"
            onClick={() => setFooterOpen((v) => !v)}
            aria-expanded={footerOpen}
            className="mt-1.5 flex items-center gap-1 bg-transparent p-0 text-xs text-[color:var(--rev-text-6)]"
          >
            {footer.toggleLabel}
            <ChevronDown
              className={cn("h-[9px] w-[9px] shrink-0 transition-transform", footerOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          {footerOpen ? (
            <div className="mt-2 border-t border-[color:var(--rev-border-subtle)] pt-2 text-xs leading-relaxed text-[color:var(--rev-text-4)]">
              {footer.content}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
