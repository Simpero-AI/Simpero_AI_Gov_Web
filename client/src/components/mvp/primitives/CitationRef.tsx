import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CitationRefProps {
  page: number | null;
  section: string | null;
  verified: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Citation link primitive shared by the MemoViewer inline citation
 * badge and the IC Memo deliverable. Renders `p.{page}` as a button
 * with two visual states (verified = muted green via citation-badge
 * CSS; unverified = amber/red UNVERIFIED chip). Returns null when
 * there's nothing to link to (verified citation but missing page).
 *
 * The unverified branch mirrors the MemoViewer ClaimBlock appearance
 * exactly (AlertTriangle + "UNVERIFIED" label) so the two surfaces
 * stay visually consistent.
 */
export function CitationRef({ page, section, verified, onClick, className }: CitationRefProps) {
  if (verified && page == null) return null;

  if (verified) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("citation-badge", className)}
        title={`Source: p.${page}${section ? `, ${section}` : ""}`}
      >
        p.{page}
      </button>
    );
  }

  // Partial — found in document (has page/section) but TF-IDF similarity below threshold
  if (page != null) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors",
          className
        )}
        title={`Partial citation: p.${page}${section ? `, ${section}` : ""} — below verification threshold`}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>Partial p.{page}</span>
      </button>
    );
  }

  // Unverified — no document reference at all (AI-synthesized)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors",
        className
      )}
      title="Unverified — AI synthesized, no source document reference"
    >
      <AlertTriangle className="w-3 h-3" />
      <span>Unverified</span>
    </button>
  );
}
