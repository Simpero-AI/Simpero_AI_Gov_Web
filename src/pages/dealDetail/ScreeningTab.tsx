import { useMemo } from "react";
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
import { mapScreeningMaterials } from "@/lib/screeningMaterials";
import type { ICMemoResult } from "@shared/simperoTypes";

export interface ScreeningTabProps {
  dealId: string;
  /** The deal's uploaded source file name, if any. */
  fileName: string | null;
  /** The deal's parsed IC-memo, when analysis has completed. Feeds the
   * Extracted-from-Materials, Agent Highlights, and Risk Flags panels via
   * mapScreeningMaterials. Null before a memo exists — every panel then falls
   * back to its own empty state. */
  memo: Partial<ICMemoResult> | null;
}

/**
 * Initial Screening tab (docs/plans/2026-08-12-web-design-revamp.md Phase 4
 * item 4). The mandate-fit verdict and per-question pass/review/fail come from
 * GET /deals/{id}/screening (mapped by mapScreening) into the VerdictHeader and
 * MandateFitPanel. Until a deal has been screened the endpoint 404s -> null and
 * those panels render their coming-soon state.
 *
 * ExtractedGrid, HighlightsPanel and RiskFlagsPanel are fed from the deal's
 * IC-memo (mapScreeningMaterials) rather than the screening_result, which
 * carries only rule verdicts: the extracted-with-citation facts, investment
 * highlights, and risk register already live on the memo deliverable (the same
 * data the Summary tab renders). ScreeningDecisionBar stays null — a recorded
 * advance/reject human decision has no backend surface yet.
 */
export function ScreeningTab({ dealId, fileName, memo }: ScreeningTabProps) {
  const screeningQuery = useQuery({
    queryKey: screeningQueryKey(dealId),
    queryFn: () => fetchScreening(dealId),
  });
  const view = screeningQuery.data ? mapScreening(screeningQuery.data) : null;
  const materials = useMemo(() => mapScreeningMaterials(memo), [memo]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-[18px] text-[color:var(--rev-text-1)]">Initial Screening</h2>
        <p className="text-[12.5px] text-[color:var(--rev-text-6)]">
          Quick fit check against the investment mandate, before this moves into full diligence.
        </p>
      </div>

      <MaterialsCard fileName={fileName} />

      {screeningQuery.isError ? (
        <div
          role="alert"
          className="mt-4 rounded-[10px] border px-4 py-3 text-[13px]"
          style={{
            borderColor: "color-mix(in srgb, var(--rev-danger) 35%, transparent)",
            background: "color-mix(in srgb, var(--rev-danger) 6%, transparent)",
          }}
        >
          <span className="font-medium text-[color:var(--rev-text-2)]">
            Couldn&apos;t load screening for this deal.
          </span>{" "}
          <span className="text-[color:var(--rev-text-6)]">
            {(screeningQuery.error as Error | null)?.message ?? "Please try again."}
          </span>
        </div>
      ) : (
        <>
          <VerdictHeader verdict={view?.verdict ?? null} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col gap-5">
              <ExtractedGrid fields={materials.extractedFields} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <HighlightsPanel items={materials.highlights} />
                <RiskFlagsPanel items={materials.riskFlags} />
              </div>
            </div>
            <MandateFitPanel fit={view?.fit ?? null} />
          </div>

          <div className="mt-5">
            <ScreeningDecisionBar decision={null} />
          </div>
        </>
      )}
    </div>
  );
}
