/**
 * Section-level citation confidence for Memo Viewer (Phase B — Confidence UX).
 * Combines per-section verification with memo-level Pass 2 degradation flag.
 */
import type { MemoSection } from "./simperoTypes";

export type SectionConfidenceLevel = "strong" | "review" | "degraded" | "empty";

export interface SectionConfidence {
  level: SectionConfidenceLevel;
  /** Short label for UI badge */
  label: string;
  /** Tailwind classes for outline Badge */
  badgeClassName: string;
}

/**
 * @param pass2LowConfidence — `memo.pass2Quality?.lowConfidenceWarning`
 */
export function getSectionConfidence(section: MemoSection, pass2LowConfidence: boolean): SectionConfidence {
  const total = section.claims.length;
  const unverified = section.claims.filter((c) => !c.citation.verified).length;

  if (total === 0) {
    return {
      level: "empty",
      label: "No claims",
      badgeClassName: "border-border text-muted-foreground bg-muted/20",
    };
  }

  if (unverified === 0) {
    if (pass2LowConfidence) {
      return {
        level: "degraded",
        label: "Verified — verify material claims",
        badgeClassName: "border-amber-500/50 text-amber-300 bg-amber-500/10",
      };
    }
    return {
      level: "strong",
      label: "Citations OK",
      badgeClassName: "border-emerald-500/45 text-emerald-400 bg-emerald-500/10",
    };
  }

  if (pass2LowConfidence) {
    return {
      level: "degraded",
      label: "Low confidence — manual review",
      badgeClassName: "border-orange-500/45 text-orange-300 bg-orange-500/10",
    };
  }

  return {
    level: "review",
    label: "Needs citation review",
    badgeClassName: "border-amber-500/45 text-amber-400 bg-amber-500/10",
  };
}
