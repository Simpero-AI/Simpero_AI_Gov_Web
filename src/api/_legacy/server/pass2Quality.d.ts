import type { MemoSection, Pass2QualitySummary, Pass2VerificationMode } from "../shared/simperoTypes";
/** One retry for transient embedding/Pinecone failures (pipeline Pass 2). */
export declare function isRetriableNeuralPass2Error(err: unknown): boolean;
/** Short reviewer-facing hint after neural Pass 2 falls back to TF-IDF. */
export declare function hintForNeuralPass2Failure(err: unknown): string;
/** Count Pass-1-unverified claims that Pass 2 turned verified vs left open. */
export declare function computePass2ClaimDelta(pass1Sections: MemoSection[], verifiedSections: MemoSection[]): {
    pendingAfterPass1: number;
    verifiedByPass2: number;
};
/**
 * Surface degraded or weak Pass 2 behaviour so the UI is not silent when verification quality is poor.
 */
export declare function buildPass2QualitySummary(delta: {
    pendingAfterPass1: number;
    verifiedByPass2: number;
}, mode: Pass2VerificationMode, ctx: {
    chunkCount: number;
    pageCount: number;
}, options?: {
    neuralFallbackHint?: string;
}): Pass2QualitySummary;
