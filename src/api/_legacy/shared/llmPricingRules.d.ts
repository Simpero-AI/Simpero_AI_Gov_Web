/**
 * Optional file: config/llm-pricing.json
 * `{ "rules": [ { "providerExact", "apiModelPrefix?", "inputUsdPerMillion", "outputUsdPerMillion", "label" }, ... ] }`
 * Rules are evaluated first from the file (if any), then built-in defaults. First match wins.
 */
export type LlmPricingRule = {
    /** Lowercase vendor id from metering (anthropic, openai, gemini, ...). "*" = any. */
    providerExact: string;
    /** Empty = any model string for this provider. Otherwise apiModel.trim().toLowerCase().startsWith(prefix). */
    apiModelPrefix: string;
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
    label: string;
};
export declare const DEFAULT_LLM_PRICING_RULES: LlmPricingRule[];
/** User rules precede defaults; first matching rule wins. */
export declare function loadLlmPricingRules(projectRoot: string): {
    rules: LlmPricingRule[];
    pricingSourceLabel: string;
};
export declare function pickLlmPricingRule(provider: string, apiModel: string, rules: LlmPricingRule[]): LlmPricingRule | null;
