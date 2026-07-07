import type { SourcedSentence, Claim } from "@shared/simperoTypes";
import { CitationRef } from "./CitationRef";
import { useCitationSafe } from "@/contexts/CitationContext";

interface ClaimTextProps {
  sentences: SourcedSentence[];
  claims: Claim[];
  className?: string;
}

/**
 * Renders a SourcedSentence[] with inline citation chips after each sentence.
 * Each chip is a CitationRef button that opens the CitationSidebar for the
 * corresponding Claim when clicked.
 */
export function ClaimText({ sentences, claims, className }: ClaimTextProps) {
  const ctx = useCitationSafe();
  return (
    <span className={className}>
      {sentences.map((s, i) => (
        <span key={i}>
          {s.text}
          {(s.claimIds ?? []).map(id => {
            const claim = claims.find(c => c.id === id);
            if (!claim) return null;
            return (
              <CitationRef
                key={id}
                page={claim.citation.page}
                section={claim.citation.section}
                verified={claim.citation.verified}
                onClick={() => ctx?.openClaimCitation(claim, s.text.slice(0, 60))}
                className="ml-0.5"
              />
            );
          })}
          {i < sentences.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

interface ProseWithClaimsProps {
  content: string | SourcedSentence[] | null | undefined;
  claims: Claim[];
  className?: string;
}

/**
 * Handles the `string | SourcedSentence[]` union type for backwards compatibility.
 * Plain strings are rendered as-is; SourcedSentence arrays are rendered via ClaimText
 * with inline citation chips.
 */
export function ProseWithClaims({ content, claims, className }: ProseWithClaimsProps) {
  if (!content) return null;
  if (typeof content === "string") {
    return <span className={className}>{content}</span>;
  }
  // Guard: LLM sometimes emits Sourced<string> {value, provenance} instead of SourcedSentence[]
  if (!Array.isArray(content)) {
    const fallback = "value" in (content as object)
      ? String((content as { value: unknown }).value ?? "")
      : "";
    return <span className={className}>{fallback}</span>;
  }
  return <ClaimText sentences={content} claims={claims} className={className} />;
}
