import type { MemoSection, Pass1MetricsSidecar } from "../shared/simperoTypes";
/** Stable SHA-256 hex key for Pass 1 disk cache entries. */
export declare function buildPass1CacheKey(input: {
    sectionKey: string;
    systemPrompt: string;
    chunksText: string;
    xlsxContext: string;
    jurisdictionKey: string;
    temperature: number;
    topP: number | null;
    modelsToTry: string;
    bodiesJoined: string;
}): string;
export declare function readPass1SectionCache(cacheDir: string, key: string): Promise<{
    section: MemoSection;
    sidecar: Pass1MetricsSidecar;
    deliverableSidecar: Record<string, unknown>;
} | null>;
export declare function writePass1SectionCache(cacheDir: string, key: string, section: MemoSection, sidecar: Pass1MetricsSidecar, deliverableSidecar?: Record<string, unknown>): Promise<void>;
