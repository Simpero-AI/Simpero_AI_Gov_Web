/**
 * Rollup of LLM token usage for one async analysis job (or any grouped context).
 * Stored JSON in `analysis_jobs.usageRollupJson` on job completion.
 */
export type LlmUsageByModelRow = {
    provider: string;
    modelAlias: string;
    requestedModelId: string;
    apiModel: string | null;
    llmCalls: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
};
export type LlmUsageRollup = {
    llmCalls: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalLatencyMs: number;
    byModel: LlmUsageByModelRow[];
};
export declare function parseUsageRollupJson(raw: string | null | undefined): LlmUsageRollup | null;
