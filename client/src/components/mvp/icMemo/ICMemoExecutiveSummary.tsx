/**
 * §1 Executive Summary.
 *
 * Renders one paragraph per Sourced<string | SourcedSentence[] | null> in
 * executiveSummary.paragraphs, plus a single highlighted "Investment Highlight"
 * callout. Wrapped in EditableSection so per-section regenerate
 * (composeKey = executive_summary_prose) and an inline-edit affordance are
 * available on hover.
 */
import type { ICMemoDeliverable, MemoSection, Claim } from "@shared/simperoTypes";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";

export interface ICMemoExecutiveSummaryProps {
  executiveSummary: ICMemoDeliverable["executiveSummary"];
  sections: MemoSection[];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

export function ICMemoExecutiveSummary({
  executiveSummary,
  sections,
  onRegenerate,
  onEditText,
}: ICMemoExecutiveSummaryProps) {
  const allClaims: Claim[] = sections.flatMap((s) => s.claims);
  return (
    <EditableSection
      sectionLabel="Executive Summary"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b">
        <h2 className="text-2xl font-semibold mb-6">1. Executive Summary</h2>
        <div className="prose max-w-none space-y-4 text-gray-700 leading-relaxed">
          {executiveSummary.paragraphs.map((p, i) => (
            <p key={i}>
              {typeof p.value === "string" || p.value === null ? (
                <SourcedValue sourced={p} />
              ) : (
                <ProseWithClaims content={p.value} claims={allClaims} />
              )}
            </p>
          ))}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
            <p className="text-blue-900">
              <strong>Investment Highlight:</strong>{" "}
              <SourcedValue sourced={executiveSummary.investmentHighlight} />
            </p>
          </div>
        </div>
      </div>
    </EditableSection>
  );
}
