/**
 * Pass-3 LLM call wrapper.
 *
 * Thin wrapper around server/llmProvider.invokeLLMWithProvider with the same
 * model-fallback loop pattern Pass-1 uses (resolvePass1ModelsToTry + the
 * runSectionAgent retry loop). One row per attempted call lands in
 * llm_usage_events tagged with {phase, subPhase} via the run-context machinery
 * inside invokeLLMWithProvider; this wrapper does not write usage rows
 * directly.
 *
 * Model order: env var PASS3_MODELS_ORDER (comma-separated) → falls back to
 * the Pass-1 list (PASS1_MODEL → ENV defaults) so Pass-3 can be tuned
 * independently without re-implementing the resolver.
 */
export interface CallLlmInput {
    systemPrompt: string;
    userPrompt: string;
    phase: string;
    subPhase: string;
    maxTokens?: number;
}
export interface CallLlmResult {
    content: string;
    model: string;
    usageEventId?: number;
}
export declare function callLlmWithFallback(input: CallLlmInput): Promise<CallLlmResult>;
