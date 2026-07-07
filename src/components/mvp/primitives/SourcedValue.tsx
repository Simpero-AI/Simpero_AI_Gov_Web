import type { Sourced } from "@shared/simperoTypes";
import { MissingDataPlaceholder } from "./MissingDataPlaceholder";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { useCitationSafe } from "@/contexts/CitationContext";
import { cn } from "@/lib/utils";

export interface SourcedValueProps<T> {
  sourced: Sourced<T>;
  /** Optional formatter — defaults to String(value). */
  format?: (v: T) => string;
  /**
   * Human-readable label shown in the citation sidebar when the badge is clicked,
   * e.g. "Revenue ARR" or "Pre-money Valuation". Falls back to the formatted value.
   */
  fieldLabel?: string;
  /** Hide the provenance badge entirely (e.g. when the surrounding container already renders one). */
  hideBadge?: boolean;
  className?: string;
}

/**
 * Generic renderer for any Sourced<T> field on the IC Memo deliverable.
 * - missing / null / undefined value → MissingDataPlaceholder
 * - otherwise: formatted value + ProvenanceBadge + stale affordance
 * - when a CitationProvider is in the tree and sourced.citation exists,
 *   the badge becomes clickable and opens the CitationSidebar.
 */
export function SourcedValue<T>({
  sourced,
  format,
  fieldLabel,
  hideBadge,
  className,
}: SourcedValueProps<T>) {
  const citationCtx = useCitationSafe();

  if (
    sourced.provenance === "missing" ||
    sourced.value === null ||
    sourced.value === undefined
  ) {
    return (
      <MissingDataPlaceholder gapRef={sourced.gapRef} reason={sourced.reason} />
    );
  }
  const rendered = format ? format(sourced.value) : String(sourced.value);

  // Always wire onClick when a CitationProvider is in the tree.
  // For fields with no citation (synthesized/modeled), pass null — the sidebar
  // will explain what that means and show recommended verification steps.
  const handleCitationClick = citationCtx
    ? () =>
        citationCtx.openCitation({
          fieldLabel: fieldLabel ?? rendered,
          citation: sourced.citation ?? null,
        })
    : undefined;

  // ProvenanceBadge returns null for non-extracted provenance (synthesized/modeled/stub),
  // so we need a separate clickable affordance for those cases.
  const needsFallbackTrigger =
    !hideBadge &&
    handleCitationClick &&
    sourced.provenance !== "extracted";

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      {needsFallbackTrigger ? (
        <button
          type="button"
          onClick={handleCitationClick}
          className="hover:opacity-70 transition-opacity focus:outline-none"
          title="View AI generation context"
        >
          {rendered}
        </button>
      ) : (
        <span>{rendered}</span>
      )}
      {hideBadge ? null : (
        <ProvenanceBadge
          provenance={sourced.provenance}
          citationVerified={sourced.citation?.verified}
          confidence={sourced.confidence}
          onClick={handleCitationClick}
        />
      )}
      {sourced.stale ? (
        <span
          className="ml-1 inline-block rounded-sm bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700"
          title="Upstream content was regenerated — may not reflect latest edits"
        >
          may not reflect latest edits
        </span>
      ) : null}
    </span>
  );
}
