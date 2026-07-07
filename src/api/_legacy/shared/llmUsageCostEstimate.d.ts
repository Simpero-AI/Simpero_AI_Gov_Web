import type { LlmPricingRule } from "./llmPricingRules";
import type { LlmUsageCostEstimate, LlmUsageReportByProviderModelRow } from "./llmUsageReportPayload";
export type { LlmUsageCostEstimate, LlmUsageCostEstimateRow } from "./llmUsageReportPayload";
export declare function estimateLlmUsageCosts(rows: LlmUsageReportByProviderModelRow[], rules: LlmPricingRule[], pricingSourceLabel: string): LlmUsageCostEstimate;
