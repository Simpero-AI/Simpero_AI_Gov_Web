/**
 * Conference Mode Cache
 * Pre-loaded IC memo result for offline stage presentations.
 * Activated by Option + click on "Analyse Document" button.
 * Zero network requests — full interactivity from this static JSON.
 *
 * Demo document: "NovaSpark AI — Series B CIM (Sanitised)"
 * A fictional AI-enabled SaaS company for demo purposes.
 */

import type { ICMemoResult } from "@shared/simperoTypes";

export const CONFERENCE_CACHE: ICMemoResult = {
  sessionId: "DEMO-NOVASPARK-2026",
  fileName: "NovaSpark_AI_CIM_Sanitised.pdf",
  pageCount: 47,
  processedAt: "2026-03-17T14:30:00.000Z",
  governance_flags: [
    {
      category: "Key-Person Risk",
      severity: "H",
      regulation: "FINRA 3110(b)(2) — Material Risk Disclosure",
      description: "Key-person concentration identified: the business is co-founded by CEO Sarah Chen and CTO Marcus Webb, who together hold 34% equity. The CIM explicitly states no key-person insurance is currently in place. This represents a material risk under FINRA 3110(b)(2) disclosure standards.",
    },
    {
      category: "Missing Audited Financials",
      severity: "H",
      regulation: "SEC Rule 10b-5 — Material Omission; FINRA 3110(b)(2)",
      description: "No reference to audited financial statements found in the CIM. 3 of 6 financial claims are unverified. Absence of audited financials is a material omission under SEC Rule 10b-5 and should be flagged for principal review under FINRA 3110(b)(2).",
    },
    {
      category: "Customer Concentration Risk",
      severity: "M",
      regulation: "FINRA 3110(b)(2) — Material Risk Disclosure",
      description: "Significant customer concentration detected: top 3 customers represent 31% of ARR. Revenue dependency on a small number of customers represents a material risk under FINRA 3110(b)(2) disclosure standards. Loss of a top customer could materially impact ARR and valuation.",
    },
    {
      category: "Data Privacy & GDPR Compliance",
      severity: "M",
      regulation: "GDPR Article 5 / UK GDPR; CCPA (California Consumer Privacy Act)",
      description: "The CIM references GDPR Article 28 compliance requirements for EU customers but does not confirm that Data Processing Agreements (DPAs) are in place with all EU customers. GDPR compliance status should be verified as part of legal due diligence.",
    },
    {
      category: "Intellectual Property Risk",
      severity: "M",
      regulation: "35 U.S.C. § 101 (Patent Act); FINRA 3110(b)(2) — Material Asset Disclosure",
      description: "NovaSpark holds 3 provisional patents filed in Q3 2024. Provisional patents expire after 12 months if not converted to non-provisional applications. Confirmation that non-provisional applications have been filed should be obtained from IP counsel before closing.",
    },
    {
      category: "Missing Forward-Looking Disclosures",
      severity: "L",
      regulation: "SEC Safe Harbor for Forward-Looking Statements (15 U.S.C. § 78u-5)",
      description: "The CIM includes forward-looking financial projections (FY2026 ARR target) but does not include a safe harbour disclaimer. Under SEC 15 U.S.C. § 78u-5, forward-looking statements should be accompanied by meaningful cautionary language.",
    },
  ],
  scorecard: {
    finra3110Status: "NON_COMPLIANT",
    claimsExtracted: 31,
    claimsMatched: 0,
    claimsFlagged: 31,
    claimsVerified: 0,
    verificationRate: 0,
    matchRate: 0,
  },
  ofac_screening: {
    entitiesScreened: 8,
    possibleMatches: 0,
    confirmedMatches: 0,
    screeningAvailable: true,
    screenedAt: "2026-03-17T14:30:05.000Z",
    results: [
      { entity: "NovaSpark AI", entityType: "organization", status: "CLEAR", screened_at: "2026-03-17T14:30:05.000Z" },
      { entity: "NovaSpark Technologies Inc", entityType: "organization", status: "CLEAR", screened_at: "2026-03-17T14:30:05.000Z" },
      { entity: "Sarah Chen", entityType: "individual", status: "CLEAR", screened_at: "2026-03-17T14:30:05.000Z" },
      { entity: "Marcus Webb", entityType: "individual", status: "CLEAR", screened_at: "2026-03-17T14:30:05.000Z" },
      { entity: "Apex Ventures", entityType: "organization", status: "CLEAR", screened_at: "2026-03-17T14:30:05.000Z" },
      { entity: "Meridian Capital Partners", entityType: "organization", status: "CLEAR", screened_at: "2026-03-17T14:30:05.000Z" },
      { entity: "Ironclad Inc", entityType: "organization", status: "CLEAR", screened_at: "2026-03-17T14:30:05.000Z" },
      { entity: "Harvey AI", entityType: "organization", status: "CLEAR", screened_at: "2026-03-17T14:30:05.000Z" },
    ],
  },
  chunks: [
    { page: 3, section: "EXECUTIVE OVERVIEW", text: "NovaSpark AI is a Series B enterprise SaaS company providing AI-powered contract intelligence to mid-market legal and compliance teams. Founded in 2021, the company has grown ARR from $2.1M to $18.4M over 24 months, representing an 87% CAGR." },
    { page: 5, section: "FINANCIAL PERFORMANCE", text: "FY2025 revenue was $18.4M, up from $9.8M in FY2024. Gross margin improved from 71% to 78% driven by infrastructure optimisation. Net Revenue Retention stands at 127%, with average contract value of $84,000 per annum." },
    { page: 7, section: "MARKET OPPORTUNITY", text: "The global contract lifecycle management market is estimated at $2.9B in 2025, growing at 14.2% CAGR through 2030. NovaSpark targets the 45,000 mid-market legal and compliance teams in North America and Western Europe." },
    { page: 9, section: "MANAGEMENT TEAM", text: "CEO Sarah Chen (ex-Palantir, 8 years) and CTO Marcus Webb (ex-Stripe engineering, led 40-person team) co-founded the company. The leadership team holds 34% equity post-Series A. No key-person insurance currently in place." },
    { page: 12, section: "DEAL TERMS", text: "The company is seeking $45M Series B at a pre-money valuation of $180M (9.8x ARR). Lead investor Sequoia Capital has committed $25M. The round includes a 1x non-participating liquidation preference and standard anti-dilution provisions." },
    { page: 15, section: "RISK FACTORS", text: "Primary competitive risk from Harvey AI ($100M Series B, 2024) and Ironclad ($100M Series C). Customer concentration: top 3 customers represent 31% of ARR. Data processing agreement with EU customers requires GDPR Article 28 compliance review." },
    { page: 18, section: "INTELLECTUAL PROPERTY", text: "NovaSpark holds 3 provisional patents on its clause extraction methodology filed in Q3 2024. Core NLP model is built on fine-tuned GPT-4 architecture. Training data sourced from publicly available court filings and licensed contract databases." },
    { page: 22, section: "CUSTOMER METRICS", text: "142 enterprise customers as of Q4 2025. Churn rate of 4.2% annually. Average sales cycle of 67 days. Customer acquisition cost of $12,400 with LTV of $310,000, yielding an LTV:CAC ratio of 25x." },
  ],
  sections: [
    {
      title: "1. Executive Summary",
      sectionKey: "executive_summary",
      claims: [
        {
          id: "es-001",
          text: "NovaSpark AI is a Series B enterprise SaaS company providing AI-powered contract intelligence to mid-market legal and compliance teams, seeking $45M at a $180M pre-money valuation.",
          citation: { page: 3, section: "EXECUTIVE OVERVIEW", quote: "NovaSpark AI is a Series B enterprise SaaS company providing AI-powered contract intelligence to mid-market legal and compliance teams.", verified: false },
        },
        {
          id: "es-002",
          text: "The company has demonstrated exceptional growth with ARR expanding from $2.1M to $18.4M over 24 months, representing an 87% CAGR.",
          citation: { page: 3, section: "EXECUTIVE OVERVIEW", quote: "the company has grown ARR from $2.1M to $18.4M over 24 months, representing an 87% CAGR.", verified: false },
        },
        {
          id: "es-003",
          text: "Recommendation: PROCEED with due diligence. Strong unit economics and NRR of 127% indicate product-market fit. Key risks are customer concentration and competitive pressure from well-funded incumbents.",
          citation: { page: null, section: null, quote: null, verified: false },
        },
      ],
    },
    {
      title: "2. Business Overview",
      sectionKey: "business_overview",
      claims: [
        {
          id: "bo-001",
          text: "NovaSpark AI was founded in 2021 and provides AI-powered contract intelligence software to mid-market legal and compliance teams in North America and Western Europe.",
          citation: { page: 3, section: "EXECUTIVE OVERVIEW", quote: "NovaSpark AI is a Series B enterprise SaaS company providing AI-powered contract intelligence to mid-market legal and compliance teams. Founded in 2021", verified: false },
        },
        {
          id: "bo-002",
          text: "The company's core product automates contract review, clause extraction, and compliance flagging using a fine-tuned GPT-4 architecture trained on court filings and licensed contract databases.",
          citation: { page: 18, section: "INTELLECTUAL PROPERTY", quote: "Core NLP model is built on fine-tuned GPT-4 architecture. Training data sourced from publicly available court filings and licensed contract databases.", verified: false },
        },
        {
          id: "bo-003",
          text: "NovaSpark targets approximately 45,000 mid-market legal and compliance teams across its primary geographies.",
          citation: { page: 7, section: "MARKET OPPORTUNITY", quote: "NovaSpark targets the 45,000 mid-market legal and compliance teams in North America and Western Europe.", verified: false },
        },
      ],
    },
    {
      title: "3. Financial Snapshot",
      sectionKey: "financial_snapshot",
      claims: [
        {
          id: "fs-001",
          text: "FY2025 ARR: $18.4M | FY2024 ARR: $9.8M | YoY Growth: 87.8%",
          citation: { page: 5, section: "FINANCIAL PERFORMANCE", quote: "FY2025 revenue was $18.4M, up from $9.8M in FY2024.", verified: false },
        },
        {
          id: "fs-002",
          text: "Gross margin: 78% (FY2025), improved from 71% (FY2024) driven by infrastructure optimisation.",
          citation: { page: 5, section: "FINANCIAL PERFORMANCE", quote: "Gross margin improved from 71% to 78% driven by infrastructure optimisation.", verified: false },
        },
        {
          id: "fs-003",
          text: "Net Revenue Retention: 127% | Average Contract Value: $84,000 per annum",
          citation: { page: 5, section: "FINANCIAL PERFORMANCE", quote: "Net Revenue Retention stands at 127%, with average contract value of $84,000 per annum.", verified: false },
        },
        {
          id: "fs-004",
          text: "LTV:CAC ratio: 25x | CAC: $12,400 | LTV: $310,000 | Annual churn: 4.2%",
          citation: { page: 22, section: "CUSTOMER METRICS", quote: "Customer acquisition cost of $12,400 with LTV of $310,000, yielding an LTV:CAC ratio of 25x.", verified: false },
        },
        {
          id: "fs-005",
          text: "EBITDA margin and cash burn rate not disclosed in the CIM. Runway information absent.",
          citation: { page: null, section: null, quote: null, verified: false },
        },
      ],
    },
    {
      title: "4. Market & Commercial",
      sectionKey: "market_commercial",
      claims: [
        {
          id: "mc-001",
          text: "Total addressable market: $2.9B (2025), growing at 14.2% CAGR through 2030 in the global contract lifecycle management sector.",
          citation: { page: 7, section: "MARKET OPPORTUNITY", quote: "The global contract lifecycle management market is estimated at $2.9B in 2025, growing at 14.2% CAGR through 2030.", verified: false },
        },
        {
          id: "mc-002",
          text: "142 enterprise customers as of Q4 2025. Average sales cycle of 67 days.",
          citation: { page: 22, section: "CUSTOMER METRICS", quote: "142 enterprise customers as of Q4 2025. Churn rate of 4.2% annually. Average sales cycle of 67 days.", verified: false },
        },
        {
          id: "mc-003",
          text: "Customer concentration risk: top 3 customers represent 31% of ARR, creating meaningful revenue dependency.",
          citation: { page: 15, section: "RISK FACTORS", quote: "Customer concentration: top 3 customers represent 31% of ARR.", verified: false },
        },
        {
          id: "mc-004",
          text: "Competitive positioning relative to Harvey AI and Ironclad not quantified in the CIM. No win/loss data provided.",
          citation: { page: null, section: null, quote: null, verified: false },
        },
      ],
    },
    {
      title: "5. Management & Governance",
      sectionKey: "management_governance",
      claims: [
        {
          id: "mg-001",
          text: "CEO Sarah Chen (ex-Palantir, 8 years tenure) and CTO Marcus Webb (ex-Stripe, led 40-person engineering team) are co-founders.",
          citation: { page: 9, section: "MANAGEMENT TEAM", quote: "CEO Sarah Chen (ex-Palantir, 8 years) and CTO Marcus Webb (ex-Stripe engineering, led 40-person team) co-founded the company.", verified: false },
        },
        {
          id: "mg-002",
          text: "Founder equity: leadership team holds 34% post-Series A. No key-person insurance currently in place — a material governance gap.",
          citation: { page: 9, section: "MANAGEMENT TEAM", quote: "The leadership team holds 34% equity post-Series A. No key-person insurance currently in place.", verified: false },
        },
        {
          id: "mg-003",
          text: "Board composition, independent director count, and audit committee structure not disclosed in the CIM.",
          citation: { page: null, section: null, quote: null, verified: false },
        },
      ],
    },
    {
      title: "6. Risk Register",
      sectionKey: "risk_register",
      claims: [
        {
          id: "rr-001",
          text: "[HIGH] Competitive risk: Harvey AI ($100M Series B) and Ironclad ($100M Series C) are well-capitalised direct competitors. Mitigant: NovaSpark's mid-market focus and 127% NRR suggest differentiated positioning.",
          citation: { page: 15, section: "RISK FACTORS", quote: "Primary competitive risk from Harvey AI ($100M Series B, 2024) and Ironclad ($100M Series C).", verified: false },
        },
        {
          id: "rr-002",
          text: "[HIGH] Customer concentration: top 3 customers = 31% of ARR. Loss of any single top customer would materially impact revenue. Mitigant: 127% NRR suggests strong retention.",
          citation: { page: 15, section: "RISK FACTORS", quote: "Customer concentration: top 3 customers represent 31% of ARR.", verified: false },
        },
        {
          id: "rr-003",
          text: "[MEDIUM] IP risk: 3 provisional patents only (not granted). Core model built on GPT-4 — dependency on OpenAI's API terms and pricing. Mitigant: fine-tuning layer creates switching costs.",
          citation: { page: 18, section: "INTELLECTUAL PROPERTY", quote: "NovaSpark holds 3 provisional patents on its clause extraction methodology filed in Q3 2024. Core NLP model is built on fine-tuned GPT-4 architecture.", verified: false },
        },
        {
          id: "rr-004",
          text: "[MEDIUM] GDPR compliance: EU customer data processing requires Article 28 DPA review. Status of current DPAs not disclosed. Mitigant: standard SaaS data processing agreements likely in place.",
          citation: { page: 15, section: "RISK FACTORS", quote: "Data processing agreement with EU customers requires GDPR Article 28 compliance review.", verified: false },
        },
        {
          id: "rr-005",
          text: "[LOW] Key-person risk: no key-person insurance in place for CEO or CTO. Standard for Series B but should be remediated pre-close.",
          citation: { page: 9, section: "MANAGEMENT TEAM", quote: "No key-person insurance currently in place.", verified: false },
        },
      ],
    },
    {
      title: "7. Deal Terms",
      sectionKey: "deal_terms",
      claims: [
        {
          id: "dt-001",
          text: "Raise: $45M Series B | Pre-money valuation: $180M (9.8x ARR multiple) | Lead investor: Sequoia Capital ($25M committed)",
          citation: { page: 12, section: "DEAL TERMS", quote: "The company is seeking $45M Series B at a pre-money valuation of $180M (9.8x ARR). Lead investor Sequoia Capital has committed $25M.", verified: false },
        },
        {
          id: "dt-002",
          text: "Liquidation preference: 1x non-participating. Anti-dilution: standard provisions included.",
          citation: { page: 12, section: "DEAL TERMS", quote: "The round includes a 1x non-participating liquidation preference and standard anti-dilution provisions.", verified: false },
        },
        {
          id: "dt-003",
          text: "Pro-rata rights, information rights, and board seat terms not specified in the CIM. Require clarification in term sheet.",
          citation: { page: null, section: null, quote: null, verified: false },
        },
      ],
    },
    {
      title: "8. Red Flags",
      sectionKey: "red_flags",
      claims: [
        {
          id: "rf-001",
          text: "EBITDA, cash burn, and runway data absent from CIM — cannot assess capital efficiency or time-to-profitability without supplemental financials.",
          citation: { page: null, section: null, quote: null, verified: false },
        },
        {
          id: "rf-002",
          text: "No key-person insurance for CEO or CTO — material governance gap at Series B stage. Should be remediated as a condition of close.",
          citation: { page: 9, section: "MANAGEMENT TEAM", quote: "No key-person insurance currently in place.", verified: false },
        },
        {
          id: "rf-003",
          text: "Board composition and independent director structure not disclosed — governance transparency below expected standard for a $180M valuation.",
          citation: { page: null, section: null, quote: null, verified: false },
        },
        {
          id: "rf-004",
          text: "IP position is provisional only — 3 patents filed but not granted. Core model dependency on OpenAI creates platform risk that is not addressed in the CIM.",
          citation: { page: 18, section: "INTELLECTUAL PROPERTY", quote: "NovaSpark holds 3 provisional patents on its clause extraction methodology filed in Q3 2024.", verified: false },
        },
        {
          id: "rf-005",
          text: "GDPR Article 28 DPA compliance status unconfirmed — EU revenue at risk if current agreements are non-compliant.",
          citation: { page: 15, section: "RISK FACTORS", quote: "Data processing agreement with EU customers requires GDPR Article 28 compliance review.", verified: false },
        },
      ],
    },
  ],

  scoringResult: {
    aiScore: 77,
    mandateFitPct: 82,
    dealBreakerTriggered: false,
    scoredAt: "2026-03-17T15:00:00.000Z",
    frameworkSnapshot: { frameworkId: "growth-equity-series-b-v1", version: "1.0" },
    categoryScores: [
      {
        categoryId: "revenue-growth",
        categoryName: "Revenue & Growth Quality",
        categoryWeight: 25,
        score: 84,
        criterionScores: [
          {
            criterionId: "arr-scale",
            criterionName: "ARR Scale & Growth Rate",
            score: 90,
            rationale: "ARR of $18.4M with 87% CAGR over 24 months is top-quartile for Series B enterprise SaaS. Sustained compounding above 70% CAGR threshold.",
            sourceQuote: "grown ARR from $2.1M to $18.4M over 24 months, representing an 87% CAGR",
          },
          {
            criterionId: "nrr",
            criterionName: "Net Revenue Retention",
            score: 88,
            rationale: "127% NRR indicates strong expansion revenue and low churn — customers are growing within the platform. Exceeds 120% benchmark for enterprise SaaS.",
            sourceQuote: "127% NRR",
          },
          {
            criterionId: "revenue-quality",
            criterionName: "Revenue Predictability & Mix",
            score: 75,
            rationale: "Subscription-led SaaS model with enterprise contracts is high quality. Customer concentration (top 3 = 31% ARR) is a mild concern at this stage.",
            sourceQuote: "top 3 customers represent 31% of ARR",
          },
        ],
      },
      {
        categoryId: "market-opportunity",
        categoryName: "Market Opportunity",
        categoryWeight: 20,
        score: 80,
        criterionScores: [
          {
            criterionId: "tam-size",
            criterionName: "Total Addressable Market",
            score: 82,
            rationale: "CLM market estimated at $2.9B in 2025 growing at 14.2% CAGR. Sufficient headroom for a $1B+ outcome from current $18.4M ARR base.",
            sourceQuote: "global contract lifecycle management market is estimated at $2.9B in 2025, growing at 14.2% CAGR through 2030",
          },
          {
            criterionId: "market-timing",
            criterionName: "Market Timing & Tailwinds",
            score: 85,
            rationale: "Strong regulatory tailwinds (GDPR, AI Act) are driving enterprise demand for automated contract compliance tooling. Timing is favourable.",
          },
          {
            criterionId: "icp-clarity",
            criterionName: "ICP Definition & Go-to-Market Focus",
            score: 73,
            rationale: "Mid-market legal and compliance teams is a well-defined ICP. However, geographic expansion beyond North America and Western Europe is not articulated.",
            sourceQuote: "NovaSpark targets the 45,000 mid-market legal and compliance teams in North America and Western Europe",
          },
        ],
      },
      {
        categoryId: "team-execution",
        categoryName: "Team & Execution Track Record",
        categoryWeight: 20,
        score: 75,
        criterionScores: [
          {
            criterionId: "founder-quality",
            criterionName: "Founder Pedigree & Domain Expertise",
            score: 80,
            rationale: "CEO Sarah Chen and CTO Marcus Webb bring complementary legal-tech and engineering backgrounds. Prior startup experience is a positive signal.",
          },
          {
            criterionId: "key-person-risk",
            criterionName: "Key-Person Risk Mitigation",
            score: 45,
            rationale: "Co-founders hold 34% equity combined with no key-person insurance in place. This is a material governance gap that should be resolved pre-close.",
            sourceQuote: "No key-person insurance currently in place",
          },
          {
            criterionId: "hiring-velocity",
            criterionName: "Team Scaling & Hiring",
            score: 78,
            rationale: "Growth from founding to current headcount indicates effective execution. Organisational design for next stage of scale not yet disclosed.",
          },
        ],
      },
      {
        categoryId: "competitive-moat",
        categoryName: "Competitive Position & Moat",
        categoryWeight: 15,
        score: 68,
        criterionScores: [
          {
            criterionId: "differentiation",
            criterionName: "Product Differentiation",
            score: 72,
            rationale: "AI-powered clause extraction with mid-market focus differentiates from enterprise-first competitors. However, core model dependency on fine-tuned GPT-4 creates replication risk.",
            sourceQuote: "Core NLP model is built on fine-tuned GPT-4 architecture",
          },
          {
            criterionId: "ip-strength",
            criterionName: "IP & Proprietary Data",
            score: 55,
            rationale: "Three provisional patents only — not yet granted. Provisional status creates uncertainty. Training data sourced from public filings provides some defensibility.",
            sourceQuote: "NovaSpark holds 3 provisional patents on its clause extraction methodology filed in Q3 2024",
          },
          {
            criterionId: "competitive-landscape",
            criterionName: "Competitive Intensity",
            score: 65,
            rationale: "Harvey AI ($100M Series B) and Ironclad ($100M Series C) are well-capitalised direct competitors. Mid-market focus provides some protection but margin pressure is a risk.",
          },
        ],
      },
      {
        categoryId: "financial-health",
        categoryName: "Financial Health & Transparency",
        categoryWeight: 10,
        score: 52,
        criterionScores: [
          {
            criterionId: "audited-financials",
            criterionName: "Audited Financial Statements",
            score: 20,
            rationale: "No reference to audited financial statements in the CIM. This is a material omission for a $180M valuation raise and must be remediated.",
          },
          {
            criterionId: "burn-runway",
            criterionName: "Cash Burn & Runway Visibility",
            score: 40,
            rationale: "EBITDA, cash burn, and runway data absent from CIM. Cannot assess capital efficiency or time-to-profitability from available disclosure.",
          },
          {
            criterionId: "unit-economics",
            criterionName: "Unit Economics Quality",
            score: 82,
            rationale: "LTV/CAC of 4.2× and CAC payback of 14 months are strong for enterprise mid-market. Suggests efficient go-to-market motion.",
            sourceQuote: "LTV/CAC of 4.2×",
          },
        ],
      },
      {
        categoryId: "deal-terms",
        categoryName: "Deal Terms & Governance",
        categoryWeight: 10,
        score: 82,
        criterionScores: [
          {
            criterionId: "valuation",
            criterionName: "Valuation Reasonableness",
            score: 80,
            rationale: "$180M pre-money at 9.8× ARR is at the upper end of Series B comparables (median ~7–10× ARR in 2026 market). Defensible given 87% CAGR and 127% NRR.",
          },
          {
            criterionId: "governance-rights",
            criterionName: "Investor Governance Rights",
            score: 85,
            rationale: "Board representation, pro-rata rights, and liquidation preference are standard and appropriately protective. Anti-dilution terms are standard broad-based weighted average.",
          },
          {
            criterionId: "structure",
            criterionName: "Investment Structure",
            score: 80,
            rationale: "Preferred equity structure with standard Series B terms. No unusual carve-outs or side arrangements noted in available CIM disclosure.",
          },
        ],
      },
    ],
    mandateDimensions: [
      { dimension: "ARR > $10M at entry", fits: true, rationale: "ARR of $18.4M meets the minimum ARR threshold for fund mandate." },
      { dimension: "Net Revenue Retention > 110%", fits: true, rationale: "127% NRR significantly exceeds the 110% minimum threshold." },
      { dimension: "Addressable Market > $1B", fits: true, rationale: "CLM market of $2.9B in 2025 meets the market size criterion." },
      { dimension: "Audited Financial Statements", fits: false, rationale: "No audited financials provided in the CIM — must be obtained before final IC approval." },
      { dimension: "No Active Litigation", fits: true, rationale: "No pending litigation or material legal disputes disclosed in the CIM." },
    ],
    warnings: ["EBITDA and cash burn data absent — financial health score based on partial disclosure only."],
  },
};
