export interface Citation {
    page: number | null;
    section: string | null;
    quote: string | null;
    verified: boolean;
    /** Index into the document_chunks array for traceability */
    chunkIndex?: number | null;
    /** Cosine similarity or embedding score (0-1) from Pass 2 verification */
    similarityScore?: number | null;
    /** Explains verification outcome: "reranker_rejected", "reranker_unavailable", "year_mismatch", etc. */
    verificationNote?: string | null;
}
export interface Claim {
    id: string;
    text: string;
    citation: Citation;
}
export interface MemoSection {
    title: string;
    sectionKey: string;
    claims: Claim[];
}
export interface OFACEntityResult {
    entity: string;
    entityType: "individual" | "organization" | "unknown";
    status: "CLEAR" | "POSSIBLE_MATCH" | "CONFIRMED_MATCH" | "SCREENING_UNAVAILABLE";
    score?: number;
    matchedName?: string;
    matchedType?: string;
    sdnType?: string;
    programs?: string[];
    remarks?: string;
    screened_at: string;
}
export interface OFACScreeningSummary {
    results: OFACEntityResult[];
    entitiesScreened: number;
    possibleMatches: number;
    confirmedMatches: number;
    screeningAvailable: boolean;
    screenedAt: string;
}
export interface GovernanceFlag {
    category: string;
    description: string;
    severity: "H" | "M" | "L";
    regulation: string;
    /**
     * Optional neutral context for the supervisory file (facts, policy hooks, citations).
     * Non-prescriptive: do not instruct what the principal or committee should do.
     */
    reviewerNote?: string;
    /** @deprecated Legacy memos only; use `reviewerNote`. */
    recommendation?: string;
}
/** Optional note from a governance flag (supports persisted `recommendation` key). */
export declare function governanceFlagReviewerNote(flag: GovernanceFlag): string | undefined;
export interface ComplianceScorecard {
    finra3110Status: "COMPLIANT" | "REVIEW_REQUIRED" | "NON_COMPLIANT";
    claimsExtracted: number;
    claimsMatched: number;
    claimsFlagged: number;
    matchRate: number;
    /** Number of claims that were fully verified (citation.verified === true) */
    claimsVerified: number;
    /** Percentage of extracted claims that were verified (rounded integer) */
    verificationRate: number;
    /** Per-framework compliance results for all registered frameworks */
    frameworkResults?: import("./complianceFrameworks").FrameworkResult[];
}
/**
 * Migration 015 renamed the analogous DB columns (claimsVerified→claimsMatched,
 * verificationRate→matchRate) but that only affects new writes — previously
 * persisted memoJson blobs still carry the old field names and are missing
 * claimsMatched/matchRate entirely, which renders as "undefined% verified" in
 * the UI. Call this right after parsing a stored memoJson blob to backfill.
 */
export declare function backfillLegacyScorecardFields(memo: ICMemoResult): ICMemoResult;
/** How Pass 2 claim–source verification was executed for this memo. */
export type Pass2VerificationMode = "pinecone" | "tfidf" | "pinecone_fallback_tfidf";
/** Explains Pass 2 outcome when verification is weak or degraded (relevancy / confidence gate). */
export interface Pass2QualitySummary {
    mode: Pass2VerificationMode;
    pendingAfterPass1: number;
    verifiedByPass2: number;
    stillUnverifiedAfterPass2: number;
    lowConfidenceWarning: boolean;
    message?: string;
}
export interface DocumentChunk {
    page: number;
    section: string | null;
    text: string;
    charCount?: number;
    chunkIndex?: number;
    createdAt?: string | Date;
}
/**
 * Frozen copy of the user's investment mandate profile at analyse time — see
 * docs/product/mvp/INVESTMENT_MANDATE_AND_ONBOARDING_SPEC.md
 */
export interface InvestmentProfileMemoSnapshot {
    capturedAt: string;
    firmName?: string | null;
    firmType?: string | null;
    aumBand?: string | null;
    /** Opaque mandate object (sectors, exclusions, cheque size, etc.) */
    mandate: Record<string, unknown>;
    /** Scoring presets / dimension weights, etc. */
    weights: Record<string, unknown>;
}
/** Cryptographic lineage for the source file(s) and extracted text — Phase A auditability / stale-evidence checks. */
export interface SourceDocumentLineage {
    algorithm: "sha256";
    /** Digest of raw uploaded primary file bytes (CIM / contract / model as uploaded). */
    primarySha256: string;
    primaryFileName: string;
    primarySizeBytes: number;
    /** When Office → PDF conversion ran, digest of the PDF bytes passed to text extraction. */
    derivedPdfSha256?: string;
    supplementaryXlsx?: {
        sha256: string;
        fileName: string;
        sizeBytes: number;
    };
    /** Digest of ordered chunk page/section/text (detect parser or pipeline drift). */
    extractedChunksSha256: string;
    fingerprintedAt: string;
}
/**
 * Provenance-tagged metric value.
 *
 * Numeric conventions (integer storage to keep persisted values portable):
 *   - USD fields: integer USD CENTS (matches deals.dealSizeMinUsd convention)
 *   - Percent fields: integer BASIS POINTS (10000 bp = 100%)
 *   - Ratio fields: plain decimal (e.g. evRevenue = 14.8)
 *
 * To add a new metric field:
 *   1. Add the field to DealMetrics below.
 *   2. Add it to the JSON schema string emitted by the financial_analysis
 *      or deal_terms agent in server/methodologyLibrary.ts (or whichever
 *      section agent should own it).
 *   3. Update server/dealMetricsMerge.ts if it should also be sourced
 *      from xlsxParser.
 */
export interface MetricValue {
    value: number;
    source: "xlsx" | "claim_extract";
    citation?: Citation;
    /**
     * Coarse confidence signal, derived deterministically:
     *   - xlsxParser → maps FinancialMetric.confidence verbatim (high|medium|low)
     *   - claim_extract → "high" iff citation.verified after Pass-2, else "low"
     *
     * UI vocabulary: this internal three-tier signal must NOT surface as literal
     * "high confidence" / "low confidence" strings — analysts read "low confidence"
     * as "don't trust this number" when the underlying signal is actually citation
     * unverified. Render using ClaimBlock vocabulary instead:
     *   - tier=high   → "Verified"   (green check)
     *   - tier=medium → "Extracted"  (neutral)
     *   - tier=low    → "Unverified" (amber)
     * Single chip per metric, never two labels.
     */
    confidenceTier?: "high" | "medium" | "low";
}
export interface DealMetrics {
    valuationPreUsd?: MetricValue;
    valuationPostUsd?: MetricValue;
    evRevenue?: MetricValue;
    irrPct?: MetricValue;
    askPriceUsd?: MetricValue;
    equityStakePct?: MetricValue;
    revenueLatestUsd?: MetricValue;
    revenueGrowthPct?: MetricValue;
    ebitdaUsd?: MetricValue;
    ebitdaMarginPct?: MetricValue;
    grossMarginPct?: MetricValue;
    tamUsd?: MetricValue;
    samUsd?: MetricValue;
    somUsd?: MetricValue;
    growthCagrPct?: MetricValue;
}
/**
 * Recorded when both sources had a value for a field AND they differed
 * beyond the per-field tolerance. The winning value lives in DealMetrics;
 * this captures the losing alternative for audit / UI surfacing.
 */
export interface MetricDiscrepancy {
    field: keyof DealMetrics;
    xlsxValue: number;
    claimValue: number;
    deltaPct: number;
    citation?: Citation;
}
/**
 * Internal Pass-1 sidecar shape — what each section agent's LLM output
 * may contain alongside its claims[]. The merge step (server/dealMetricsMerge.ts)
 * resolves each entry into a MetricValue with full citation + source tag.
 *
 * Intentionally smaller than MetricValue: the LLM doesn't author the
 * source tag (set by merge code) or confidenceTier (derived from Pass-2's
 * citation.verified). Reducing the schema surface that weak models can mangle.
 */
export type Pass1MetricsSidecar = Partial<{
    [K in keyof DealMetrics]: {
        value: number;
        sourceQuote?: string;
        sourcePage?: number | null;
    };
}>;
/**
 * A single sentence in a structured prose field, carrying its inline citation
 * anchors so the UI can render per-sentence citation chips.
 *
 * Produced by Pass-3 composers that have been updated to emit
 * `{ sentences: [{ text, claimIds, provenance }] }` instead of a plain string.
 * The `claimIds` array references Claim.id values from ICMemoResult.sections[].claims[].
 */
export interface SourcedSentence {
    text: string;
    /** Claim IDs from the claimsIndex that this sentence is anchored to. */
    claimIds: string[];
    provenance: "synthesized" | "extracted" | "modeled";
}
/** Provenance of one Sourced<T> field on ICMemoDeliverable. */
export type Provenance = "synthesized" | "extracted" | "modeled" | "stub" | "missing";
/**
 * Generic envelope for any field of ICMemoDeliverable.
 * Carries the value + provenance + optional context.
 *
 * IMPORTANT (refusal contract): if provenance === "modeled", evidenceAnchors
 * is REQUIRED to be a non-empty array of claim IDs that the composer cited
 * as evidence. The composer registry enforces minEvidenceAnchors per modeled
 * field; the merge step collapses any modeled value missing/short on anchors
 * to { value: null, provenance: "missing", gapRef: undefined, reason: "insufficient_evidence" }.
 */
export interface Sourced<T> {
    value: T;
    provenance: Provenance;
    /** When provenance === "missing", optional gap-ID marker (e.g. "G-41") that
     *  links the placeholder chip in the UI to the gap doc tracking that
     *  deferred work. Intentionally surfaces the gap to the analyst. */
    gapRef?: string;
    /** Source citation + visible quote when provenance === "extracted". */
    citation?: Citation;
    /** Coarse confidence tier when provenance === "modeled". UI tints the badge. */
    confidence?: "low" | "medium" | "high";
    /** Set true when an upstream wave-1 composer was regenerated after this
     *  wave-2 output was produced. Only meaningful on executiveSummary +
     *  icRecommendation Sourced fields. */
    stale?: boolean;
    /** Required when provenance === "modeled". Claim IDs (from sections[].claims[].id)
     *  the LLM cites as evidence. */
    evidenceAnchors?: string[];
    /** Reason a missing value was emitted, e.g. "insufficient_evidence". */
    reason?: string;
}
/**
 * Coerces a prose field that may be a plain string (proseVersion=1), a single
 * SourcedSentence, or a SourcedSentence[] (proseVersion=2) into a plain string
 * for rendering in contexts that don't yet support per-sentence citation UX.
 * Also handles the Sourced<string> shape {value, provenance} that the LLM
 * occasionally emits when it ignores the SourcedSentence schema.
 */
export declare function proseFieldToString(v: unknown): string;
/**
 * Closed enum of icon keys the LLM is allowed to emit on visual blocks.
 * Composer output is validated against this list; unknown keys map to a default.
 */
export declare const IC_MEMO_ICON_KEYS: readonly ["growth", "team", "moat", "unit_economics", "market", "customers", "trending_up", "users", "shield", "dollar_sign", "target", "award", "alert_triangle", "check_circle", "building", "globe", "calendar", "file_text", "sparkles"];
export type IcMemoIconKey = (typeof IC_MEMO_ICON_KEYS)[number];
/**
 * Polished IC Memo deliverable produced by the Pass-3 compose phase.
 * Co-located on ICMemoResult.deliverable (optional — undefined on older memos
 * generated before the deliverable existed). Rendered deterministically by
 * /memo/:sessionId and the analysis tabs.
 */
export interface ICMemoDeliverable {
    recommendation: {
        verdict: Sourced<"PROCEED" | "CAUTION" | "DECLINE" | null>;
        score: Sourced<number | null>;
        oneLineRationale: Sourced<string | null>;
    };
    headerMetrics: {
        targetIrrPct: Sourced<number | null>;
        exitValuationUsd: Sourced<number | null>;
        moic: Sourced<number | null>;
    };
    executiveSummary: {
        paragraphs: Sourced<string | SourcedSentence[] | null>[];
        investmentHighlight: Sourced<string | null>;
    };
    investmentThesisCards: Sourced<Array<{
        theme: string;
        iconKey: IcMemoIconKey;
        bullets: string[] | SourcedSentence[];
    }> | null>;
    companyOverview: {
        foundedDate: Sourced<string | null>;
        hqLocation: Sourced<string | null>;
        employees: Sourced<number | null>;
        products: Sourced<Array<{
            name: string;
            description: string;
        }>>;
        revenueMix: Sourced<Array<{
            label: string;
            pct: number;
            note?: string;
        }>>;
    };
    marketCompetitive: {
        tamUsd: Sourced<number | null>;
        samUsd: Sourced<number | null>;
        somUsd: Sourced<number | null>;
        growthCagrPct: Sourced<number | null>;
        competitors: Sourced<Array<{
            name: string;
            weakness: string;
            winRatePct?: number;
        }> | null>;
        competitiveAdvantage: Sourced<string | null>;
    };
    financialGrid: Sourced<{
        columns: Array<{
            year: number;
            kind: "A" | "E" | "P";
        }>;
        rows: Array<{
            metric: string;
            values: Array<number | null>;
            unit: "usdCents" | "pct" | "monthsRunway";
        }>;
        /** Cell-level provenance matrix matching rows[].values[]. */
        cellProvenance: Provenance[][];
    }>;
    unitEconomics: Sourced<Array<{
        metric: string;
        value: string;
        trend: "up" | "down" | "flat";
    }>>;
    retentionMetrics: Sourced<Array<{
        metric: string;
        value: string;
    }>>;
    salesEfficiency: Sourced<Array<{
        metric: string;
        value: string;
    }>>;
    managementTeam: Sourced<Array<{
        name: string;
        title: string;
        background: string | SourcedSentence[];
        keyAchievement?: string | SourcedSentence[];
    }>>;
    board: Sourced<Array<{
        name: string;
        role: string;
    }>>;
    riskRegister: Sourced<Array<{
        risk: string;
        severity: "H" | "M" | "L";
        probability: "Very Low" | "Low" | "Medium" | "High";
        description: string | SourcedSentence[];
        mitigation: string | SourcedSentence[];
    }> | null>;
    investmentStructure: {
        valuationPreUsd: Sourced<number | null>;
        valuationPostUsd: Sourced<number | null>;
        investmentAmountUsd: Sourced<number | null>;
        ownershipPct: Sourced<number | null>;
        pricePerShareUsd: Sourced<number | null>;
        sharesPurchased: Sourced<number | null>;
        fullyDilutedShares: Sourced<number | null>;
        governanceRights: Sourced<Array<{
            label: string;
            value: string;
            iconKey: IcMemoIconKey;
        }>>;
    };
    capTable: Sourced<Array<{
        shareholder: string;
        shares: number;
        ownershipPct: number;
        investmentUsd: number | null;
    }>>;
    exitStrategy: {
        scenarios: Sourced<Array<{
            label: string;
            probabilityPct: number;
            moic: number;
            exitYear: number;
            exitValueUsd: number;
            irrPct: number;
        }>>;
        paths: Sourced<Array<{
            path: "Strategic Acquisition" | "IPO" | "Secondary Sale";
            probabilityPct: number;
            description: string;
            timeline: string;
        }>>;
        weightedReturn: Sourced<{
            weightedMoic: number;
            weightedIrrPct: number;
            expectedValueUsd: number;
            returnPeriodYears: number;
        }>;
    };
    dueDiligenceSummary: {
        categories: Array<{
            category: "Legal & Corporate" | "Financial" | "Technology & IP" | "Commercial" | "Team & HR" | "Market & Strategy";
            status: Sourced<"complete" | "in_progress">;
            findings: Sourced<string>;
            completenessPct: Sourced<number>;
            flaggedCount: Sourced<number>;
        }>;
        conclusion: Sourced<string | null>;
    };
    icRecommendation: {
        prose: Sourced<string | null>;
        highlightBullets: Sourced<string | null>[];
    };
    icVotingMembers: Sourced<Array<{
        name: string;
        role: string;
        isCurrentUser: boolean;
    }>>;
    aiConfidence: Sourced<number | null>;
    aiGenerationNotice: {
        ddResponseCount: number;
        documentCount: number;
        financialModelCount: number;
        comparableTxnCount: number;
    };
    /**
     * Format version for prose fields (executiveSummary.paragraphs,
     * riskRegister items, managementTeam items, investmentThesisCards).
     * Absent or 1 = plain strings (legacy). 2 = SourcedSentence[] arrays.
     * Set by assembleFinalDeliverable when at least one prose field was
     * successfully normalized into SourcedSentence[].
     */
    proseVersion?: 1 | 2;
    /** When the compose step ran. Drives "Last generated: …" topbar text. */
    composedAt: string;
}
/**
 * Per-section sidecar bag emitted by Pass-1 and consumed by Pass-3 composers
 * plus the icMemoSidecarMerge hoist helpers. Keyed by canonical
 * agent.sectionKey (the registry key, not the LLM-emitted parsed.sectionKey
 * which the model sometimes rewrites).
 */
export type SidecarBag = Record<string, {
    metrics: Record<string, unknown>;
    deliverableMetrics: Record<string, unknown>;
}>;
export interface ICMemoResult {
    sessionId: string;
    fileName: string;
    pageCount: number;
    sections: MemoSection[];
    scorecard: ComplianceScorecard;
    governance_flags: GovernanceFlag[];
    ofac_screening?: OFACScreeningSummary | null;
    processedAt: string;
    chunks: DocumentChunk[];
    /** Framework IDs selected by the user at upload time (defaults to all 4 if not set) */
    selectedFrameworks?: string[];
    /** Contract review result — populated when DocumentClassifierAgent identifies a contract document type (SPA, LPA, NDA, etc.) */
    contractReview?: import("../server/contractReviewAgent").ContractReview | null;
    /** Document type classification from DocumentClassifierAgent */
    documentType?: string;
    /** Jurisdiction resolved by JurisdictionAgent */
    resolvedJurisdiction?: string;
    /** Pass 2 path and optional low-confidence warning for reviewers */
    pass2Quality?: Pass2QualitySummary;
    /** Ingest fingerprints + extracted-text digest for audit export and stale-evidence comparisons */
    sourceLineage?: SourceDocumentLineage;
    /** User mandate/firm snapshot at run time — present only when a profile row existed for the analysing user */
    investmentProfileSnapshot?: InvestmentProfileMemoSnapshot;
    /** Typed deal-level metrics merged from XLSX + Pass-1 sidecar. */
    dealMetrics?: DealMetrics;
    /** Cross-source disagreements beyond per-field tolerance. */
    dealMetricDiscrepancies?: MetricDiscrepancy[];
    /** Pass-3 compose output. undefined on older memos that ran before the
     *  deliverable existed. */
    deliverable?: ICMemoDeliverable;
    /** Set to true when Pass-3 composition threw an error. The pipeline continues
     *  and persists the evidence (sections, dealMetrics, etc.) but deliverable
     *  will be absent. Clients can surface an appropriate warning to the user. */
    pass3Failed?: boolean;
    /** Set to true when fewer than 6 out of 11 wave-1 Pass-3 composers succeeded.
     *  The deliverable may be incomplete; clients should surface a warning. */
    pass3Degraded?: boolean;
    /** Per-section Pass-1 sidecar bag (typed metrics + deliverableMetrics).
     *  Persisted so memo.regenerateDeliverable / memo.regenerateComposer can
     *  re-run Pass-3 with the same evidence without re-running Pass-1. */
    pass1SidecarBag?: SidecarBag;
    /** Pass-4 scoring result — populated when investmentProfile was provided to runFullPipeline. */
    scoringResult?: ScoringResult;
    /** Set to true when Pass-4 scoring threw an error. The memo is still saved; scoring is absent. */
    pass4Failed?: boolean;
    /** Real company name extracted from the uploaded document. Distinct from the user-entered deal name. Falls back to deal name if extraction fails. */
    entityName?: string | null;
}
export interface CriterionScore {
    criterionId: string;
    criterionName: string;
    score: number;
    rationale: string;
    sourceQuote?: string;
}
export interface CategoryScore {
    categoryId: string;
    categoryName: string;
    categoryWeight: number;
    score: number;
    criterionScores: CriterionScore[];
}
export interface MandateDimensionFit {
    dimension: string;
    fits: boolean;
    rationale: string;
}
export interface ScoringResult {
    aiScore: number;
    mandateFitPct: number;
    dealBreakerTriggered: boolean;
    categoryScores: CategoryScore[];
    mandateDimensions: MandateDimensionFit[];
    frameworkSnapshot: Record<string, unknown>;
    scoredAt: string;
    warnings?: string[];
    /** Set when >20% of criterion IDs returned by the LLM didn't match configured framework criteria */
    criterionIdMismatchWarning?: boolean;
    /** The unrecognised criterion IDs that triggered criterionIdMismatchWarning */
    mismatchedCriterionIds?: string[];
}
export interface VerifyClaimResult {
    id: string;
    text: string;
    verified: boolean;
    citation: Citation;
}
export interface VerifyOutputResult {
    totalClaims: number;
    claimsMatched: number;
    claimsUnmatched: number;
    claims: VerifyClaimResult[];
}
export declare const IC_MEMO_SECTIONS: readonly [{
    readonly key: "executive_summary";
    readonly title: "1. Executive Summary";
}, {
    readonly key: "business_overview";
    readonly title: "2. Business Overview";
}, {
    readonly key: "financial_snapshot";
    readonly title: "3. Financial Snapshot";
}, {
    readonly key: "market_commercial";
    readonly title: "4. Market & Commercial";
}, {
    readonly key: "management_governance";
    readonly title: "5. Management & Governance";
}, {
    readonly key: "risk_register";
    readonly title: "6. Risk Register";
}, {
    readonly key: "deal_terms";
    readonly title: "7. Deal Terms";
}, {
    readonly key: "red_flags";
    readonly title: "8. Red Flags";
}];
