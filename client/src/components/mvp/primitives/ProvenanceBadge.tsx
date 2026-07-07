import type { Provenance } from "@shared/simperoTypes";
import { cn } from "@/lib/utils";

export interface ProvenanceBadgeProps {
  provenance: Provenance;
  /** True iff this value's underlying citation passed Pass-2 verification. */
  citationVerified?: boolean;
  /** Modeled-provenance confidence tier; renders as a small chip next to the badge. */
  confidence?: "low" | "medium" | "high";
  /** When provided, renders the badge as an interactive button that opens the citation sidebar. */
  onClick?: () => void;
  className?: string;
}

const STYLES: Record<string, { bg: string; text: string; label: string }> = {
  verified: { bg: "bg-emerald-100", text: "text-emerald-800", label: "✓ Verified" },
  partial:  { bg: "bg-amber-100",   text: "text-amber-800",   label: "◑ Partial"  },
};

/**
 * Provenance pill for any Sourced<T> value.
 *
 * Visible states:
 *  - extracted + citationVerified=true  → "✓ Verified"  (emerald)
 *  - extracted + citationVerified≠true  → "◑ Partial"   (amber)
 *  - synthesized | modeled | stub       → no badge
 *  - missing                            → no badge (caller renders MissingDataPlaceholder)
 */
export function ProvenanceBadge({
  provenance,
  citationVerified,
  confidence: _confidence,
  onClick,
  className,
}: ProvenanceBadgeProps) {
  if (provenance !== "extracted") return null;

  const styleKey = citationVerified === true ? "verified" : "partial";

  const s = STYLES[styleKey];

  const pill = (
    <span
      className={cn(
        "inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
        s.bg,
        s.text,
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
      )}
    >
      {s.label}
    </span>
  );

  const confidenceChip = null; // confidence chip retired — status is now Verified/Partial/Unverified

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("inline-flex items-center gap-1 focus:outline-none", className)}
        title="View source citation"
      >
        {pill}
        {confidenceChip}
      </button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {pill}
      {confidenceChip}
    </span>
  );
}
