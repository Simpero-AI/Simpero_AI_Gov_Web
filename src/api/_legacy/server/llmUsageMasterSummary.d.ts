/**
 * Computes the org-wide usage report (`LlmUsageReportPayload`), persists singleton `llm_usage_master_summary`,
 * and exposes getters for admin UI / reconciliation.
 */
import type { LlmUsageReportPayload } from "../shared/llmUsageReportPayload";
/** Builds the same rollup as `pnpm report:llm-usage` / `:json`; null when DB unsupported or fatal query error. */
export declare function computeLlmUsageReportPayload(): Promise<LlmUsageReportPayload | null>;
export declare function upsertLlmUsageMasterSummary(payload: LlmUsageReportPayload, source: string): Promise<void>;
export declare function getLlmUsageMasterSummary(): Promise<{
    updatedAt: Date;
    source: string;
    payload: LlmUsageReportPayload;
} | null>;
/** Recompute full report and overwrite row id=1. */
export declare function refreshLlmUsageMasterSummary(source: string): Promise<void>;
/**
 * Periodic + startup hook — called from `_core/index.ts` after HTTP listen.
 */
export declare function scheduleLlmUsageMasterSummaryJobs(): void;
