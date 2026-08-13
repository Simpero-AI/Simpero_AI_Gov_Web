import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarketTab } from "./MarketTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import { formatBpAsPct, formatUsdShort } from "@/lib/dealMetricsFormat";
import type { ICMemoResult } from "@shared/simperoTypes";

afterEach(cleanup);

describe("MarketTab", () => {
  it("renders honest empty-states for every section when there is no memo", () => {
    render(<MarketTab memoTyped={null} />);
    expect(screen.getByText("Market sizing not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Growth drivers not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Market risks not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Competitive landscape not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Per-dimension positioning not available")).toBeInTheDocument();
    expect(screen.getByText("Market context not yet available")).toBeInTheDocument();
    expect(screen.getByText("Growth strategy not yet extracted")).toBeInTheDocument();
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("renders real TAM/SAM/SOM, CAGR, and competitor data instead of the empty-states", () => {
    const memo = buildE2eDeliverableMemo();
    const mc = memo.deliverable!.marketCompetitive!;
    render(<MarketTab memoTyped={memo} />);

    expect(screen.getByText(formatUsdShort(mc.tamUsd.value as number))).toBeInTheDocument();
    expect(screen.getByText(formatUsdShort(mc.samUsd.value as number))).toBeInTheDocument();
    expect(screen.getByText(formatUsdShort(mc.somUsd.value as number))).toBeInTheDocument();
    expect(screen.getByText("Market Growth CAGR")).toBeInTheDocument();
    expect(screen.getByText(formatBpAsPct(mc.growthCagrPct.value as number))).toBeInTheDocument();
    expect(screen.queryByText("Market sizing not yet extracted")).not.toBeInTheDocument();

    const competitor = (mc.competitors!.value as Array<{ name: string; weakness: string; winRatePct?: number }>)[0];
    expect(screen.getByText("Incumbent A")).toBeInTheDocument();
    expect(screen.getByText("Legacy architecture")).toBeInTheDocument();
    expect(screen.getByText(formatBpAsPct(competitor.winRatePct!))).toBeInTheDocument();
    expect(screen.getByText(/Competitive Advantage:/)).toBeInTheDocument();
    expect(screen.queryByText("Competitive landscape not yet extracted")).not.toBeInTheDocument();

    // No backing field for these regardless of how populated the memo is.
    expect(screen.getByText("Growth drivers not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Per-dimension positioning not available")).toBeInTheDocument();
  });

  it("falls back to the due-diligence summary's 'Market & Strategy' category for Market Context, honestly labeled as DD findings rather than a fabricated market writeup", () => {
    const base = buildE2eDeliverableMemo();
    const memo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        dueDiligenceSummary: {
          categories: [
            {
              category: "Market & Strategy",
              status: { value: "complete", provenance: "synthesized" },
              findings: { value: "Fragmented market with room for a category leader.", provenance: "synthesized" },
              completenessPct: { value: 85, provenance: "synthesized" },
              flaggedCount: { value: 1, provenance: "synthesized" },
            },
          ],
          conclusion: { value: "DD in progress.", provenance: "synthesized" },
        },
      },
    };
    render(<MarketTab memoTyped={memo} />);
    expect(screen.getByText("Fragmented market with room for a category leader.")).toBeInTheDocument();
    expect(screen.getByText(/No dedicated market-landscape writeup/)).toBeInTheDocument();
    expect(screen.getByText(/DD completeness: 85%/)).toBeInTheDocument();
    expect(screen.getByText(/1 flagged/)).toBeInTheDocument();
    expect(screen.queryByText("Market context not yet available")).not.toBeInTheDocument();
  });
});
