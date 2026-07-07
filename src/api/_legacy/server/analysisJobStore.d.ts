import type { ICMemoResult } from "../shared/simperoTypes";
import type { LlmUsageRollup } from "../shared/llmUsageRollup";
export type AnalysisJobPhase = "queued" | "parsing" | "classify" | "pass1" | "pass2" | "governance" | "ofac" | "pass3_compose" | "pass4_score" | "finalize";
export type AnalysisJobState = {
    status: "queued" | "processing" | "complete" | "error";
    /** Pipeline / memo session id (namespaces Pinecone, etc.). */
    sessionId: string;
    /** DB user id of who started the job; null only in dev auth bypass. */
    ownerUserId: number | null;
    /**
     * Deal this job belongs to. Stored in-memory only (not persisted to DB) so
     * getDealStatusPayload can find an active queued/processing job for a deal
     * before memo_sessions is written (which only happens after pipeline completion).
     */
    dealId?: number | null;
    /** Server-reported stage so the client does not mis-label Pass 2 while Pass 1 is still running. */
    phase?: AnalysisJobPhase;
    /**
     * Fine-grained progress within the current phase (currently: Pass 1 section
     * agents completed / total). In-memory only, like `dealId` — not persisted
     * to DB, since it's only meaningful while this same process is actively
     * running the job; a restart mid-analysis loses it, which is acceptable
     * since the phase-level status still reflects reality.
     */
    phaseProgress?: {
        completed: number;
        total: number;
    } | null;
    result?: ICMemoResult;
    error?: string;
    /** Snapshot of LLM tokens for this job once complete (from `usageRollupJson`). */
    usageRollup?: LlmUsageRollup | null;
    startedAt: number;
    updatedAt: number;
};
/** In-process job row so GET /analyse-job can poll immediately (before DB insert finishes). */
export declare function stageAnalysisJobInMemory(jobId: string, sessionId: string, ownerUserId: number | null, dealId?: number | null): void;
/**
 * Look up the most recent in-memory job for a given deal that hasn't yet
 * produced a memo_sessions row: queued, processing, or errored. Used by
 * getDealStatusPayload to surface live job progress (or a failure reason)
 * before the pipeline completes. Errored jobs are included deliberately —
 * without them, a pipeline failure with no memo_sessions row was invisible
 * to the client, which fell back to the generic "no documents uploaded"
 * empty state instead of showing the actual error. Completed jobs are
 * excluded: once memo_sessions exists, that row is the source of truth.
 * Returns undefined if no matching in-memory job exists.
 */
export declare function getActiveInMemoryJobForDeal(dealId: number, ownerUserId: number): AnalysisJobState | undefined;
/**
 * Persist queued job to DB. No-op when DB is not configured.
 * @returns true when a row was inserted (caller may drop the memory shadow).
 */
/** After a durable DB row exists, drop the in-RAM row so getJob reads only from the database. */
export declare function dropQueuedJobMemoryShadow(jobId: string): void;
export declare function persistQueuedJobToDb(jobId: string, sessionId: string, ownerUserId: number | null): Promise<boolean>;
export declare function createQueuedJob(jobId: string, sessionId: string, ownerUserId: number | null): Promise<void>;
export declare function setJobProcessing(jobId: string): Promise<void>;
/** Non-blocking: pipeline must not await frequent phase bumps. */
export declare function setJobPhase(jobId: string, phase: AnalysisJobPhase): void;
/**
 * In-memory-only sub-progress within the current phase (e.g. Pass 1 section
 * agents completed so far). Never persisted — polling reads it straight off
 * the live job map, so it only needs to survive as long as this process does.
 */
export declare function setJobPhaseProgress(jobId: string, completed: number, total: number): void;
export declare function setJobComplete(jobId: string, result: ICMemoResult): Promise<void>;
export declare function setJobError(jobId: string, message: string): Promise<void>;
export declare function getJob(jobId: string): Promise<AnalysisJobState | undefined>;
