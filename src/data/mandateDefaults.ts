export interface FrameworkCriterion {
  id: string;
  name: string;
  benchmark?: string;  // scoring benchmark text, e.g. "ARR ≥ $10M with ≥ 25% YoY growth"
  subWeight?: number;  // % weight within the category, 0–100
}

export interface FrameworkCategory {
  id: string;
  name: string;
  weight: number;
  criteria: FrameworkCriterion[];
}

/** Shape returned by GET /investment-profile — used as prop type in mandate blocks. */
export interface InvestmentProfile {
  firmName: string | null;
  firmType: string | null;
  aumBand: string | null;
  mandate: Record<string, unknown>;
  weights: Record<string, unknown>;
  updatedAt: string; // ISO date string (no superjson on the wire)
}

export const MANDATE_DEFAULTS = {
  checkSize: "$10M – $50M",
  revenueBand: "$10M – $100M ARR",
  ebitda: "Rule of 40 ≥ 30%",
  grossMargin: "≥ 70%",
  holdPeriod: "4–6 years",
  targetReturn: "3–5× MoIC / 25%+ IRR",
  ownership: "Minority (10–25%)",
  mandateSectorLabels: ["B2B SaaS", "FinTech Infra", "HealthTech SaaS"],
  mandateGeoLabels: ["United States", "Canada"],
  mustHaves: [
    "ARR ≥ $10M with ≥ 25% YoY organic growth",
    "Software gross margins ≥ 70%",
    "Net Revenue Retention ≥ 110%",
    "Capital-efficient: CAC payback ≤ 24 months",
    "Clear line of sight to Rule of 40 within 24 months",
    "Defensible product moat in a vertical or workflow niche",
    "Founder/CEO with demonstrated execution and scaling experience",
  ],
  dealBreakers: [
    "Early-stage / pre-revenue or ARR < $5M",
    "Consumer-facing or hardware-dependent business models",
    "Gross margins < 50% (services-heavy disguised as SaaS)",
    "Burn multiple > 3× with no path to efficiency",
    "Top customer > 25% of ARR (concentration risk)",
    "Regulated verticals: cannabis, gambling, crypto-native, defense",
    "Founder unwilling to accept minority structured capital terms",
  ],
  investmentStages: ["Growth Stage", "Series C+", "Pre-IPO", "Founder-Led"],
  maxValuation: "$500M",
  esgCriteria: [
    "Data privacy & SOC 2 Type II (or roadmap within 12 months)",
    "Diverse hiring practices and reporting",
    "Responsible AI / data usage policy where applicable",
    "No exposure to fossil fuel extraction or controversial weapons",
  ],
  specialNotes: "Vistara focus: capital-efficient B2B SaaS with a clear path to profitability. Prefer companies where Vistara growth credit + equity structure is the primary capital raise.",
} as const;

export const FRAMEWORK_DEFAULTS: FrameworkCategory[] = [
  {
    id: "saas_financial",
    name: "SaaS Financial Quality",
    weight: 30,
    criteria: [
      { id: "arr_growth", name: "ARR Scale & Growth", subWeight: 30, benchmark: "ARR ≥ $10M with ≥ 25% YoY organic growth" },
      { id: "gross_margin", name: "Gross Margin", subWeight: 20, benchmark: "Software gross margin ≥ 70%" },
      { id: "nrr", name: "NRR", subWeight: 25, benchmark: "Net Revenue Retention ≥ 110%" },
      { id: "rule_of_40", name: "Rule of 40", subWeight: 25, benchmark: "Rule of 40 ≥ 30% or EBITDA breakeven within 24 months" },
    ],
  },
  {
    id: "capital_efficiency",
    name: "Capital Efficiency & Unit Economics",
    weight: 20,
    criteria: [
      { id: "cac_payback", name: "CAC Payback", subWeight: 35, benchmark: "Blended CAC payback ≤ 24 months" },
      { id: "ltv_cac", name: "LTV/CAC", subWeight: 30, benchmark: "LTV/CAC ratio ≥ 3.0×" },
      { id: "burn_multiple", name: "Burn Multiple", subWeight: 20, benchmark: "Burn multiple ≤ 1.5×" },
      { id: "magic_number", name: "Magic Number", subWeight: 15, benchmark: "Magic Number ≥ 0.7" },
    ],
  },
  {
    id: "market_position",
    name: "Market & Product Position",
    weight: 20,
    criteria: [
      { id: "tam", name: "TAM & Tailwinds", subWeight: 30, benchmark: "TAM ≥ $1B, growing ≥ 15% CAGR" },
      { id: "differentiation", name: "Differentiation", subWeight: 30, benchmark: "Vertical-specific or workflow lock-in moat" },
      { id: "concentration", name: "Concentration", subWeight: 20, benchmark: "Top 10 customers ≤ 40% of ARR" },
      { id: "win_rate", name: "Win Rate", subWeight: 20, benchmark: "≥ 40% win rate in competitive head-to-heads" },
    ],
  },
  {
    id: "management",
    name: "Management & Execution",
    weight: 15,
    criteria: [
      { id: "founder_quality", name: "Founder Quality", subWeight: 35, benchmark: "Domain expertise + prior scaling experience" },
      { id: "gtm_leadership", name: "GTM Leadership", subWeight: 25, benchmark: "Proven CRO / VP Sales in seat" },
      { id: "board_readiness", name: "Board Readiness", subWeight: 20, benchmark: "Independent board, audited financials" },
      { id: "enps", name: "eNPS", subWeight: 20, benchmark: "eNPS ≥ 30 / Glassdoor rating ≥ 4.0" },
    ],
  },
  {
    id: "structure",
    name: "Structure & Capital Fit",
    weight: 15,
    criteria: [
      { id: "use_of_proceeds", name: "Use of Proceeds", subWeight: 30, benchmark: "GTM scale, M&A, or founder liquidity — clearly articulated" },
      { id: "capital_structure", name: "Capital Structure", subWeight: 30, benchmark: "Aligns with Vistara growth credit + equity structure" },
      { id: "minority_protections", name: "Minority Protections", subWeight: 20, benchmark: "Board seat, information rights, protective covenants" },
      { id: "exit_optionality", name: "Exit Optionality", subWeight: 20, benchmark: "≥ 2 viable exit paths within 4–6 years" },
    ],
  },
];
