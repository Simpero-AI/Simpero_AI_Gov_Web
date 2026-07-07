/**
 * Simpero LLM Provider Abstraction — V1.0
 *
 * Provides a model-agnostic interface for invoking LLMs across multiple providers.
 * All providers are normalised to the OpenAI chat completions schema, which is the
 * de-facto standard for LLM APIs (Anthropic, Google, Mistral, and others all expose
 * an OpenAI-compatible endpoint or can be adapted to it).
 *
 * Design principles:
 *   1. Provider-agnostic: callers specify a logical model name (e.g. "claude-sonnet")
 *      and the provider layer resolves the correct endpoint, API key, and model id.
 *   2. Fallback chain: if a provider fails (rate limit, outage, quota), the next
 *      provider in the configured chain is tried automatically.
 *   3. The legacy `invokeLLM()` in `_core/llm.ts` delegates here with the `default` alias.
 *   4. Observable: every call logs provider name, model, latency, and fallback events.
 *
 * Provider resolution order: anthropic first, then gemini / groq / openrouter / deepseek / openai.
 *
 * Supported logical model aliases:
 *   "default"         → anthropic:claude-haiku-4-5-20251001 → …
 *   Anthropic IDs must match the Messages API (not shorthand like claude-haiku-3-5).
 */
import type { InvokeParams, InvokeResult } from "./_core/llm";
/** Classify LLM API error for diagnostics. Exported for Pass1 adaptive context sizing. */
export declare function classifyLLMError(errMsg: string): string;
export type ProviderName = "anthropic" | "openai" | "gemini" | "groq" | "openrouter" | "deepseek";
export interface ProviderConfig {
    name: ProviderName;
    baseUrl: string;
    apiKey: string;
    /** Whether this provider is available (key is set and non-empty) */
    available: boolean;
}
export interface ModelAlias {
    /** Logical name used by callers */
    alias: string;
    /** Ordered list of [provider, modelId] pairs to try */
    chain: Array<{
        provider: ProviderName;
        modelId: string;
    }>;
    /** Extended thinking token budget (0 = disabled) */
    thinkingBudget?: number;
}
/** True if `alias` is a registered logical model name (see `getModelAliases()`). */
export declare function isValidModelAlias(alias: string): boolean;
export interface LLMProviderOptions {
    /**
     * Logical model alias (e.g. "default", "claude-sonnet", "gpt4o").
     * Falls back to "default" if not specified.
     */
    model?: string;
    /**
     * Override the fallback chain for this call only.
     * Useful for forcing a specific provider in tests.
     */
    providerOverride?: ProviderName;
    /**
     * Maximum number of provider fallback attempts.
     * Defaults to the full chain length.
     */
    maxAttempts?: number;
}
/**
 * Invoke an LLM with automatic provider fallback.
 *
 * Usage:
 *   import { invokeLLMWithProvider } from "../llmProvider";
 *
 *   const result = await invokeLLMWithProvider(params, { model: "claude-sonnet" });
 *   const result = await invokeLLMWithProvider(params, { model: "gpt4o" });
 *   const result = await invokeLLMWithProvider(params); // uses "default" alias
 */
export declare function invokeLLMWithProvider(params: InvokeParams, options?: LLMProviderOptions): Promise<InvokeResult>;
export declare function getAvailableProviders(): Array<{
    name: ProviderName;
    available: boolean;
}>;
/** First Anthropic model in the `default` alias — log this on deploy to confirm Render runs current code (not stale Haiku ids). */
export declare function getDefaultAliasAnthropicModelId(): string | null;
export declare function getModelAliases(): string[];
/** True when the first provider in the alias chain is Anthropic (200K context — prefer full document). */
export declare function modelChainStartsWithAnthropic(alias: string): boolean;
