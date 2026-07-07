/**
 * Shared shape for `pnpm report:llm-usage:json`, DB `llm_usage_master_summary`, and admin APIs.
 */

export type LlmUsageReportTotals = {
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  sumLatencyMs: number;
};

export type LlmUsageReportByModelRow = {
  apiModel: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

/** Preferred for costing — distinguishes OpenRouter vs direct Anthropic etc. */
export type LlmUsageReportByProviderModelRow = {
  provider: string;
  apiModel: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LlmUsageCostEstimateRow = {
  provider: string;
  apiModel: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  ruleLabel: string | null;
  inputUsdPerMillion: number | null;
  outputUsdPerMillion: number | null;
  estimatedUsd: number | null;
};

export type LlmUsageCostEstimate = {
  pricingSourceLabel: string;
  pricedSubtotalUsd: number;
  pricedPromptTokens: number;
  pricedCompletionTokens: number;
  pricedCalls: number;
  unpricedCalls: number;
  unpricedSlices: Array<{ provider: string; apiModel: string; calls: number }>;
  byRow: LlmUsageCostEstimateRow[];
};

export type LlmUsageReportByUserRow = {
  userId: string;
  calls: number;
  totalTokens: number;
};

export type LlmUsageReportJobs = {
  completedJobs: number;
  completedJobsWithRollup: number;
};

/** Full rollup over `llm_usage_events` (+ async job rollup coverage when migrations applied). */
export type LlmUsageReportPayload = {
  generatedAt: string;
  dbTarget: string;
  totals: LlmUsageReportTotals;
  byModel: LlmUsageReportByModelRow[];
  /** Top slices by metering `provider` + API model label. */
  byProviderModel?: LlmUsageReportByProviderModelRow[];
  /** Present on fresh payloads; older DB snapshots may omit until regenerated. */
  llmCostEstimate?: LlmUsageCostEstimate | null;
  byUser: LlmUsageReportByUserRow[];
  jobs: LlmUsageReportJobs | null;
};
