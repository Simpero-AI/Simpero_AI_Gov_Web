import type { ICMemoDeliverable, MemoSection, ScoringResult, CategoryScore, CriterionScore, MandateDimensionFit } from "../shared/simperoTypes";
type StoredProfile = {
    mandate: Record<string, unknown>;
    weights: Record<string, unknown>;
    firmName: string | null;
    firmType: string | null;
    aumBand: string | null;
    updatedAt: Date;
};
/** Pure helper: weighted average of criterion scores within one category. Exported for testing. */
export declare function aggregateCategoryScore(criterionScores: Pick<CriterionScore, "criterionId" | "score">[], subWeights: number[]): number;
/** Pure helper: weighted sum of category scores to produce aiScore. Exported for testing. */
export declare function aggregateAiScore(categoryScores: Pick<CategoryScore, "categoryWeight" | "score">[]): number;
/** Pure helper: compute mandateFitPct from mandate dimensions. Exported for testing. */
export declare function computeMandateFitPct(dims: Pick<MandateDimensionFit, "fits">[], dealBreakerTriggered: boolean): number;
export declare function runPass4Scoring(deliverable: ICMemoDeliverable, sections: MemoSection[], profile: StoredProfile): Promise<ScoringResult>;
export {};
