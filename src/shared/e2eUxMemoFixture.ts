/**
 * Deterministic IC memo payload for Playwright UX tests and optional E2E share fixture.
 * Keep in sync with `ICMemoResult` / `getSectionConfidence` expectations.
 */
import type {
  ICMemoDeliverable,
  ICMemoResult,
  ScoringResult,
  Sourced,
  SourceDocumentLineage,
} from "./simperoTypes";

/** Placeholder primary digest — E2E has no real upload buffer. Chunk digest matches server `computeExtractedChunksSha256`. */
const E2E_SOURCE_LINEAGE: SourceDocumentLineage = {
  algorithm: "sha256",
  primarySha256: "e2e0000000000000000000000000000000000000000000000000000000000000",
  primaryFileName: "e2e-ux-memo.pdf",
  primarySizeBytes: 1024,
  extractedChunksSha256:
    "74ceab5304e2f8da28d058c0a36ddaf8118ee4ba826aafbf8964c3d617e6c617",
  fingerprintedAt: "2026-01-01T00:00:00.000Z",
};

export const E2E_UX_MEMO_SESSION_ID = "e2e-ux-memo-session";

/** Magic token — only honored when server has `E2E_SHARED_MEMO_FIXTURE=1` (Playwright webServer). */
export const E2E_SHARED_MEMO_TOKEN = "__e2e_shared_memo__";

export function buildE2eUxMemo(): ICMemoResult {
  return {
    sessionId: E2E_UX_MEMO_SESSION_ID,
    fileName: "e2e-ux-memo.pdf",
    pageCount: 1,
    processedAt: new Date().toISOString(),
    chunks: [{ page: 1, section: "p1", text: "E2E fixture chunk for citation context." }],
    sourceLineage: E2E_SOURCE_LINEAGE,
    selectedFrameworks: ["finra_3110"],
    scorecard: {
      finra3110Status: "REVIEW_REQUIRED",
      claimsExtracted: 2,
      claimsMatched: 1,
      claimsFlagged: 1,
      claimsVerified: 0,
      verificationRate: 0,
      matchRate: 50,
    },
    governance_flags: [],
    pass2Quality: {
      mode: "tfidf",
      pendingAfterPass1: 2,
      verifiedByPass2: 1,
      stillUnverifiedAfterPass2: 1,
      lowConfidenceWarning: true,
      message: "E2E: simulated degraded Pass 2 — reviewer acknowledgment required.",
    },
    sections: [
      {
        sectionKey: "executive_summary",
        title: "1. Executive Summary",
        claims: [
          {
            id: "c1",
            text: "Verified claim for E2E.",
            citation: { page: 1, section: "p1", quote: "fixture", verified: true },
          },
          {
            id: "c2",
            text: "Unverified claim for section badge.",
            citation: { page: 1, section: "p1", quote: "fixture", verified: false },
          },
        ],
      },
      {
        sectionKey: "business_overview",
        title: "2. Business Overview",
        claims: [
          {
            id: "c3",
            text: "All verified in this section — badge shows degraded when Pass 2 is low confidence.",
            citation: { page: 1, section: "p1", quote: "fixture", verified: true },
          },
        ],
      },
    ],
    scoringResult: E2E_SCORING_RESULT,
  };
}

const E2E_SCORING_RESULT: ScoringResult = {
  aiScore: 72,
  mandateFitPct: 78,
  dealBreakerTriggered: false,
  scoredAt: new Date().toISOString(),
  frameworkSnapshot: { frameworkId: "e2e-test-framework", version: "1.0" },
  categoryScores: [
    {
      categoryId: "revenue-growth",
      categoryName: "Revenue & Growth Quality",
      categoryWeight: 30,
      score: 80,
      criterionScores: [
        {
          criterionId: "arr-scale",
          criterionName: "ARR Scale & Growth Rate",
          score: 82,
          rationale: "E2E fixture: strong ARR growth signal present in document.",
          sourceQuote: "fixture",
        },
        {
          criterionId: "nrr",
          criterionName: "Net Revenue Retention",
          score: 78,
          rationale: "E2E fixture: NRR above threshold.",
        },
      ],
    },
    {
      categoryId: "market-opportunity",
      categoryName: "Market Opportunity",
      categoryWeight: 25,
      score: 70,
      criterionScores: [
        {
          criterionId: "tam-size",
          criterionName: "Total Addressable Market",
          score: 70,
          rationale: "E2E fixture: TAM meets minimum mandate criterion.",
        },
      ],
    },
    {
      categoryId: "team-execution",
      categoryName: "Team & Execution",
      categoryWeight: 25,
      score: 68,
      criterionScores: [
        {
          criterionId: "founder-quality",
          criterionName: "Founder Pedigree",
          score: 72,
          rationale: "E2E fixture: founders have relevant domain experience.",
        },
        {
          criterionId: "key-person-risk",
          criterionName: "Key-Person Risk",
          score: 50,
          rationale: "E2E fixture: key-person risk flagged, no insurance documented.",
        },
      ],
    },
    {
      categoryId: "financial-health",
      categoryName: "Financial Health",
      categoryWeight: 20,
      score: 58,
      criterionScores: [
        {
          criterionId: "audited-financials",
          criterionName: "Audited Financial Statements",
          score: 40,
          rationale: "E2E fixture: audited financials not provided.",
        },
        {
          criterionId: "unit-economics",
          criterionName: "Unit Economics",
          score: 75,
          rationale: "E2E fixture: unit economics within acceptable range.",
        },
      ],
    },
  ],
  mandateDimensions: [
    { dimension: "ARR > $10M at entry", fits: true, rationale: "E2E: ARR threshold met." },
    { dimension: "Audited Financials", fits: false, rationale: "E2E: not provided in document." },
    { dimension: "NRR > 110%", fits: true, rationale: "E2E: NRR above threshold." },
  ],
  warnings: ["E2E fixture scoring — not based on real document analysis."],
};

// ---------------------------------------------------------------------------
// Playwright fixtures for /memo + /analysis polished surfaces
// ---------------------------------------------------------------------------
//
// Two extra deterministic memos backing the e2e specs:
//   * E2E_DELIVERABLE_SESSION_ID / E2E_DELIVERABLE_DEAL_ID → fully populated
//     ICMemoDeliverable (renders all 11 sections + status bar + topbar
//     Regenerate button)
//   * E2E_EMPTY_DELIVERABLE_SESSION_ID / E2E_EMPTY_DELIVERABLE_DEAL_ID → memo
//     with `deliverable === undefined` (drives the EmptyState CTA on
//     /memo/:sessionId for older or never-composed memos)
//
// Both are served by `history.get`, `deals.get`, and `deals.status` when
// `E2E_SHARED_MEMO_FIXTURE === "1"` (see server/routers.ts).

export const E2E_DELIVERABLE_SESSION_ID = "e2e-deliverable-session";
export const E2E_DELIVERABLE_DEAL_ID = 9001;
export const E2E_DELIVERABLE_DEAL_NAME = "E2E Polished Deliverable";
export const E2E_DELIVERABLE_GP_SOURCE = "Playwright Fixture";

export const E2E_EMPTY_DELIVERABLE_SESSION_ID = "e2e-empty-deliverable-session";
export const E2E_EMPTY_DELIVERABLE_DEAL_ID = 9002;
export const E2E_EMPTY_DELIVERABLE_DEAL_NAME = "E2E Memo Without Deliverable";
export const E2E_EMPTY_DELIVERABLE_GP_SOURCE = "Playwright Fixture (Empty)";

function synthesized<T>(value: T): Sourced<T> {
  return { value, provenance: "synthesized" };
}

function buildE2eDeliverable(): ICMemoDeliverable {
  return {
    recommendation: {
      verdict: synthesized("PROCEED" as const),
      score: synthesized(7.5),
      oneLineRationale: synthesized("Strong ARR growth + defensible moat."),
    },
    headerMetrics: {
      targetIrrPct: synthesized(2500),
      exitValuationUsd: synthesized(1_000_000_000),
      moic: synthesized(3),
    },
    executiveSummary: {
      paragraphs: [
        synthesized(
          "Investment thesis: this opportunity reflects a clear product-market fit signal and an experienced team."
        ),
        synthesized(
          "Capital efficiency and retention metrics support continued growth at the proposed valuation."
        ),
      ],
      investmentHighlight: synthesized("Series B growth capital, $25M ticket."),
    },
    investmentThesisCards: synthesized([
      {
        theme: "Durable revenue growth",
        iconKey: "growth",
        bullets: ["3x YoY ARR", "Net retention > 120%"],
      },
      {
        theme: "Experienced team",
        iconKey: "team",
        bullets: ["Founders ex-Stripe/Plaid", "Repeat exits"],
      },
    ]),
    companyOverview: {
      foundedDate: synthesized("2018"),
      hqLocation: synthesized("San Francisco, CA"),
      employees: synthesized(120),
      products: synthesized([
        { name: "Core Platform", description: "API-first ledger for B2B payments." },
      ]),
      revenueMix: synthesized([{ label: "Subscription", pct: 80 }]),
    },
    marketCompetitive: {
      tamUsd: synthesized(50_000_000_000),
      samUsd: synthesized(10_000_000_000),
      somUsd: synthesized(1_500_000_000),
      growthCagrPct: synthesized(1800),
      competitors: synthesized([
        { name: "Incumbent A", weakness: "Legacy architecture", winRatePct: 65 },
      ]),
      competitiveAdvantage: synthesized("API-first, schema-flexible architecture."),
    },
    financialGrid: synthesized({
      columns: [
        { year: 2023, kind: "A" as const },
        { year: 2024, kind: "E" as const },
      ],
      rows: [
        { metric: "Revenue (ARR)", values: [12_000_000, 24_000_000], unit: "usdCents" as const },
      ],
      cellProvenance: [["extracted", "modeled"]],
    }),
    unitEconomics: synthesized([
      { metric: "LTV/CAC", value: "4.2x", trend: "up" as const },
    ]),
    retentionMetrics: synthesized([{ metric: "GRR", value: "92%" }]),
    salesEfficiency: synthesized([{ metric: "Magic #", value: "1.4" }]),
    managementTeam: synthesized([
      {
        name: "Jane Founder",
        title: "CEO & Co-Founder",
        background: "10y fintech",
        keyAchievement: "Scaled prior company to $100M ARR",
      },
    ]),
    board: synthesized([{ name: "Director One", role: "Independent" }]),
    riskRegister: synthesized([
      {
        risk: "Customer concentration",
        severity: "M" as const,
        probability: "Medium" as const,
        description: "Top 3 customers = 40% of ARR.",
        mitigation: "Expanding mid-market motion to dilute concentration.",
      },
    ]),
    investmentStructure: {
      valuationPreUsd: synthesized(225_000_000),
      valuationPostUsd: synthesized(250_000_000),
      investmentAmountUsd: synthesized(25_000_000),
      ownershipPct: synthesized(1000),
      pricePerShareUsd: synthesized(12),
      sharesPurchased: synthesized(2_083_333),
      fullyDilutedShares: synthesized(20_833_333),
      governanceRights: synthesized([
        { label: "Board seat", value: "1 of 5", iconKey: "shield" as const },
      ]),
    },
    capTable: synthesized([
      { shareholder: "Founders", shares: 8_000_000, ownershipPct: 3840, investmentUsd: null },
      {
        shareholder: "New Investor",
        shares: 2_083_333,
        ownershipPct: 1000,
        investmentUsd: 25_000_000,
      },
    ]),
    exitStrategy: {
      scenarios: synthesized([
        {
          label: "Base" as const,
          probabilityPct: 60,
          moic: 3,
          exitYear: 2029,
          exitValueUsd: 750_000_000,
          irrPct: 2500,
        },
      ]),
      paths: synthesized([
        {
          path: "Strategic Acquisition" as const,
          probabilityPct: 70,
          description: "Most likely acquirer: large fintech.",
          timeline: "4-6 years",
        },
      ]),
      weightedReturn: synthesized({
        weightedMoic: 3,
        weightedIrrPct: 2500,
        expectedValueUsd: 750_000_000,
        returnPeriodYears: 5,
      }),
    },
    dueDiligenceSummary: {
      categories: [
        {
          category: "Legal & Corporate" as const,
          status: synthesized("complete" as const),
          findings: synthesized("Standard corp structure; no red flags."),
          completenessPct: synthesized(100),
          flaggedCount: synthesized(0),
        },
      ],
      conclusion: synthesized("DD largely complete; remaining items low-risk."),
    },
    icRecommendation: {
      prose: synthesized(
        "Recommend the IC approve a $25M Series B ticket subject to standard closing conditions."
      ),
      highlightBullets: [
        synthesized("Strong team, clear moat"),
        synthesized("Attractive entry multiple"),
      ],
    },
    icVotingMembers: synthesized([
      { name: "Partner A", role: "Managing Partner", isCurrentUser: true },
    ]),
    // AI Confidence intentionally missing so the status bar renders the
    // N/A + gap-link chip — exercised by the polished-deliverable e2e spec.
    aiConfidence: {
      value: null,
      provenance: "missing",
      gapRef: "G-41",
      reason: "insufficient_evidence",
    },
    aiGenerationNotice: {
      ddResponseCount: 1,
      documentCount: 1,
      financialModelCount: 0,
      comparableTxnCount: 1,
    },
    composedAt: "2026-05-23T00:00:00.000Z",
  };
}

/**
 * Fully populated memo backing the /memo/:sessionId polished layout + the
 * /analysis tab rewiring specs. Same E2E lineage as the base fixture so
 * existing checks keep working.
 */
export function buildE2eDeliverableMemo(): ICMemoResult {
  const base = buildE2eUxMemo();
  return {
    ...base,
    sessionId: E2E_DELIVERABLE_SESSION_ID,
    fileName: "e2e-deliverable.pdf",
    deliverable: buildE2eDeliverable(),
  };
}

/**
 * Memo without a Pass-3 deliverable, used by the EmptyState spec to verify the
 * generate-deliverable CTA renders when no polished memo has been composed.
 */
export function buildE2eEmptyDeliverableMemo(): ICMemoResult {
  const base = buildE2eUxMemo();
  return {
    ...base,
    sessionId: E2E_EMPTY_DELIVERABLE_SESSION_ID,
    fileName: "e2e-empty-deliverable.pdf",
    deliverable: undefined,
  };
}
