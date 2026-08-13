import { useState } from "react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MandateBannerFields {
  checkSize: string;
  holdPeriod: string;
  focusSectors: string;
  geography: string;
}

export interface MandateBannerProps {
  /** null when the org hasn't set up an investment profile yet. */
  mandate: MandateBannerFields | null;
  onConfigure: () => void;
  className?: string;
}

/**
 * Deals-page mandate banner (docs/plans/2026-08-12-web-design-revamp.md §3)
 * — supersedes `tiles/MandateBand.tsx` for this page only. MandateBand
 * stays as-is for MandateScorecard.tsx (still on the old design), which is
 * why this is a new sibling component rather than an in-place edit.
 *
 * Collapsed by default (mockup's `mandateBannerCollapsed` starts true) —
 * expands in place to a 4-field grid instead of navigating away.
 */
export function MandateBanner({ mandate, onConfigure, className }: MandateBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const gradientStyle = { background: "var(--rev-mandate-gradient)" };

  if (!mandate) {
    return (
      <section
        aria-label="Active Investment Mandate"
        className={cn("mb-6 rounded-xl px-6 py-5", className)}
        style={gradientStyle}
      >
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-[#8FB4FF]" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-[0.075em] text-[#8FB4FF]">
            Active Investment Mandate
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[color:var(--rev-text-7)]">
            No active mandate configured — set up your investment criteria to enable mandate fit scoring.
          </p>
          <button
            type="button"
            onClick={onConfigure}
            className="shrink-0 rounded-md bg-[color:var(--rev-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[color:var(--rev-primary-hover)]"
          >
            Configure in Mandate &amp; Scorecard
          </button>
        </div>
      </section>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        className={cn(
          "mb-6 flex w-full items-center gap-2.5 rounded-[10px] px-[18px] py-[11px] text-left",
          className
        )}
        style={gradientStyle}
      >
        <Target className="h-3.5 w-3.5 shrink-0 text-[#8FB4FF]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#D7E2F5]">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#8FB4FF]">Active Mandate</span>
          {" · "}
          {mandate.checkSize}
          {" · "}
          {mandate.focusSectors}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-[#8FB4FF]">View full mandate ▾</span>
      </button>
    );
  }

  return (
    <div
      className={cn("mb-6 grid grid-cols-2 gap-5 rounded-xl px-[26px] py-5 md:grid-cols-4", className)}
      style={gradientStyle}
    >
      <div className="col-span-2 mb-0.5 flex items-center gap-2.5 md:col-span-4">
        <Target className="h-3.5 w-3.5 shrink-0 text-[#8FB4FF]" aria-hidden="true" />
        <span className="flex-1 font-mono text-[10.5px] uppercase tracking-[0.075em] text-[#8FB4FF]">
          Active Investment Mandate
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-expanded={true}
          className="shrink-0 font-mono text-[11px] text-[#8FB4FF]"
        >
          Collapse ▴
        </button>
      </div>
      <MandateField label="Check Size" value={mandate.checkSize} />
      <MandateField label="Time Horizon" value={mandate.holdPeriod} />
      <MandateField label="Focus Sectors" value={mandate.focusSectors} />
      <MandateField label="Geography" value={mandate.geography} />
    </div>
  );
}

function MandateField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#7F8B98]">{label}</div>
      <div className="mt-1.5 text-[14.5px] leading-snug text-white">{value}</div>
    </div>
  );
}
