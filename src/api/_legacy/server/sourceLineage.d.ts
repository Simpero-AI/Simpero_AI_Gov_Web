import type { DocumentChunk, SourceDocumentLineage } from "../shared/simperoTypes";
export declare function sha256Hex(buf: Buffer): string;
/** Stable digest of ordered chunk text — same chunks → same hash (parse / pipeline version changes may drift). */
export declare function computeExtractedChunksSha256(chunks: DocumentChunk[]): string;
export declare function buildSourceDocumentLineage(input: {
    primaryBuffer: Buffer;
    primaryFileName: string;
    /** PDF bytes used for `parsePDF`. Omit or pass same reference as primary for native `.pdf`. */
    derivedPdfBuffer?: Buffer;
    supplementaryXlsx?: {
        buffer: Buffer;
        fileName: string;
    };
    chunks: DocumentChunk[];
}): SourceDocumentLineage;
/** Compare a freshly computed chunk digest to a memo’s stored lineage (e.g. before relying on regenerated sections). */
export declare function isExtractedEvidenceStale(stored: SourceDocumentLineage | undefined, currentChunksSha256: string): boolean;
