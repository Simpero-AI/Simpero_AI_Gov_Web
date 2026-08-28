import { describe, expect, it } from "vitest";
import type {
  Citation,
  IcMemoIconKey,
  ICMemoDeliverable,
  ICMemoResult,
  MetricValue,
  Sourced,
} from "@shared/simperoTypes";
import { mapScreeningMaterials } from "./screeningMaterials";

function cite(quote: string): Citation {
  return { page: 1, section: null, quote, verified: true };
}

function sourced<T>(value: T, over: Partial<Sourced<T>> = {}): Sourced<T> {
  return { value, provenance: "extracted", ...over };
}

function metricValue(value: number, quote?: string): MetricValue {
  return { value, source: "claim_extract", citation: quote ? cite(quote) : undefined };
}

// The mapper only reads a handful of deliverable fields; each fixture provides a
// complete sub-object for the ones it touches and leaves the rest off (Partial).
function memoWith(
  deliverable: Partial<ICMemoDeliverable>,
  over: Partial<ICMemoResult> = {},
): Partial<ICMemoResult> {
  return { deliverable: deliverable as ICMemoDeliverable, ...over };
}

describe("mapScreeningMaterials — extracted fields", () => {
  it("pulls company overview + deal metrics as label/value/citation, formatting by unit", () => {
    const memo = memoWith(
      {
        companyOverview: {
          foundedDate: sourced<string | null>("2019", { citation: cite("Founded in 2019") }),
          hqLocation: sourced<string | null>("San Francisco, CA"),
          employees: sourced<number | null>(1200),
          products: sourced([]),
          revenueMix: sourced([]),
        },
      },
      {
        dealMetrics: {
          revenueLatestUsd: metricValue(1_500_000_000, "Revenue of $15.0M"), // cents
          grossMarginPct: metricValue(7800), // basis points
          evRevenue: metricValue(14.8), // plain ratio
        },
      },
    );

    expect(mapScreeningMaterials(memo).extractedFields).toEqual([
      { label: "Founded", value: "2019", citation: "Founded in 2019" },
      { label: "Headquarters", value: "San Francisco, CA", citation: undefined },
      { label: "Employees", value: "1,200", citation: undefined },
      { label: "Revenue", value: "$15.0M", citation: "Revenue of $15.0M" },
      { label: "Gross Margin", value: "78.0%", citation: undefined },
      { label: "EV / Revenue", value: "14.8×", citation: undefined },
    ]);
  });

  it("skips missing-provenance and null-valued fields rather than rendering filler", () => {
    const memo = memoWith(
      {
        companyOverview: {
          foundedDate: sourced<string | null>(null, { provenance: "missing" }),
          hqLocation: sourced<string | null>(null),
          employees: sourced<number | null>(80),
          products: sourced([]),
          revenueMix: sourced([]),
        },
      },
      { dealMetrics: {} },
    );

    expect(mapScreeningMaterials(memo).extractedFields).toEqual([
      { label: "Employees", value: "80", citation: undefined },
    ]);
  });

  it("excludes synthesized/modeled/stub company-overview values (only true extractions)", () => {
    const memo = memoWith({
      companyOverview: {
        // A synthesized/inferred value is NOT a document extraction, so it must
        // not appear on the "Extracted from Materials" panel.
        foundedDate: sourced<string | null>("2019", { provenance: "synthesized" }),
        hqLocation: sourced<string | null>("Somewhere", { provenance: "stub" }),
        employees: sourced<number | null>(50, { provenance: "modeled" }),
        products: sourced([]),
        revenueMix: sourced([]),
      },
    });

    expect(mapScreeningMaterials(memo).extractedFields).toEqual([]);
  });
});

describe("mapScreeningMaterials — highlights", () => {
  it("leads with the investment highlight, then one line per thesis card", () => {
    const memo = memoWith({
      executiveSummary: {
        paragraphs: [],
        investmentHighlight: sourced<string | null>("Category-defining product, strong retention"),
      },
      investmentThesisCards: sourced<
        Array<{ theme: string; iconKey: IcMemoIconKey; bullets: string[] }>
      >([
        { theme: "Strong Unit Economics", iconKey: "unit_economics", bullets: ["LTV/CAC of 4.2x"] },
        { theme: "Defensible Moat", iconKey: "moat", bullets: [] },
      ]),
    });

    expect(mapScreeningMaterials(memo).highlights).toEqual([
      "Category-defining product, strong retention",
      "Strong Unit Economics: LTV/CAC of 4.2x",
      "Defensible Moat",
    ]);
  });

  it("returns nothing when the highlight is missing and there are no thesis cards", () => {
    const memo = memoWith({
      executiveSummary: {
        paragraphs: [],
        investmentHighlight: sourced<string | null>(null, { provenance: "missing" }),
      },
      investmentThesisCards: sourced<null>(null, { provenance: "missing" }),
    });

    expect(mapScreeningMaterials(memo).highlights).toEqual([]);
  });
});

describe("mapScreeningMaterials — risk flags", () => {
  it("folds governance flags + risk register, ordered worst-severity-first, deduped", () => {
    const memo = memoWith(
      {
        riskRegister: sourced<
          Array<{
            risk: string;
            severity: "H" | "M" | "L";
            probability: "Very Low" | "Low" | "Medium" | "High";
            description: string;
            mitigation: string;
          }>
        >([
          { risk: "Customer concentration", severity: "H", probability: "Medium", description: "", mitigation: "" },
          { risk: "Key-person dependence", severity: "L", probability: "Low", description: "", mitigation: "" },
          { risk: "Customer concentration", severity: "H", probability: "Medium", description: "", mitigation: "" },
        ]),
      },
      {
        governance_flags: [
          { category: "Data Privacy", description: "GDPR data-handling gaps", severity: "M", regulation: "GDPR" },
        ],
      },
    );

    expect(mapScreeningMaterials(memo).riskFlags).toEqual([
      "Customer concentration",
      "GDPR data-handling gaps",
      "Key-person dependence",
    ]);
  });
});

describe("mapScreeningMaterials — empty inputs", () => {
  it("returns empty arrays for a null memo", () => {
    expect(mapScreeningMaterials(null)).toEqual({ extractedFields: [], highlights: [], riskFlags: [] });
  });

  it("returns empty arrays for a memo with no deliverable and no flags", () => {
    expect(mapScreeningMaterials({})).toEqual({ extractedFields: [], highlights: [], riskFlags: [] });
  });
});
