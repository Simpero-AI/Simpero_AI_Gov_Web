import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { MaterialsCard } from "@/components/mvp/screening/MaterialsCard";
import { VerdictHeader } from "@/components/mvp/screening/VerdictHeader";
import { ExtractedGrid } from "@/components/mvp/screening/ExtractedGrid";
import { HighlightsPanel } from "@/components/mvp/screening/HighlightsPanel";
import { RiskFlagsPanel } from "@/components/mvp/screening/RiskFlagsPanel";
import { MandateFitPanel } from "@/components/mvp/screening/MandateFitPanel";
import { ScreeningDecisionBar } from "@/components/mvp/screening/ScreeningDecisionBar";
import { QueryErrorAlert } from "@/components/mvp/common/QueryErrorAlert";
import { fetchScreening, screeningQueryKey } from "@/api/screening";
import { fetchScreeningMaterials, screeningMaterialsQueryKey } from "@/api/screeningMaterials";
import { fetchScreeningInsights, screeningInsightsQueryKey } from "@/api/screeningInsights";
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
 * The three materials panels are fed by TWO independent queries, on purpose:
 * - ExtractedGrid <- GET /deals/{id}/screening-materials (claims-derived,
 *   deterministic, fast) -- shows for any parsed deal, never blocked by the LLM.
 * - HighlightsPanel / RiskFlagsPanel <- GET /deals/{id}/screening-insights (the
 *   LLM pass). A slow or failed model call only affects these two panels; the
 *   extracted grid is unaffected. Both render their empty state until (or if)
 *   the insights arrive.
 * ScreeningDecisionBar stays null -- a recorded advance/reject human decision
 * has no backend surface yet.
 */
export function ScreeningTab({ dealId, fileName }: ScreeningTabProps) {
  const screeningQuery = useQuery({
    queryKey: screeningQueryKey(dealId),
    queryFn: () => fetchScreening(dealId),
  });
  const view = screeningQuery.data ? mapScreening(screeningQuery.data) : null;

  const materialsQuery = useQuery({
    queryKey: screeningMaterialsQueryKey(dealId),
    queryFn: () => fetchScreeningMaterials(dealId),
  });
  const materials = materialsQuery.data ?? null;
  // ExtractedGrid's ScreeningCitedField.citation is optional (string?), while
  // the wire carries an explicit null — normalise null -> undefined.
  const extractedFields = materials
    ? materials.extractedFields.map((f) => ({
        label: f.label,
        value: f.value,
        citation: f.citation ?? undefined,
      }))
    : null;

  // Separate query: the LLM insights can be slow or fail without touching the
  // extracted grid above.
  const insightsQuery = useQuery({
    queryKey: screeningInsightsQueryKey(dealId),
    queryFn: () => fetchScreeningInsights(dealId),
  });
  const insights = insightsQuery.data ?? null;

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-[18px] text-[color:var(--rev-text-1)]">Initial Screening</h2>
        <p className="text-[12.5px] text-[color:var(--rev-text-6)]">
          Quick fit check against the investment mandate, before this moves into full diligence.
        </p>
      </div>

      <MaterialsCard fileName={fileName} />

      {/* The verdict + mandate-fit gate on the SCREENING query and the extracted
          grid on the MATERIALS query -- INDEPENDENTLY, so a fast verdict (~100ms)
          shows on arrival instead of waiting behind a slow materials fetch (~8s),
          and vice versa. Each region's empty state is a definitive negative, so
          each is guarded by its OWN query's pending/error. The highlight/risk
          panels (insightsQuery, the LLM pass) render outside both, below. Every
          error is gated on NO cached data (view/materials === null) so a failed
          refetch keeps the last-good render rather than blanking it. */}
      {screeningQuery.isPending ? (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 py-8 text-sm text-[color:var(--rev-text-6)]"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading screening…
        </div>
      ) : screeningQuery.isError && view === null ? (
        <QueryErrorAlert
          message="Couldn't load screening for this deal."
          error={screeningQuery.error as Error | null}
        />
      ) : (
        <VerdictHeader verdict={view?.verdict ?? null} />
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        {materialsQuery.isPending ? (
          <div
            role="status"
            className="flex items-center gap-2 py-8 text-sm text-[color:var(--rev-text-6)]"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading extracted figures…
          </div>
        ) : materialsQuery.isError && materials === null ? (
          <QueryErrorAlert
            message="Couldn't load the extracted figures for this deal."
            error={materialsQuery.error as Error | null}
          />
        ) : (
          <ExtractedGrid fields={extractedFields} />
        )}
        {/* MandateFitPanel's fit === null copy reads as "not scored yet", which is
            MISLEADING on a load failure -- so don't render it while screening is
            pending or when it errored with nothing cached (the failure is surfaced
            in the verdict slot above); this cell stays empty rather than making a
            false claim. */}
        {screeningQuery.isPending || (screeningQuery.isError && view === null) ? null : (
          <MandateFitPanel fit={view?.fit ?? null} />
        )}
      </div>

      {/* Highlights + risk flags (the LLM insights pass) render independently of the
          gate above -- excluded from it entirely, not just from its pending check --
          so their already-loaded data shows even while the fast queries are still in
          flight. They sit empty until insights arrives. */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HighlightsPanel
          items={insights?.highlights ?? null}
          isLoading={insightsQuery.isPending}
          isError={insightsQuery.isError}
        />
        <RiskFlagsPanel
          items={insights?.riskFlags ?? null}
          isLoading={insightsQuery.isPending}
          isError={insightsQuery.isError}
        />
      </div>

      <div className="mt-5">
        <ScreeningDecisionBar decision={null} />
      </div>
    </div>
  );
}
