/** Controlled strings for mandate checkboxes — stored under `mandate.*` arrays. */

export const DEAL_STRATEGY_OPTIONS = [
  { id: "buyout", label: "Buyout / control" },
  { id: "growth_equity", label: "Growth equity" },
  { id: "venture", label: "Venture / early stage" },
  { id: "credit", label: "Credit / structured" },
  { id: "secondaries", label: "Secondaries" },
  { id: "real_assets", label: "Real assets" },
] as const;

export const SECTOR_OPTIONS = [
  { id: "technology", label: "Technology" },
  { id: "healthcare", label: "Healthcare" },
  { id: "industrials", label: "Industrials" },
  { id: "consumer", label: "Consumer" },
  { id: "financial_services", label: "Financial services" },
  { id: "energy", label: "Energy / infrastructure" },
] as const;

export const REGION_OPTIONS = [
  { id: "north_america", label: "North America" },
  { id: "emea", label: "EMEA" },
  { id: "apac", label: "Asia Pacific" },
  { id: "latam", label: "Latin America" },
] as const;

export const EXCLUSION_OPTIONS = [
  { id: "sin_stocks", label: "Excluded sectors (tobacco / weapons, etc.)" },
  { id: "fossil_explicit", label: "Explicit fossil-fuel exclusions" },
  { id: "crypto", label: "Digital assets above policy threshold" },
  { id: "emerging_conflict", label: "High-risk jurisdictions" },
] as const;

export type ScoringPreset = "balanced" | "growth" | "income" | "impact" | "custom";

export type ScoringDimension =
  | "financial_health"
  | "market_position"
  | "management_quality"
  | "deal_structure"
  | "esg_impact";

export const SCORING_DIMENSIONS: readonly {
  id: ScoringDimension;
  label: string;
  helper: string;
}[] = [
  {
    id: "financial_health",
    label: "Financial health",
    helper: "Quality of earnings, balance sheet, and cash conversion.",
  },
  {
    id: "market_position",
    label: "Market position",
    helper: "Competitive moat, growth, and addressable market.",
  },
  {
    id: "management_quality",
    label: "Management & governance",
    helper: "Track record, controls, and alignment.",
  },
  {
    id: "deal_structure",
    label: "Deal structure",
    helper: "Terms, protections, and downside scenarios.",
  },
  {
    id: "esg_impact",
    label: "ESG / impact",
    helper: "Material ESG risks and stakeholder outcomes.",
  },
];

export const SCORING_PRESET_LABELS: Record<Exclude<ScoringPreset, "custom">, string> = {
  balanced: "Balanced — equal weight across pillars",
  growth: "Growth — emphasizes market upside",
  income: "Income / downside — emphasizes financial resilience",
  impact: "Impact — elevates ESG and governance",
};

export const SCORING_PRESET_WEIGHTS: Record<Exclude<ScoringPreset, "custom">, Record<ScoringDimension, number>> = {
  balanced: {
    financial_health: 20,
    market_position: 20,
    management_quality: 20,
    deal_structure: 20,
    esg_impact: 20,
  },
  growth: {
    financial_health: 20,
    market_position: 35,
    management_quality: 15,
    deal_structure: 20,
    esg_impact: 10,
  },
  income: {
    financial_health: 35,
    market_position: 15,
    management_quality: 20,
    deal_structure: 25,
    esg_impact: 5,
  },
  impact: {
    financial_health: 15,
    market_position: 15,
    management_quality: 25,
    deal_structure: 20,
    esg_impact: 25,
  },
};

export function scoringSum(dims: Record<ScoringDimension, number>): number {
  return SCORING_DIMENSIONS.reduce((acc, d) => acc + (dims[d.id] ?? 0), 0);
}

/** Returns a known preset key if vectors match Carbon-style 5-way calibration. */
export function inferScoringPreset(dims: Record<ScoringDimension, number>): ScoringPreset {
  const entries = Object.entries(SCORING_PRESET_WEIGHTS) as [
    Exclude<ScoringPreset, "custom">,
    Record<ScoringDimension, number>,
  ][];
  for (const [preset, target] of entries) {
    const match = SCORING_DIMENSIONS.every((d) => dims[d.id] === target[d.id]);
    if (match) return preset;
  }
  return "custom";
}

export function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export function parseDimensionWeights(raw: Record<string, unknown>): Record<ScoringDimension, number> {
  const out: Record<ScoringDimension, number> = {
    financial_health: 20,
    market_position: 20,
    management_quality: 20,
    deal_structure: 20,
    esg_impact: 20,
  };
  for (const { id } of SCORING_DIMENSIONS) {
    const v = raw[id];
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.round(v);
      out[id] = Math.max(0, Math.min(100, n));
    }
  }
  return out;
}

export function coerceScoringPreset(raw: unknown): ScoringPreset {
  if (raw === "balanced" || raw === "growth" || raw === "income" || raw === "impact" || raw === "custom") {
    return raw;
  }
  return "custom";
}

function vectorsEqual(a: Record<ScoringDimension, number>, b: Record<ScoringDimension, number>): boolean {
  return SCORING_DIMENSIONS.every((d) => a[d.id] === b[d.id]);
}

/** Reconcile stored preset key with numeric weights — tolerates drift and unknown keys. */
export function hydrateScoringPresetMode(
  weights: Record<string, unknown>,
  dims: Record<ScoringDimension, number>,
): ScoringPreset {
  const explicit = coerceScoringPreset(weights["preset"]);
  if (explicit === "custom") return "custom";

  const target = SCORING_PRESET_WEIGHTS[explicit];
  if (target != null && vectorsEqual(dims, target)) return explicit;

  return inferScoringPreset(dims);
}
