import { useState } from "react";
import { ChevronDown, FileText, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";
import { trustStatusMeta, TRUST_STATUS_ORDER } from "@/components/mvp/primitives/TrustStatusPill";

export type CorroborationSourceKind = "document" | "interview" | "external";

export interface CorroborationSourceItem {
  id: string;
  name: string;
  kind: CorroborationSourceKind;
  /** e.g. "cited 3x" — omitted when a source is cited once. */
  citeCount?: number;
  /**
   * When set, renders a Verified/Partial pill via `ProvenanceBadge` next to
   * the source. Left undefined for sources with no per-item verification
   * state, matching the mockup's own grouped-source rows (they carry no
   * per-row pill — only the header aggregates Verified/Partial/Unverified).
   */
  verified?: boolean;
}

const KIND_ICON: Record<CorroborationSourceKind, typeof FileText> = {
  document: FileText,
  interview: Users,
  external: Globe,
};

/**
 * One `{ status, count }` pair for the header's full-ladder breakdown, where
 * `status` is a trust-status key from `TrustStatusPill` (verified /
 * partially_verified / cited / conflicted / inconclusive / derived). Panels
 * fed from a live claims view pass this instead of the coarse
 * verified/partial/unverified triple, so `cited` and `conflicted` keep their
 * own honest label and colour rather than being force-collapsed into
 * "Unverified".
 */
export interface CorroborationStatusCount {
  status: string;
  count: number;
}

export interface CorroborationPanelProps {
  items: CorroborationSourceItem[];
  /**
   * Full trust-status breakdown for the header (claims-view-backed tabs). When
   * provided it takes precedence over verified/partial/unverifiedCount and is
   * rendered with each status's own canonical label/colour. Omit for the
   * legacy coarse triple below.
   */
  statusCounts?: CorroborationStatusCount[];
  verifiedCount?: number;
  partialCount?: number;
  unverifiedCount?: number;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible "Corroboration (N source(s))" panel — mounted on 7 Deal
 * Analysis tabs later. Composes `ProvenanceBadge` for the optional per-item
 * verification pill rather than re-implementing verified/partial styling.
 *
 * The header summarises trust either as the full status ladder (`statusCounts`,
 * used by tabs wired to a live claims view) or, for callers still on the coarse
 * model, the three verified/partial/unverified counts.
 */
export function CorroborationPanel({
  items,
  statusCounts,
  verifiedCount = 0,
  partialCount = 0,
  unverifiedCount = 0,
  defaultOpen = false,
  className,
}: CorroborationPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Full-ladder header entries, kept only where count > 0 and ordered by the
  // canonical severity ladder so the same statuses always read left-to-right
  // the same way, regardless of the order the caller tallied them.
  const ladderEntries = (statusCounts ?? [])
    .filter((s) => s.count > 0)
    .sort((a, b) => {
      const ia = TRUST_STATUS_ORDER.indexOf(a.status as (typeof TRUST_STATUS_ORDER)[number]);
      const ib = TRUST_STATUS_ORDER.indexOf(b.status as (typeof TRUST_STATUS_ORDER)[number]);
      // Unknown statuses (ia/ib === -1) sort after the known ladder.
      return (ia === -1 ? TRUST_STATUS_ORDER.length : ia) - (ib === -1 ? TRUST_STATUS_ORDER.length : ib);
    });

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-[color:var(--rev-border)] bg-[color:var(--rev-tint-neutral-subtle)] px-5 py-3.5 text-[12.5px] text-[color:var(--rev-text-7)]",
          className
        )}
      >
        No structured source citations captured on this tab yet.
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 bg-transparent px-5 py-3.5 text-left"
      >
        <ChevronDown
          className={cn("h-[13px] w-[13px] shrink-0 text-[color:var(--rev-text-4)] transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[color:var(--rev-text-3)]">
          Corroboration ({items.length} source{items.length === 1 ? "" : "s"})
        </span>
        <span className="flex-1" />
        <span className="flex items-center gap-3 font-mono text-[11.5px]">
          {statusCounts ? (
            ladderEntries.map((s) => {
              const meta = trustStatusMeta(s.status);
              return (
                <span key={s.status} title={meta.title} style={{ color: meta.color }}>
                  {s.count} {meta.label}
                </span>
              );
            })
          ) : (
            <>
              {verifiedCount > 0 ? <span className="text-[color:var(--rev-success)]">{verifiedCount} Verified</span> : null}
              {partialCount > 0 ? <span className="text-[color:var(--rev-warning)]">{partialCount} Partial</span> : null}
              {unverifiedCount > 0 ? <span className="text-[color:var(--rev-danger)]">{unverifiedCount} Unverified</span> : null}
            </>
          )}
        </span>
      </button>
      {open ? (
        <div className="border-t border-[color:var(--rev-border-subtle)] px-5 pb-3.5 pt-1.5">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 border-t border-[color:var(--rev-tint-neutral-subtle)] py-2.5 first:border-t-0"
              >
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-[color:var(--rev-tint-neutral)] text-[color:var(--rev-text-4)]">
                  <Icon className="h-[13px] w-[13px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-[color:var(--rev-text-3)]">{item.name}</span>
                {item.verified !== undefined ? (
                  <ProvenanceBadge provenance="extracted" citationVerified={item.verified} />
                ) : null}
                {item.citeCount && item.citeCount > 1 ? (
                  <span className="shrink-0 font-mono text-[10.5px] text-[color:var(--rev-text-7)]">
                    cited {item.citeCount}x
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
