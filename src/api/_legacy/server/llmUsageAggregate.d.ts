import type { LlmUsageRollup } from "../shared/llmUsageRollup";
export type LlmUsageEventRowLike = {
    provider: string;
    modelAlias: string;
    requestedModelId: string;
    apiModel: string | null;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number | null;
};
/** Aggregate detailed usage rows into a rollup (one job, one session, etc.). */
export declare function rollupLlmUsageFromEvents(events: LlmUsageEventRowLike[]): LlmUsageRollup | null;
