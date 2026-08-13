import { useState } from "react";
import { ChevronDown, FileText, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "@/components/mvp/primitives/ProvenanceBadge";

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

export interface CorroborationPanelProps {
  items: CorroborationSourceItem[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible "Corroboration (N source(s))" panel — mounted on 7 Deal
 * Analysis tabs later. Composes `ProvenanceBadge` for the optional per-item
 * verification pill rather than re-implementing verified/partial styling.
 */
export function CorroborationPanel({
  items,
  verifiedCount,
  partialCount,
  unverifiedCount,
  defaultOpen = false,
  className,
}: CorroborationPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

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
          {verifiedCount > 0 ? <span className="text-[color:var(--rev-success)]">{verifiedCount} Verified</span> : null}
          {partialCount > 0 ? <span className="text-[color:var(--rev-warning)]">{partialCount} Partial</span> : null}
          {unverifiedCount > 0 ? <span className="text-[color:var(--rev-danger)]">{unverifiedCount} Unverified</span> : null}
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
