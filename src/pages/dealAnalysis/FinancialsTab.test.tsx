import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinancialsTab } from "./FinancialsTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import { formatBpAsPct, formatRatio, formatUsdShort } from "@/lib/dealMetricsFormat";
import type { DealMetrics, ICMemoResult, MetricDiscrepancy } from "@shared/simperoTypes";

afterEach(cleanup);

describe("FinancialsTab", () => {
  it("renders honest empty-states for every section when there is no memo and no dealMetrics", () => {
    render(<FinancialsTab memoTyped={null} dealMetrics={undefined} dealMetricDiscrepancies={[]} />);
    expect(screen.getByText("Financial projections not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Unit economics not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("See Company tab for revenue mix")).toBeInTheDocument();
    expect(screen.getByText("Multi-year financial trend not yet available")).toBeInTheDocument();
    expect(screen.getByText("Balance sheet data coming soon")).toBeInTheDocument();
    expect(screen.getByText("Valuation & deal-structure figures coming soon")).toBeInTheDocument();
    expect(screen.getByText("Financial model not yet available")).toBeInTheDocument();
    expect(screen.getByText("Valuation cross-check coming soon")).toBeInTheDocument();
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("renders real DealMetrics headline rows plus a discrepancy chip when cross-source values disagree", () => {
    const dealMetrics: DealMetrics = {
      revenueLatestUsd: { value: 50_000_000, source: "xlsx" },
      ebitdaMarginPct: { value: 1500, source: "claim_extract", citation: { page: 4, section: "Financials", quote: "", verified: true } },
    };
    const discrepancies: MetricDiscrepancy[] = [
      { field: "revenueLatestUsd", xlsxValue: 50_000_000, claimValue: 48_000_000, deltaPct: 4.2 },
    ];
    render(<FinancialsTab memoTyped={null} dealMetrics={dealMetrics} dealMetricDiscrepancies={discrepancies} />);

    expect(screen.getByText("Revenue (latest)")).toBeInTheDocument();
    expect(screen.getByText(formatUsdShort(50_000_000))).toBeInTheDocument();
    expect(screen.getByText("EBITDA Margin")).toBeInTheDocument();
    expect(screen.getByText(formatBpAsPct(1500))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discrepancy on revenueLatestUsd" })).toBeInTheDocument();
  });

  it("renders the real financialGrid, unit economics, retention, and sales-efficiency fields from the memo instead of the empty-states", () => {
    const memo = buildE2eDeliverableMemo();
    render(<FinancialsTab memoTyped={memo} dealMetrics={undefined} dealMetricDiscrepancies={[]} />);

    expect(screen.getByText("Revenue (ARR)")).toBeInTheDocument();
    expect(screen.getByText(formatUsdShort(12_000_000))).toBeInTheDocument();
    expect(screen.getByText(formatUsdShort(24_000_000))).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
    expect(screen.getByText("Mgmt est.")).toBeInTheDocument();
    expect(screen.queryByText("Financial projections not yet extracted")).not.toBeInTheDocument();

    expect(screen.getByText("LTV/CAC")).toBeInTheDocument();
    expect(screen.getByText("4.2x")).toBeInTheDocument();

    expect(screen.getByText("GRR")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("Magic #")).toBeInTheDocument();
    expect(screen.getByText("1.4")).toBeInTheDocument();

    // Sections with genuinely no backing field stay honest even with a fully-populated memo.
    expect(screen.getByText("Balance sheet data coming soon")).toBeInTheDocument();
    expect(screen.getByText("Valuation cross-check coming soon")).toBeInTheDocument();
  });

  it("builds the Financial Model scenario toggle from the memo's own scenario labels, without assuming a Downside/Base/Upside naming scheme", async () => {
    const user = userEvent.setup();
    const base = buildE2eDeliverableMemo();
    const memo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        exitStrategy: {
          ...base.deliverable!.exitStrategy!,
          scenarios: {
            value: [
              { label: "Bear Case", probabilityPct: 20, moic: 1.2, exitYear: 2028, exitValueUsd: 300_000_000, irrPct: 800 },
              { label: "Bull Case", probabilityPct: 30, moic: 5, exitYear: 2030, exitValueUsd: 1_200_000_000, irrPct: 4200 },
            ],
            provenance: "synthesized",
          },
        },
      },
    };
    render(<FinancialsTab memoTyped={memo} dealMetrics={undefined} dealMetricDiscrepancies={[]} />);

    // Real, non-standard scenario labels drive the toggle (rendered as a
    // Radix single-select toggle group, role="radio") — no hardcoded
    // Downside/Base/Upside 3-way switch.
    expect(screen.getByRole("radio", { name: "Bear Case" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bull Case" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Base" })).not.toBeInTheDocument();

    // No "Base" label exists, so the toggle defaults to the first scenario.
    expect(screen.getByText(formatRatio(1.2))).toBeInTheDocument();
    expect(screen.getByText("2028")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Bull Case" }));
    expect(screen.getByText(formatRatio(5))).toBeInTheDocument();
    expect(screen.getByText("2030")).toBeInTheDocument();
    expect(screen.getByText(formatBpAsPct(4200))).toBeInTheDocument();
  });
});
