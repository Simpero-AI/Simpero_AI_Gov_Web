import { describe, expect, it } from "vitest";
import { financialsCorroboration, summaryCorroboration } from "./corroborationFromClaims";
import type { FinancialFact, FinancialsView } from "@/api/financials";
import type { CompanySynthPoint } from "@/api/companySynthesis";
import type { CorroborationStatusCount } from "./CorroborationPanel";

function fact(status: FinancialFact["status"], over: Partial<FinancialFact> = {}): FinancialFact {
  return {
    label: over.label ?? "Metric",
    value: over.value ?? "$1.0M",
    period: over.period ?? "FY23",
    citation: over.citation ?? null,
    status,
    entity: over.entity ?? null,
    sourceUrl: over.sourceUrl ?? null,
  };
}

function view(over: Partial<FinancialsView>): FinancialsView {
  return {
    incomeStatement: over.incomeStatement ?? [],
    profitability: over.profitability ?? [],
    balanceSheet: over.balanceSheet ?? [],
    cashFlow: over.cashFlow ?? [],
    operating: over.operating ?? [],
    trend: over.trend,
  };
}

/** statusCounts -> a plain record keyed by status, for order-independent asserts. */
function asRecord(counts: CorroborationStatusCount[]): Record<string, number> {
  return Object.fromEntries(counts.map((c) => [c.status, c.count]));
}

describe("financialsCorroboration", () => {
  it("returns empty for a null / all-empty view", () => {
    expect(financialsCorroboration(null)).toEqual({ items: [], statusCounts: [] });
    expect(financialsCorroboration(undefined)).toEqual({ items: [], statusCounts: [] });
    expect(financialsCorroboration(view({}))).toEqual({ items: [], statusCounts: [] });
  });

  it("tallies every fact's real trust status across all five statement groupings", () => {
    const result = financialsCorroboration(
      view({
        incomeStatement: [fact("verified"), fact("verified")],
        profitability: [fact("cited")],
        balanceSheet: [fact("conflicted")],
        cashFlow: [fact("verified")],
        operating: [fact("inconclusive")],
      })
    );

    // Each status keeps its own bucket — conflicted and cited are NOT collapsed
    // into a single "unverified". The cashFlow grouping is included in the tally
    // (its verified fact lifts the verified count to 3).
    expect(asRecord(result.statusCounts)).toEqual({
      verified: 3,
      cited: 1,
      conflicted: 1,
      inconclusive: 1,
    });
    // partially_verified never appeared, so it is absent (not a zero entry).
    expect(result.statusCounts.some((c) => c.status === "partially_verified")).toBe(false);
  });

  it("groups facts into source rows: external records by host, document facts by citation, most-cited first", () => {
    const result = financialsCorroboration(
      view({
        incomeStatement: [
          fact("verified", { label: "Revenue", citation: "cim.pdf · p.12" }),
          fact("verified", { label: "COGS", citation: "cim.pdf · p.12" }),
        ],
        profitability: [
          fact("cited", { label: "Gross Margin", citation: "EDGAR 10-K", sourceUrl: "https://www.sec.gov/x" }),
        ],
        balanceSheet: [
          fact("conflicted", { label: "Cash", sourceUrl: "https://www.sec.gov/y" }),
        ],
        operating: [fact("inconclusive", { label: "NRR", entity: "Acme Corp" })],
      })
    );

    // Two http(s) records on the same host collapse into one "www.sec.gov" row;
    // the two p.12 document facts collapse into one row; the entity-only fact
    // stands alone. Sorted by cite count (desc) then name.
    expect(result.items).toEqual([
      { id: "doc:cim.pdf · p.12", name: "cim.pdf · p.12", kind: "document", citeCount: 2 },
      { id: "external:www.sec.gov", name: "www.sec.gov", kind: "external", citeCount: 2 },
      { id: "doc:Acme Corp", name: "Acme Corp", kind: "document", citeCount: 1 },
    ]);
    // No per-item verified pill — the header carries the aggregate status.
    expect(result.items.every((i) => i.verified === undefined)).toBe(true);
  });

  it("treats a non-http(s) sourceUrl as unusable and falls back to the citation", () => {
    const result = financialsCorroboration(
      view({ incomeStatement: [fact("verified", { citation: "cim.pdf", sourceUrl: "javascript:alert(1)" })] })
    );
    expect(result.items).toEqual([
      { id: "doc:cim.pdf", name: "cim.pdf", kind: "document", citeCount: 1 },
    ]);
  });
});

describe("summaryCorroboration", () => {
  const cited: CompanySynthPoint = { text: "A grounded, cited point.", citation: "cim.pdf · p.5" };
  const cited2: CompanySynthPoint = { text: "Another cited point.", citation: "cim.pdf · p.9" };
  const uncited: CompanySynthPoint = { text: "An uncited point.", citation: null };

  it("returns empty when there are no financial facts and no cited exec-summary points", () => {
    expect(summaryCorroboration(null, undefined)).toEqual({ items: [], statusCounts: [] });
    expect(summaryCorroboration(null, [uncited])).toEqual({ items: [], statusCounts: [] });
  });

  it("counts each cited exec-summary point as `cited` and skips uncited points", () => {
    const result = summaryCorroboration(null, [cited, uncited, cited2]);
    expect(asRecord(result.statusCounts)).toEqual({ cited: 2 });
    expect(result.items).toEqual([
      { id: "synthesis:executive-summary", name: "AI executive summary (grounded)", kind: "document", citeCount: 2 },
    ]);
  });

  it("merges the financial figures' statuses with the exec-summary cited points", () => {
    const result = summaryCorroboration(
      view({ incomeStatement: [fact("verified", { citation: "cim.pdf · p.12" })] }),
      [cited]
    );
    // One verified figure + one cited synthesis point. Items are equal cite
    // count, so they order by name — "AI executive summary…" before "cim.pdf…".
    expect(asRecord(result.statusCounts)).toEqual({ verified: 1, cited: 1 });
    expect(result.items).toEqual([
      { id: "synthesis:executive-summary", name: "AI executive summary (grounded)", kind: "document", citeCount: 1 },
      { id: "doc:cim.pdf · p.12", name: "cim.pdf · p.12", kind: "document", citeCount: 1 },
    ]);
  });

  it("adds cited synthesis points on top of financial facts already carrying a `cited` status", () => {
    const result = summaryCorroboration(
      view({ profitability: [fact("cited", { citation: "EDGAR" })] }),
      [cited, cited2]
    );
    // 1 cited figure + 2 cited synthesis points = 3 cited.
    expect(asRecord(result.statusCounts)).toEqual({ cited: 3 });
  });
});
