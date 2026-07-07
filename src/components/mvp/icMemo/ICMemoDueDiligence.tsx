/**
 * §10 Due Diligence Summary.
 *
 * Six category cards (Legal & Corporate / Financial / Technology & IP /
 * Commercial / Team & HR / Market & Strategy). Each card's border tints amber
 * when flaggedCount > 0, otherwise emerald. Closes with a DD Summary &
 * Conclusion callout. Wrapped in EditableSection for per-section regenerate
 * (composeKey = due_diligence_summary).
 *
 * The category list itself is a fixed UI scaffold — only the inner Sourced
 * fields (status / findings / completenessPct / flaggedCount) come from the
 * composer.
 */
import type { ICMemoDeliverable } from "@shared/simperoTypes";
import { CheckCircle } from "lucide-react";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";

export interface ICMemoDueDiligenceProps {
  dueDiligenceSummary: ICMemoDeliverable["dueDiligenceSummary"];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

export function ICMemoDueDiligence({
  dueDiligenceSummary: dd,
  onRegenerate,
  onEditText,
}: ICMemoDueDiligenceProps) {
  return (
    <EditableSection
      sectionLabel="Due Diligence Summary"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b bg-gray-50">
        <h2 className="text-2xl font-semibold mb-6">
          10. Due Diligence Summary
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {dd.categories.map((cat) => {
            const flaggedCount = cat.flaggedCount.value ?? 0;
            const flagged = flaggedCount > 0;
            const borderClass = flagged
              ? "border-amber-300"
              : "border-emerald-300";
            const statusClass =
              cat.status.value === "complete"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700";
            const statusLabel =
              cat.status.value === "complete" ? "✓ Complete" : "In Progress";
            return (
              <div
                key={cat.category}
                className={`bg-white rounded-xl border-2 p-5 ${borderClass}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {cat.category}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                      {flagged && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          {flaggedCount} item
                          {flaggedCount === 1 ? "" : "s"} flagged
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">
                      <SourcedValue
                        sourced={cat.completenessPct}
                        format={(v) => `${v}%`}
                        hideBadge
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  <SourcedValue sourced={cat.findings} />
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 bg-white rounded-xl border p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                DD Summary &amp; Conclusion
              </h3>
              <p className="text-gray-700 leading-relaxed">
                <SourcedValue sourced={dd.conclusion} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </EditableSection>
  );
}
