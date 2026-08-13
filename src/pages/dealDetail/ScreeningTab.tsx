import { MaterialsCard } from "@/components/mvp/screening/MaterialsCard";
import { VerdictHeader } from "@/components/mvp/screening/VerdictHeader";
import { ExtractedGrid } from "@/components/mvp/screening/ExtractedGrid";
import { HighlightsPanel } from "@/components/mvp/screening/HighlightsPanel";
import { RiskFlagsPanel } from "@/components/mvp/screening/RiskFlagsPanel";
import { MandateFitPanel } from "@/components/mvp/screening/MandateFitPanel";
import { ScreeningDecisionBar } from "@/components/mvp/screening/ScreeningDecisionBar";

export interface ScreeningTabProps {
  /** The deal's uploaded source file name, if any — the only real data this tab has today. */
  fileName: string | null;
}

/**
 * Initial Screening tab (docs/plans/2026-08-12-web-design-revamp.md Phase 4
 * item 4). Only `MaterialsCard` has real backing data today — verdict, fit
 * %, extracted fields, agent highlights, risk flags, mandate-fit scoring,
 * and the advance/reject decision are all a separately-tracked backend gap
 * (plan §4c). Each of those components is wired for real data later but
 * passed `null` here, rendering an honest coming-soon state rather than
 * fabricated content.
 */
export function ScreeningTab({ fileName }: ScreeningTabProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-[18px] text-[color:var(--rev-text-1)]">Initial Screening</h2>
        <p className="text-[12.5px] text-[color:var(--rev-text-6)]">
          Quick fit check against the investment mandate, before this moves into full diligence.
        </p>
      </div>

      <MaterialsCard fileName={fileName} />

      <VerdictHeader verdict={null} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <ExtractedGrid fields={null} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <HighlightsPanel items={null} />
            <RiskFlagsPanel items={null} />
          </div>
        </div>
        <MandateFitPanel fit={null} />
      </div>

      <div className="mt-5">
        <ScreeningDecisionBar decision={null} />
      </div>
    </div>
  );
}
