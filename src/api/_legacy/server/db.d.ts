import type { InsertFlagFeedback, InsertUser } from "../drizzle/schema";
import type { LlmUsageRollup } from "../shared/llmUsageRollup";
import type { ICMemoResult, InvestmentProfileMemoSnapshot } from "../shared/simperoTypes";
/**
 * Exported so other Postgres clients against this same connection string (e.g. the
 * standalone `pg.Client` in dbMigrations.ts) apply the same Supabase-pooler-safe TLS
 * behavior as the app's main connection, instead of hitting SELF_SIGNED_CERT_IN_CHAIN.
 */
export declare function resolvePostgresSslOption(connectionString: string): {
    rejectUnauthorized: boolean;
    servername: string;
} | false;
export declare function getDb(): Promise<any | null>;
/** After `getDb()` resolves, indicates whether the live pool is Postgres (`true`) or MySQL (`false`). */
export declare function getDbKind(): Promise<"none" | "postgres" | "mysql">;
export declare function upsertUser(user: InsertUser): Promise<void>;
export declare function getUserByOpenId(openId: string): Promise<any>;
export declare const DEV_BYPASS_OPEN_ID = "dev-local-bypass-sk-omit-auth";
export declare function getSyntheticUserFromSession(input: {
    openId: string;
    name?: string | null;
    email?: string | null;
}): import("../drizzle/schema").User;
/**
 * Local auth bypass must still produce a stable user shape when no database is available.
 * This keeps tRPC `auth.me` and upload polling usable in memory-only MVP runs.
 */
export declare function getSyntheticDevBypassUser(): import("../drizzle/schema").User;
export declare function getOrCreateDevUser(): Promise<import("../drizzle/schema").User | import("../drizzle/schema.pg").PgUser | null>;
export declare function getUserInvestmentProfile(userId: number): Promise<{
    firmName: string | null;
    firmType: string | null;
    aumBand: string | null;
    mandate: Record<string, unknown>;
    weights: Record<string, unknown>;
    updatedAt: Date;
} | null>;
export declare function upsertUserInvestmentProfile(userId: number, input: {
    firmName?: string | null;
    firmType?: string | null;
    aumBand?: string | null;
    mandate?: Record<string, unknown>;
    weights?: Record<string, unknown>;
}): Promise<void>;
/** Build snapshot for attaching to ICMemoResult (null if profile row absent). */
export declare function investmentProfileMemoSnapshot(userId: number): Promise<InvestmentProfileMemoSnapshot | null>;
export declare function saveMemoSession(userId: number, dealId: number, result: ICMemoResult): Promise<void>;
export declare function getUserMemoSessions(userId: number): Promise<any>;
export declare function getMemoSessionBySessionId(userId: number, sessionId: string): Promise<ICMemoResult | null>;
/**
 * Like getMemoSessionBySessionId but also returns the dealId.
 * Used by history.get so the IC Memo page can resolve its parent deal.
 * The original helper is left untouched to avoid cascading caller changes.
 */
export declare function getMemoSessionWithDealId(userId: number, sessionId: string): Promise<{
    memo: ICMemoResult;
    dealId: number | null;
} | null>;
export declare function deleteMemoSession(userId: number, sessionId: string): Promise<boolean>;
export declare function deleteAllMemoSessionsForUser(userId: number): Promise<number>;
export declare function saveAttestation(userId: number, sessionId: string, principalName: string, crdNumber: string, firmName: string | undefined, attestationText: string): Promise<void>;
export declare function getAttestation(sessionId: string): Promise<any>;
export declare function createSharedMemo(userId: number, sessionId: string, fileName: string, memoJson: string, token: string): Promise<string>;
export declare function getSharedMemo(token: string): Promise<{
    memoJson: string;
    fileName: string;
    expiresAt: Date;
    viewCount: number;
    createdAt: Date;
} | null>;
export declare function saveFlagFeedback(data: InsertFlagFeedback): Promise<void>;
export declare function getFlagFeedbackForSession(sessionId: string): Promise<Array<{
    flagCategory: string;
    action: "accept" | "dismiss";
    justification: string | null;
}>>;
export declare function getFlagFeedbackStats(): Promise<Array<{
    flagCategory: string;
    acceptCount: number;
    dismissCount: number;
}>>;
/**
 * Best-effort append-only row for each successful LLM call. Never throws.
 * Join with your provider price list (per model, input vs output $/1M tokens) to estimate cost.
 */
export declare function recordLlmUsageEvent(params: {
    provider: string;
    modelAlias: string;
    requestedModelId: string;
    apiModel: string | null;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
}): Promise<void>;
export declare function aggregateLlmUsageForJob(jobId: string): Promise<LlmUsageRollup | null>;
export declare function aggregateLlmUsageForSession(sessionId: string): Promise<LlmUsageRollup | null>;
export type LlmUsageEventDTO = {
    id: number;
    createdAt: Date;
    provider: string;
    modelAlias: string;
    requestedModelId: string;
    apiModel: string | null;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number | null;
};
/** Per-call breakdown for admins (typically one async analysis job). */
export declare function listLlmUsageEventsForJob(jobId: string): Promise<LlmUsageEventDTO[]>;
export type ProductUsageJobSummaryDTO = {
    jobId: string;
    sessionId: string;
    ownerUserId: number | null;
    memoFileName: string | null;
    createdAt: Date;
    updatedAt: Date;
    rollup: LlmUsageRollup | null;
};
/**
 * Completed async analyse jobs — rollup from persisted JSON when present, otherwise computed from `llm_usage_events`.
 */
export declare function listRecentCompletedJobsForProductUsageAdmin(limit: number): Promise<ProductUsageJobSummaryDTO[]>;
/** Best-effort append-only audit row. Never throws (logs warning on failure). */
export declare function appendAuditLog(params: {
    action: string;
    userId?: number | null;
    sessionId?: string | null;
    jobId?: string | null;
    metadata?: Record<string, unknown> | null;
}): Promise<void>;
export type AuditLogEntryDTO = {
    id: number;
    createdAt: Date;
    action: string;
    userId: number | null;
    sessionId: string | null;
    jobId: string | null;
    metadata: Record<string, unknown> | null;
};
export declare function listAuditLogRowsForSession(sessionId: string): Promise<AuditLogEntryDTO[]>;
/**
 * Return all audit_log rows whose sessionId matches any memo_session belonging
 * to the given deal. Sorted descending (newest first), capped at 100 rows.
 */
export declare function listAuditLogRowsForDeal(dealId: number): Promise<AuditLogEntryDTO[]>;
export type JobActivityDTO = {
    jobId: string;
    sessionId: string;
    status: string;
    phase: string;
    usageRollup: LlmUsageRollup | null;
    createdAt: Date;
    updatedAt: Date;
};
/**
 * Return the most recent analysis_job for any memo_session under the given deal.
 */
export declare function getMostRecentJobForDeal(dealId: number): Promise<JobActivityDTO | null>;
/**
 * List the most recent audit log entries across all sessions for a user.
 * Used by the Dashboard "Audit Activity" panel.
 */
export declare function listRecentAuditLogRowsForUser(userId: number, limit?: number): Promise<AuditLogEntryDTO[]>;
/**
 * Aggregate per-composer regenerate counts from `audit_log`.
 *
 * Each `memo_composer_regenerated` row carries `{ composeKey, wave, steered }`
 * in its JSON metadata (see `routers.ts memo.regenerateComposer`). We group
 * by composeKey and return count + last-used timestamp.
 *
 * NOTE: per-composer cost attribution is NOT available — `llm_usage_events`
 * has no `phase`/`subPhase` column, so cost can only be attributed at the
 * job level today. Returning `totalCostUsdCents: 0` until those columns land.
 */
export type ComposerRegenerationStatRow = {
    subPhase: string;
    count: number;
    totalCostUsdCents: number;
    lastUsedAt: Date | null;
};
export declare function getComposerRegenerationStats(): Promise<ComposerRegenerationStatRow[]>;
