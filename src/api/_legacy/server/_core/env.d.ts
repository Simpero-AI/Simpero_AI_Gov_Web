export declare const ENV: {
    readonly cookieSecret: string;
    readonly databaseUrl: string;
    readonly ownerOpenId: string;
    readonly isProduction: boolean;
    /** HTTPS webhook for `system.notifyOwner` (Slack-compatible URL, Zapier, etc.). Sole delivery channel. */
    readonly notifyOwnerWebhookUrl: string;
    /** Optional `Authorization: Bearer …` value for the owner-notify webhook. */
    readonly notifyOwnerWebhookSecret: string;
    readonly anthropicApiKey: string;
    readonly openaiApiKey: string;
    /** Google AI Studio — OpenAI-compatible endpoint (Gemini) */
    readonly geminiApiKey: string;
    readonly groqApiKey: string;
    readonly openRouterApiKey: string;
    /** OpenAI-compatible DeepSeek API (https://api.deepseek.com) */
    readonly deepseekApiKey: string;
    readonly pineconeApiKey: string;
    /** Pinecone index name (created by `ensureIndex` if missing). Default matches vectorStore historical name. */
    readonly pineconeIndexName: string;
    /** Serverless spec when creating the index (aws + us-east-1 matches Pinecone free tier docs). */
    readonly pineconeServerlessCloud: string;
    readonly pineconeServerlessRegion: string;
    /** Cosine similarity floor for accepting a chunk as source (Pass 2 Pinecone). */
    readonly pass2PineconeScoreThreshold: number;
    readonly pass2PineconeTopK: number;
    /** Pass 2 TF-IDF fallback: min cosine for claim↔chunk match. */
    readonly pass2TfidfThreshold: number;
    readonly openaiEmbeddingsConfigured: boolean;
    readonly pineconePass2Ready: boolean;
    /** Pass 1: parallel section agents (1–8). Default 1 avoids Anthropic org TPM spikes on small tiers. */
    readonly pass1SectionConcurrency: number;
    /**
     * Pass 1 decoding temperature (default 0 for repeatable outputs where the provider honors it).
     * Raise slightly (e.g. 0.3) if prose quality stalls.
     */
    readonly pass1Temperature: number;
    /** Optional nucleus sampling for Pass 1; omit from API requests when unset. */
    readonly pass1TopP: number | null;
    /**
     * Pin Pass 1 to a single model alias (e.g. claude-sonnet) — no Sonnet→default→Haiku fallback.
     * Reduces run-to-run variance from different models. Must match `getModelAliases()`.
     */
    readonly pass1Model: string | null;
    /**
     * When set, successful Pass 1 section JSON is read/written under this directory (SHA-256 filenames).
     * Same document + prompts → cache hit without LLM calls. Ignore in `.gitignore` (e.g. `.cache/pass1`).
     */
    readonly pass1CacheDir: string | null;
    /** Per-provider attempts when the API returns rate limit / overload (429, 529, etc.). */
    readonly llmRateLimitMaxAttempts: number;
    /** Base backoff (ms) before retry; actual delay scales by attempt index + jitter. */
    readonly llmRateLimitBackoffBaseMs: number;
    /** Explicit path to `libreoffice` or `soffice` binary; empty = try `libreoffice` then `soffice` on PATH. */
    readonly libreOfficePath: string;
    readonly libreOfficeTimeoutMs: number;
    /** One JSON line per `pipeline_timing` event (and helpers may add more). */
    readonly structuredLogs: boolean;
    /** Multipart uploads (`analyse`, `verify`, etc.). Default 100MB; clamp 1MB–500MB. */
    readonly maxUploadFileBytes: number;
    /**
     * Reject PDFs over this many pages after conversion (0 = unlimited).
     * Applies to full pipeline and Verify mode.
     */
    readonly maxUploadPdfPages: number;
    /** Rolling window for `POST /analyse` rate limit (default 15 minutes). */
    readonly analysisRateLimitWindowMs: number;
    /** Max analysis submissions per user (or per IP when unauthenticated) per window. */
    readonly analysisRateLimitMax: number;
    /** `POST /verify` uses this window; falls back to `analysisRateLimitWindowMs` when unset. */
    readonly verifyRateLimitWindowMs: number;
    readonly verifyRateLimitMax: number;
    /** When `true`, users with `role === admin` skip HTTP abuse rate limits (not LLM provider limits). */
    readonly abuseLimitSkipAdmin: boolean;
    /**
     * Regenerate `llm_usage_master_summary` on this interval (minutes). 0 = off (still refreshes on async job complete + server startup).
     * Example: 60 = hourly snapshot for admin master report.
     */
    readonly llmUsageMasterSummaryRefreshMinutes: number;
};
