/**
 * Simpero Claim Enrichment Engine
 *
 * Provides:
 * 1. Claim type classification (financial, market, management, legal, ip, operational, recommendation = posture/decision-oriented phrasing)
 * 2. External corroboration sources for verified claims (deep-linked, claim-aware)
 * 3. Specific, non-generic next steps for unverified claims
 * 4. Financial benchmark context for financial claims
 */

export type ClaimType =
  | "financial_metric"
  | "financial_missing"
  | "market_size"
  | "competitive"
  | "management_bio"
  | "governance"
  | "ip_legal"
  | "deal_terms"
  | "operational"
  | "recommendation";

export interface ExternalSource {
  label: string;
  description: string;
  url: string;
  sourceType: "regulatory" | "benchmark" | "registry" | "database" | "market_data";
  /** When set, fetch results via our API and render inline instead of external link */
  inlineSource?: "sec_edgar";
  /** Search query for inline sources (extracted from claim text) */
  searchQuery?: string;
}

export interface ClaimEnrichment {
  claimType: ClaimType;
  externalSources: ExternalSource[]; // For verified claims: corroboration sources
  nextSteps: string[]; // For unverified claims: specific actionable steps
  benchmarkContext?: string; // For financial claims: benchmark comparison
}

// ─── Keyword patterns for claim type classification ──────────────────────────

const FINANCIAL_METRIC_PATTERNS = [
  /\$[\d,.]+[MBK]?\b/i,
  /\b(ARR|MRR|EBITDA|revenue|margin|NRR|LTV|CAC|churn|CAGR|growth|valuation|multiple)\b/i,
  /\b\d+%\b/,
  /\b(FY|Q[1-4])\d{4}\b/i,
  /\b(gross|net|operating|profit|loss|burn|runway|cash)\b/i,
];

const FINANCIAL_MISSING_PATTERNS = [
  /\b(not disclosed|absent|not provided|not stated|not mentioned|missing|undisclosed|no data)\b/i,
  /\b(EBITDA|burn rate|runway|cash flow|working capital).*(not|absent|missing|undisclosed)/i,
];

const MARKET_SIZE_PATTERNS = [
  /\b(TAM|SAM|SOM|market size|addressable market|market opportunity)\b/i,
  /\b(billion|trillion|market|sector|industry).*(growing|CAGR|forecast|projected)\b/i,
  /\b(Gartner|IDC|Forrester|Grand View|MarketsandMarkets)\b/i,
];

const COMPETITIVE_PATTERNS = [
  /\b(competitor|competitive|market share|win\/loss|positioning|incumbent|rival)\b/i,
  /\b(vs\.|versus|compared to|against|outperform|differentiat)\b/i,
  /\b(Harvey|Ironclad|Salesforce|Microsoft|Google|AWS|Oracle|SAP)\b/i,
];

const MANAGEMENT_BIO_PATTERNS = [
  /\b(CEO|CTO|CFO|COO|founder|co-founder|president|VP|director|partner)\b/i,
  /\b(ex-|former|previously|tenure|years at|led|managed|built)\b/i,
  /\b(Palantir|Stripe|Google|Amazon|McKinsey|Goldman|JPMorgan|Sequoia)\b/i,
];

const GOVERNANCE_PATTERNS = [
  /\b(board|director|governance|audit|committee|independent|fiduciary)\b/i,
  /\b(key.?person|insurance|equity|vesting|cap table|ownership|dilution)\b/i,
  /\b(GDPR|SOC 2|ISO|compliance|regulatory|DPA|data protection)\b/i,
];

const IP_LEGAL_PATTERNS = [
  /\b(patent|trademark|copyright|IP|intellectual property|proprietary|trade secret)\b/i,
  /\b(provisional|granted|filed|pending|licensed|open.?source)\b/i,
  /\b(litigation|lawsuit|claim|infringement|indemnification)\b/i,
];

const DEAL_TERMS_PATTERNS = [
  /\b(liquidation preference|anti-dilution|pro-rata|information rights|board seat)\b/i,
  /\b(Series [A-D]|pre-money|post-money|term sheet|close|round|raise)\b/i,
  /\b(warrant|option|SAFE|convertible|note|bridge)\b/i,
];

export function classifyClaimType(claimText: string): ClaimType {
  const text = claimText.toLowerCase();

  // Governance must come before financial_missing ("not disclosed" can match both)
  if (GOVERNANCE_PATTERNS.some((p) => p.test(claimText))) return "governance";
  // Market size must come before financial_metric ($B figures appear in both)
  if (MARKET_SIZE_PATTERNS.some((p) => p.test(claimText))) return "market_size";
  // Financial missing before financial_metric
  if (FINANCIAL_MISSING_PATTERNS.some((p) => p.test(claimText))) return "financial_missing";
  if (DEAL_TERMS_PATTERNS.some((p) => p.test(claimText))) return "deal_terms";
  if (FINANCIAL_METRIC_PATTERNS.some((p) => p.test(claimText))) return "financial_metric";
  if (COMPETITIVE_PATTERNS.some((p) => p.test(claimText))) return "competitive";
  if (MANAGEMENT_BIO_PATTERNS.some((p) => p.test(claimText))) return "management_bio";
  if (IP_LEGAL_PATTERNS.some((p) => p.test(claimText))) return "ip_legal";

  // Recommendation signals
  if (/\b(recommend|proceed|caution|decline|pass|invest|diligence)\b/i.test(text)) return "recommendation";

  return "operational";
}

// ─── External Sources for Verified Claims ───────────────────────────────────

function extractSearchTerms(claimText: string): string {
  // Extract key financial/company terms for search URL construction.
  // Strip special chars, collapse whitespace, take first 5 meaningful words,
  // and fall back to a safe generic term so the URL is never blank.
  const cleaned = claimText
    .replace(/[^\w\s$%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 2).slice(0, 5).join(" ");
  return encodeURIComponent(words || "investment committee memo");
}

export function getExternalSources(claimType: ClaimType, claimText: string): ExternalSource[] {
  const q = extractSearchTerms(claimText);

  switch (claimType) {
    case "financial_metric":
      return [
        {
          label: "SaaS Capital Index",
          description: "Cross-reference against median ARR growth, NRR, and gross margin benchmarks for SaaS companies at comparable ARR scale",
          url: "https://www.saas-capital.com/research/",
          sourceType: "benchmark",
        },
        {
          label: "KeyBanc SaaS Survey",
          description: "Annual private SaaS company benchmarks — NRR, CAC payback, gross margin, and growth rate by ARR cohort",
          url: "https://www.key.com/kbcm/insights/saas-survey.jsp",
          sourceType: "benchmark",
        },
        {
          label: "Bessemer Cloud Index",
          description: "Public cloud company metrics for valuation multiple benchmarking (ARR multiples, Rule of 40)",
          url: "https://cloudindex.bvp.com/",
          sourceType: "benchmark",
        },
        {
          label: "SEC EDGAR Full-Text Search",
          description: "Search public company filings for comparable financial disclosures",
          url: `https://www.sec.gov/edgar/search/?q=${q}`,
          sourceType: "regulatory",
          inlineSource: "sec_edgar",
          searchQuery: decodeURIComponent(q),
        },
      ];

    case "financial_missing":
      return [
        {
          label: "SaaS Capital Burn Multiple Index",
          description: "Benchmark for acceptable burn multiples at Series B stage — median 1.4x for companies with 80%+ NRR",
          url: "https://www.saas-capital.com/research/",
          sourceType: "benchmark",
        },
        {
          label: "Bessemer State of the Cloud",
          description: "Annual report on cloud company efficiency metrics including cash burn and runway norms",
          url: "https://www.bvp.com/atlas/state-of-the-cloud",
          sourceType: "benchmark",
        },
      ];

    case "market_size":
      return [
        {
          label: "Gartner Market Data",
          description: "Cross-reference market size and CAGR estimates against Gartner's published research",
          url: `https://www.gartner.com/en/search?q=${q}`,
          sourceType: "market_data",
        },
        {
          label: "IDC Market Research",
          description: "IDC publishes authoritative market sizing for enterprise software segments",
          url: `https://www.idc.com/search?q=${q}`,
          sourceType: "market_data",
        },
        {
          label: "Grand View Research",
          description: "Independent market sizing reports with methodology disclosure",
          url: `https://www.grandviewresearch.com/search?q=${q}`,
          sourceType: "market_data",
        },
      ];

    case "competitive":
      return [
        {
          label: "Crunchbase",
          description: "Verify competitor funding rounds, valuations, and investor syndicate",
          url: `https://www.crunchbase.com/discover/organizations?q=${q}`,
          sourceType: "database",
        },
        {
          label: "CB Insights",
          description: "Competitive intelligence, market maps, and funding history for named competitors",
          url: `https://www.cbinsights.com/research-search?q=${q}`,
          sourceType: "database",
        },
        {
          label: "G2 Crowd Reviews",
          description: "User-generated competitive positioning data — win/loss signals from buyer reviews",
          url: `https://www.g2.com/search?query=${q}`,
          sourceType: "database",
        },
      ];

    case "management_bio":
      return [
        {
          label: "LinkedIn",
          description: "Verify employment history, tenure, and role claims for named executives",
          url: `https://www.linkedin.com/search/results/people/?keywords=${q}`,
          sourceType: "registry",
        },
        {
          label: "FINRA BrokerCheck",
          description: "Regulatory history check for any executives with broker-dealer registration history",
          url: "https://brokercheck.finra.org/",
          sourceType: "regulatory",
        },
        {
          label: "SEC EDGAR Insider Filings",
          description: "Search for any prior public company insider trading filings or Form 4 disclosures",
          url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${q}&CIK=&type=4&dateb=&owner=include&count=40&search_text=&action=getcompany`,
          sourceType: "regulatory",
        },
      ];

    case "governance":
      return [
        {
          label: "NVCA Model Legal Documents",
          description: "NVCA standard term sheet and certificate of incorporation — benchmark for board composition and governance rights",
          url: "https://nvca.org/model-legal-documents/",
          sourceType: "regulatory",
        },
        {
          label: "SEC EDGAR Company Search",
          description: "Search for any prior SEC filings, registration statements, or enforcement actions",
          url: `https://www.sec.gov/edgar/search/?q=${q}`,
          sourceType: "regulatory",
          inlineSource: "sec_edgar",
          searchQuery: decodeURIComponent(q),
        },
        {
          label: "Companies House (UK)",
          description: "For UK-incorporated entities: director filings, accounts, and governance history",
          url: `https://find-and-update.company-information.service.gov.uk/search?q=${q}`,
          sourceType: "registry",
        },
      ];

    case "ip_legal":
      return [
        {
          label: "USPTO Patent Full-Text Database",
          description: "Search for granted patents and published applications by assignee or inventor name",
          url: `https://ppubs.uspto.gov/pubwebapp/external.html#/search?query=${q}`,
          sourceType: "regulatory",
        },
        {
          label: "Google Patents",
          description: "Cross-reference patent filings, citation counts, and prior art landscape",
          url: `https://patents.google.com/?q=${q}&before=priority:20260101`,
          sourceType: "database",
        },
        {
          label: "WIPO PatentScope",
          description: "International PCT patent applications — relevant for companies with EU/APAC IP strategy",
          url: `https://patentscope.wipo.int/search/en/search.jsf`,
          sourceType: "regulatory",
        },
      ];

    case "deal_terms":
      return [
        {
          label: "NVCA Model Term Sheet",
          description: "NVCA standard terms — benchmark for liquidation preference, anti-dilution, and information rights",
          url: "https://nvca.org/model-legal-documents/",
          sourceType: "regulatory",
        },
        {
          label: "Fenwick VC Survey",
          description: "Quarterly survey of actual VC deal terms — liquidation preferences, pay-to-play, and valuation trends",
          url: "https://www.fenwick.com/insights/publications/venture-capital-survey",
          sourceType: "benchmark",
        },
        {
          label: "Carta State of Private Markets",
          description: "Quarterly data on private market valuations, round sizes, and dilution by stage",
          url: "https://carta.com/blog/state-of-private-markets/",
          sourceType: "benchmark",
        },
      ];

    default: // operational, recommendation
      return [
        {
          label: "SEC EDGAR Full-Text Search",
          description: "Search public company filings for comparable disclosures and precedents",
          url: `https://www.sec.gov/edgar/search/?q=${q}`,
          sourceType: "regulatory",
          inlineSource: "sec_edgar",
          searchQuery: decodeURIComponent(q),
        },
        {
          label: "PitchBook",
          description: "Private company intelligence — funding history, M&A activity, and comparable transactions",
          url: "https://pitchbook.com/",
          sourceType: "database",
        },
      ];
  }
}

// ─── Specific Next Steps for Unverified Claims ───────────────────────────────

export function getNextSteps(claimType: ClaimType, claimText: string): string[] {
  // Extract any dollar amounts, percentages, or named entities from the claim
  const dollarMatch = claimText.match(/\$[\d,.]+[MBK]?/i);
  const pctMatch = claimText.match(/\d+(?:\.\d+)?%/);
  const namedEntityMatch = claimText.match(/\b([A-Z][a-z]+ [A-Z][a-z]+|[A-Z]{2,})\b/);

  const dollarFigure = dollarMatch ? dollarMatch[0] : null;
  const pctFigure = pctMatch ? pctMatch[0] : null;
  const namedEntity = namedEntityMatch ? namedEntityMatch[0] : null;

  switch (claimType) {
    case "financial_metric":
      return [
        dollarFigure
          ? `Request audited financial statements or management accounts confirming ${dollarFigure}. Unaudited CIM figures require independent accountant sign-off before IC approval.`
          : "Request audited financial statements or management accounts. Unaudited CIM figures require independent accountant sign-off before IC approval.",
        pctFigure
          ? `Cross-reference ${pctFigure} against SaaS Capital Index benchmarks for companies at comparable ARR scale. Flag if the figure is >1.5 standard deviations from peer median.`
          : "Cross-reference stated metric against SaaS Capital Index and KeyBanc SaaS Survey benchmarks for companies at comparable ARR scale.",
        "Add to financial due diligence workstream: request trailing 12-month P&L, balance sheet, and cash flow statement with auditor sign-off.",
      ];

    case "financial_missing":
      return [
        "This is a material omission. Request the missing data directly from management before proceeding to IC. Absent burn rate and runway data is a red flag at Series B.",
        "Add to management Q&A agenda: 'Please provide FY2025 EBITDA, monthly cash burn, and current runway in months.' Require response before LOI execution.",
        "Cross-reference against SaaS Capital Burn Multiple Index — median Series B burn multiple is 1.4x. If company declines to disclose, treat as potential distress signal.",
        "Verify with lead investor (Sequoia Capital) whether they have received full financial package. Lead investor diligence files typically contain this data.",
      ];

    case "market_size":
      return [
        namedEntity
          ? `The market size figure is not directly sourced in the CIM. Request management's underlying market research report and methodology. Verify the ${namedEntity} figure against Gartner or IDC published data.`
          : "The market size figure is not directly sourced in the CIM. Request management's underlying market research report and methodology. Cross-reference against Gartner or IDC published data.",
        "Check whether the TAM figure uses bottom-up (customer count × ACV) or top-down (industry report) methodology. Bottom-up is more defensible for IC presentation.",
        "Verify CAGR assumption against at least two independent sources (Gartner, IDC, Grand View Research). Divergence >3% requires explanation.",
      ];

    case "competitive":
      return [
        "Request win/loss analysis from management: last 20 competitive deals, win rate by competitor, and primary loss reason. This data should exist in CRM.",
        namedEntity
          ? `Verify ${namedEntity}'s current funding status and product roadmap on Crunchbase and CB Insights. CIM competitive claims may be stale if competitor has raised since CIM was prepared.`
          : "Verify all named competitors' current funding status and product roadmap on Crunchbase and CB Insights. CIM competitive claims may be stale.",
        "Request 3 customer references who evaluated competing products. Ask specifically: 'What made you choose this company over [competitor]?'",
        "Commission independent competitive analysis via G2 Crowd review data or Gartner Peer Insights to validate positioning claims.",
      ];

    case "management_bio":
      return [
        namedEntity
          ? `Verify ${namedEntity}'s employment history and tenure via LinkedIn. Cross-reference with reference checks from prior employers. Discrepancies in tenure or title are a red flag.`
          : "Verify all executive employment histories via LinkedIn and reference checks from prior employers. Discrepancies in tenure or title are a red flag.",
        "Run FINRA BrokerCheck on all executives with any prior financial services background. Any regulatory history requires legal review.",
        "Request signed biographies and employment verification from management. Add to legal due diligence workstream.",
        "Conduct background checks via a third-party provider (Kroll, Mintz Group) for CEO and CFO at minimum. Standard practice for Series B and above.",
      ];

    case "governance":
      return [
        "Request current cap table (fully diluted) and board composition schedule. Verify independent director count against NVCA Model Certificate of Incorporation standards.",
        "Obtain copies of all board minutes from the past 24 months. Review for any undisclosed material events, related-party transactions, or governance disputes.",
        "Verify key-person insurance status with company's insurance broker. If absent, require as a condition of close with minimum coverage of 5x annual compensation.",
        "Request GDPR/data protection compliance documentation: Article 28 DPA template, data processing register, and DPO appointment (if applicable).",
      ];

    case "ip_legal":
      return [
        "Search USPTO Patent Full-Text Database for all provisional and granted patents by company name and inventor. Verify filing dates and assignee ownership.",
        "Request IP assignment agreements for all founders and key engineers. Confirm all IP developed prior to incorporation has been properly assigned to the company.",
        "Obtain legal opinion on OpenAI API dependency: review OpenAI Terms of Service Section 3 (usage policies) for any restrictions on commercial fine-tuning and resale.",
        "Commission freedom-to-operate (FTO) analysis for core clause extraction methodology before close. Cost: ~$15,000–$25,000. Required for RWI underwriter.",
      ];

    case "deal_terms":
      return [
        "Request full term sheet and draft investment agreement. Verify that pro-rata rights, information rights, and board seat terms are consistent with NVCA standard.",
        "Confirm liquidation preference stack with legal counsel. Verify no hidden preferences from prior rounds that would affect Series B economics.",
        "Request Sequoia Capital's diligence summary and investment committee memo if available. Lead investor's IC approval is a positive signal.",
        "Verify anti-dilution provisions: broad-based weighted average is standard; full ratchet is a red flag. Confirm with company counsel.",
      ];

    case "recommendation":
      return [
        "Passages that read as IC posture or decision language are model synthesis, not independent source facts — treat per firm supervisory policy.",
        "Cross-check any stated posture against underlying verified claims; divergence may indicate unsupported summary language.",
        "FINRA Rule 3110(b)(2) and related supervisory rules address principal review of investment communications — follow your firm’s process for sign-off before distribution.",
      ];

    default: // operational
      return [
        "This claim could not be verified against the source document. Request supporting documentation from management.",
        "Add to due diligence request list: ask management to provide the source document or data room file that supports this claim.",
        "If this claim is material to the investment thesis, treat as unresolved until independently verified.",
      ];
  }
}

// ─── Financial Benchmark Context ─────────────────────────────────────────────

export interface FinancialBenchmark {
  metric: string;
  claimValue: string;
  benchmarkMedian: string;
  benchmarkSource: string;
  assessment: "strong" | "in_range" | "below_median" | "outlier" | "missing";
  assessmentNote: string;
}

export function getFinancialBenchmarkContext(claimText: string): FinancialBenchmark | null {
  // NRR / Net Revenue Retention
  const nrrMatch = claimText.match(/NRR[:\s]+(\d+)%|Net Revenue Retention[:\s]+(\d+)%/i);
  if (nrrMatch) {
    const val = parseInt(nrrMatch[1] || nrrMatch[2]);
    return {
      metric: "Net Revenue Retention (NRR)",
      claimValue: `${val}%`,
      benchmarkMedian: "108% (Series B SaaS median, SaaS Capital 2025)",
      benchmarkSource: "SaaS Capital Index 2025",
      assessment: val >= 120 ? "strong" : val >= 105 ? "in_range" : "below_median",
      assessmentNote:
        val >= 120
          ? `${val}% NRR is top-quartile (>120%). Strong indicator of product-market fit and expansion revenue.`
          : val >= 105
          ? `${val}% NRR is above median but below top-quartile threshold of 120%. Acceptable for Series B.`
          : `${val}% NRR is below the Series B median of 108%. Investigate churn drivers before proceeding.`,
    };
  }

  // Gross Margin
  const gmMatch = claimText.match(/[Gg]ross margin[:\s]+(\d+)%/);
  if (gmMatch) {
    const val = parseInt(gmMatch[1]);
    return {
      metric: "Gross Margin",
      claimValue: `${val}%`,
      benchmarkMedian: "74% (SaaS median, KeyBanc 2025)",
      benchmarkSource: "KeyBanc SaaS Survey 2025",
      assessment: val >= 75 ? "strong" : val >= 65 ? "in_range" : "below_median",
      assessmentNote:
        val >= 75
          ? `${val}% gross margin is above the SaaS median of 74%. Consistent with infrastructure-efficient SaaS.`
          : val >= 65
          ? `${val}% gross margin is slightly below median. Acceptable if improving YoY (infrastructure optimisation).`
          : `${val}% gross margin is materially below SaaS median. Investigate COGS structure — may indicate services-heavy revenue mix.`,
    };
  }

  // ARR Growth
  const arrGrowthMatch = claimText.match(/(?:YoY Growth|CAGR)[:\s|]+(\d+(?:\.\d+)?)%/i);
  if (arrGrowthMatch) {
    const val = parseFloat(arrGrowthMatch[1]);
    return {
      metric: "ARR Growth Rate",
      claimValue: `${val}%`,
      benchmarkMedian: "35% (Series B SaaS median, Bessemer 2025)",
      benchmarkSource: "Bessemer State of the Cloud 2025",
      assessment: val >= 80 ? "strong" : val >= 35 ? "in_range" : "below_median",
      assessmentNote:
        val >= 80
          ? `${val}% ARR growth is exceptional — top decile for Series B SaaS. Verify that growth is organic and not driven by one-time contracts.`
          : val >= 35
          ? `${val}% ARR growth is above the Series B median of 35%. Consistent with a healthy growth trajectory.`
          : `${val}% ARR growth is below the Series B median of 35%. Investigate whether growth is decelerating and why.`,
    };
  }

  // LTV:CAC
  const ltvcacMatch = claimText.match(/LTV[:\s]*CAC[^\d]*(\d+)x/i);
  if (ltvcacMatch) {
    const val = parseInt(ltvcacMatch[1]);
    return {
      metric: "LTV:CAC Ratio",
      claimValue: `${val}x`,
      benchmarkMedian: "3x (minimum viable), 5x+ (healthy SaaS)",
      benchmarkSource: "SaaS Capital / Bessemer benchmarks",
      assessment: val >= 10 ? "strong" : val >= 5 ? "in_range" : val >= 3 ? "below_median" : "outlier",
      assessmentNote:
        val >= 10
          ? `${val}x LTV:CAC is exceptional. Verify CAC calculation includes fully-loaded S&M costs. Outlier ratios sometimes reflect understated CAC.`
          : val >= 5
          ? `${val}x LTV:CAC is healthy. Consistent with efficient go-to-market at Series B.`
          : `${val}x LTV:CAC is below the 5x healthy threshold. Investigate whether CAC payback period is acceptable (<18 months for Series B).`,
    };
  }

  // Churn
  const churnMatch = claimText.match(/(?:annual )?churn[:\s]+(\d+(?:\.\d+)?)%/i);
  if (churnMatch) {
    const val = parseFloat(churnMatch[1]);
    return {
      metric: "Annual Churn Rate",
      claimValue: `${val}%`,
      benchmarkMedian: "6% (Series B SaaS median, SaaS Capital 2025)",
      benchmarkSource: "SaaS Capital Index 2025",
      assessment: val <= 3 ? "strong" : val <= 7 ? "in_range" : "below_median",
      assessmentNote:
        val <= 3
          ? `${val}% annual churn is top-quartile (<3%). Verify that this is logo churn, not dollar churn.`
          : val <= 7
          ? `${val}% annual churn is within acceptable range for Series B SaaS (median ~6%).`
          : `${val}% annual churn is above the Series B median of 6%. Investigate cohort analysis and customer concentration.`,
    };
  }

  return null;
}

// ─── Master enrichment function ──────────────────────────────────────────────

export function enrichClaim(claimText: string, verified: boolean): ClaimEnrichment {
  const claimType = classifyClaimType(claimText);
  const externalSources = getExternalSources(claimType, claimText);
  const nextSteps = verified ? [] : getNextSteps(claimType, claimText);
  const benchmarkContext =
    (claimType === "financial_metric" || claimType === "financial_missing")
      ? getFinancialBenchmarkContext(claimText)?.assessmentNote
      : undefined;

  return { claimType, externalSources, nextSteps, benchmarkContext };
}
