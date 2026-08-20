import { useQuery } from "@tanstack/react-query";
import { MaterialsCard } from "@/components/mvp/screening/MaterialsCard";
import { VerdictHeader } from "@/components/mvp/screening/VerdictHeader";
import { ExtractedGrid } from "@/components/mvp/screening/ExtractedGrid";
import { HighlightsPanel } from "@/components/mvp/screening/HighlightsPanel";
import { RiskFlagsPanel } from "@/components/mvp/screening/RiskFlagsPanel";
import { MandateFitPanel } from "@/components/mvp/screening/MandateFitPanel";
import { ScreeningDecisionBar } from "@/components/mvp/screening/ScreeningDecisionBar";
import { fetchScreening, screeningQueryKey } from "@/api/screening";
import { mapScreening } from "@/lib/screeningView";

export interface ScreeningTabProps {
  dealId: string;
  /** The deal's uploaded source file name, if any. */
  fileName: string | null;
}

/**
 * Initial Screening tab (docs/plans/2026-08-12-web-design-revamp.md Phase 4
 * item 4). The mandate-fit verdict and per-question pass/review/fail come from
 * GET /deals/{id}/screening (mapped by mapScreening) into the VerdictHeader and
 * MandateFitPanel. Until a deal has been screened the endpoint 404s -> null and
 * those panels render their coming-soon state.
 *
 * ExtractedGrid, HighlightsPanel, RiskFlagsPanel and ScreeningDecisionBar are
 * separate backend surfaces that the screening_result does not carry, so they
 * stay null until their own wiring lands.
 */
export function ScreeningTab({ dealId, fileName }: ScreeningTabProps) {
  const screeningQuery = useQuery({
    queryKey: screeningQueryKey(dealId),
    queryFn: () => fetchScreening(dealId),
  });
  const view = screeningQuery.data ? mapScreening(screeningQuery.data) : null;

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-[18px] text-[color:var(--rev-text-1)]">Initial Screening</h2>
        <p className="text-[12.5px] text-[color:var(--rev-text-6)]">
          Quick fit check against the investment mandate, before this moves into full diligence.
        </p>
      </div>

      <MaterialsCard fileName={fileName} />

      <VerdictHeader verdict={view?.verdict ?? null} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <ExtractedGrid fields={null} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <HighlightsPanel items={null} />
            <RiskFlagsPanel items={null} />
          </div>
        </div>
        <MandateFitPanel fit={view?.fit ?? null} />
      </div>

      <div className="mt-5">
        <ScreeningDecisionBar decision={null} />
      </div>
    </div>
  );
}
