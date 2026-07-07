/**
 * Document Chunk Persistence — Phase 1 Auditability
 *
 * Writes parsed chunks to Postgres, enabling:
 *   1. Post-hoc audit trail (which chunk supported which claim)
 *   2. Re-verification and raw text inspection without re-parsing the original PDF
 */
import type { DocumentChunk } from "../shared/simperoTypes";
/**
 * Persist document chunks to the database after parsing.
 *
 * Non-fatal: if the table doesn't exist yet or DB is unavailable,
 * logs a warning and continues.
 */
export declare function persistDocumentChunks(sessionId: string, chunks: DocumentChunk[]): Promise<{
    persisted: boolean;
    count: number;
}>;
/**
 * Retrieve all persisted document chunks for a session from PostgreSQL.
 */
export declare function getDocumentChunksBySession(sessionId: string): Promise<DocumentChunk[]>;
