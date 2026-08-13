import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CapTableTab } from "./CapTableTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import { formatBpAsPct, formatUsdShort } from "@/lib/dealMetricsFormat";

afterEach(cleanup);

describe("CapTableTab", () => {
  it("renders honest empty-states for every section when there is no memo", () => {
    render(<CapTableTab memoTyped={null} />);
    expect(screen.getByText("Deal terms not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Cap table not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Exit waterfall coming soon")).toBeInTheDocument();
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("renders real investmentStructure and capTable fields instead of the empty-states", () => {
    const memo = buildE2eDeliverableMemo();
    const is = memo.deliverable!.investmentStructure!;
    render(<CapTableTab memoTyped={memo} />);

    expect(screen.getByText("Investment Amount")).toBeInTheDocument();
    // Coincidentally the same formatted value as the cap table's "New
    // Investor" investmentUsd row below — assert it renders at least once
    // rather than assuming it's unique on the page.
    expect(screen.getAllByText(formatUsdShort(is.investmentAmountUsd.value as number)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(formatUsdShort(is.valuationPreUsd.value as number))).toBeInTheDocument();
    // Also coincidentally shared with the cap table's "New Investor" ownershipPct row.
    expect(screen.getAllByText(formatBpAsPct(is.ownershipPct.value as number)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Board seat")).toBeInTheDocument();
    expect(screen.queryByText("Deal terms not yet extracted")).not.toBeInTheDocument();

    expect(screen.getByText("Founders")).toBeInTheDocument();
    expect(screen.getByText("New Investor")).toBeInTheDocument();
    expect(screen.getByText("8,000,000")).toBeInTheDocument();
    expect(screen.queryByText("Cap table not yet extracted")).not.toBeInTheDocument();
  });

  it("never derives a pro-rata Exit Waterfall from capTable + exitStrategy.scenarios, even when both are present — always the honest empty-state", () => {
    const memo = buildE2eDeliverableMemo();
    // Sanity-check the fixture actually has both real inputs a naive pro-rata
    // derivation would use, so this test can't pass by accident.
    expect(memo.deliverable!.capTable!.value?.length).toBeGreaterThan(0);
    expect(memo.deliverable!.exitStrategy!.scenarios!.value?.length).toBeGreaterThan(0);

    render(<CapTableTab memoTyped={memo} />);
    expect(screen.getByText("Exit waterfall coming soon")).toBeInTheDocument();
    expect(screen.getByText(/liquidation preference and seniority/i)).toBeInTheDocument();
    // No fabricated per-holder proceeds table anywhere in the section.
    expect(screen.queryAllByText(/exit proceeds/i)).toHaveLength(0);
  });
});
