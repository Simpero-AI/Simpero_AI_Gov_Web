/** Request-scoped attribution for LLM calls (one analysis / report run shares the same context). */
export type LlmUsageContext = {
    sessionId: string;
    jobId: string | null;
    userId: number | null;
};
export declare function runWithLlmUsageContext<T>(ctx: LlmUsageContext, fn: () => Promise<T>): Promise<T>;
export declare function getLlmUsageContext(): LlmUsageContext | undefined;
