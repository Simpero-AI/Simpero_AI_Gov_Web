import { Link } from "wouter";
import { ChevronLeft, Lock } from "lucide-react";
import { STAGE_STYLES } from "@/components/mvp/deals/DealsTable";
import { formatUsdShort } from "@/lib/dealMetricsFormat";
import { DEAL_STATES, type DealState } from "@shared/dealsLifecycle";

const FALLBACK_STAGE = { bg: "var(--rev-tint-neutral)", fg: "var(--rev-text-4)", label: "Draft" };

/** `Deal.state` off the wire is a loose `string` (api/deals.ts), not the stricter `DealState` union — guard the STAGE_STYLES lookup rather than assuming it always matches. */
function stageStyleFor(state: string) {
  return DEAL_STATES.has(state as DealState) ? STAGE_STYLES[state as DealState] : FALLBACK_STAGE;
}

export interface DealHeaderCardProps {
  name: string;
  gpSource: string | null;
  sectorTags: string[];
  state: string;
  dealSizeMinUsd: number | null;
  dealSizeMaxUsd: number | null;
  /**
   * No `confidential` field exists on the backend's deal shape yet (plan
   * §4c — a separate backend prompt, framed as an authorization question).
   * Same additive-overlay convention as `DealsTable`'s `RowWithConfidential`:
   * absent => not confidential. Rendered as a static badge, not the
   * mockup's interactive toggle — there's no mutation endpoint to persist a
   * click yet, and a toggle that silently no-ops would be worse than no
   * control at all.
   */
  confidential?: boolean;
  className?: string;
}

function formatDealSizeRange(minUsd: number | null, maxUsd: number | null): string {
  if (minUsd == null && maxUsd == null) return "—";
  if (minUsd != null && maxUsd == null) return `${formatUsdShort(minUsd)}+`;
  if (minUsd == null && maxUsd != null) return `Up to ${formatUsdShort(maxUsd)}`;
  return `${formatUsdShort(minUsd!)} – ${formatUsdShort(maxUsd!)}`;
}

/**
 * Deal-detail shell header (docs/plans/2026-08-12-web-design-revamp.md
 * Phase 4) — mirrors the mockup's topbar "Deal" variant fields (name, stage
 * pill, confidential badge, size, lead) rather than the richer body-level
 * header card seen in the screenshots (avatar, risk badge, diligence
 * progress ring) — those extra fields have no backing data anywhere
 * (no risk scoring, no "diligence progress" calc) so they're left out
 * rather than fabricated.
 */
export function DealHeaderCard({
  name,
  gpSource,
  sectorTags,
  state,
  dealSizeMinUsd,
  dealSizeMaxUsd,
  confidential = false,
  className,
}: DealHeaderCardProps) {
  const stage = stageStyleFor(state);
  const subtitleParts = [gpSource, sectorTags.join(", ")].filter((p): p is string => !!p);

  return (
    <section
      aria-label="Deal overview"
      className={`mb-5 flex items-center gap-5 rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-[18px_22px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className ?? ""}`}
    >
      <Link
        href="/"
        className="flex shrink-0 items-center gap-1 text-[13px] text-[color:var(--rev-text-5)] no-underline hover:text-[color:var(--rev-primary)]"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        All deals
      </Link>
      <div className="h-5 w-px shrink-0 bg-[color:var(--rev-border-strong)]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-serif text-[16px] text-[color:var(--rev-text-1)]">{name}</span>
          <span
            className="inline-block rounded-md px-2 py-0.5 font-mono text-[11px]"
            style={{ background: stage.bg, color: stage.fg }}
          >
            {stage.label}
          </span>
          {confidential ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--rev-warning)]/30 bg-[#2A2118] px-2 py-0.5 text-[11px] text-[#E8C77A]">
              <Lock className="h-2.5 w-2.5" aria-hidden="true" />
              Confidential
            </span>
          ) : null}
        </div>
        {subtitleParts.length > 0 ? (
          <p className="mt-0.5 truncate text-[12px] text-[color:var(--rev-text-6)]">{subtitleParts.join(" · ")}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-[14px] font-semibold text-[color:var(--rev-text-1)]">
          {formatDealSizeRange(dealSizeMinUsd, dealSizeMaxUsd)}
        </div>
        {/* No "lead" field exists on the backend's deal shape yet — honest dash rather than a fabricated name. */}
        <div className="text-[11px] text-[color:var(--rev-text-6)]">Lead · —</div>
      </div>
    </section>
  );
}
