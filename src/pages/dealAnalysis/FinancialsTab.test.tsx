import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FinancialsTab } from "./FinancialsTab";
import { fetchFinancials, type FinancialsView } from "@/api/financials";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import { formatBpAsPct, formatRatio, formatUsdShort } from "@/lib/dealMetricsFormat";
import type { DealMetrics, ICMemoResult, MetricDiscrepancy } from "@shared/simperoTypes";

// The tab's own FinancialFiguresSection fetches GET /deals/{id}/financials via
// react-query — mock the client so the tab renders against controlled data with
// no real network call. The memo-derived cards below are pure props, unaffected.
vi.mock("@/api/financials", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/financials")>();
  return { ...actual, fetchFinancials: vi.fn() };
});

const mockFetchFinancials = vi.mocked(fetchFinancials);

const EMPTY_FINANCIALS: FinancialsView = {
  incomeStatement: [],
  profitability: [],
  balanceSheet: [],
  cashFlow: [],
  operating: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderFinancialsTab(props: {
  memoTyped: Partial<ICMemoResult> | null;
  dealMetrics: DealMetrics | undefined;
  dealMetricDiscrepancies: MetricDiscrepancy[];
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FinancialsTab dealId="deal-1" {...props} />
    </QueryClientProvider>
  );
}

describe("FinancialsTab", () => {
  it("renders honest empty-states for every section when there is no memo and no dealMetrics", () => {
    mockFetchFinancials.mockResolvedValue(EMPTY_FINANCIALS);
    renderFinancialsTab({ memoTyped: null, dealMetrics: undefined, dealMetricDiscrepancies: [] });
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
    mockFetchFinancials.mockResolvedValue(EMPTY_FINANCIALS);
    const dealMetrics: DealMetrics = {
      revenueLatestUsd: { value: 50_000_000, source: "xlsx" },
      ebitdaMarginPct: { value: 1500, source: "claim_extract", citation: { page: 4, section: "Financials", quote: "", verified: true } },
    };
    const discrepancies: MetricDiscrepancy[] = [
      { field: "revenueLatestUsd", xlsxValue: 50_000_000, claimValue: 48_000_000, deltaPct: 4.2 },
    ];
    renderFinancialsTab({ memoTyped: null, dealMetrics, dealMetricDiscrepancies: discrepancies });

    expect(screen.getByText("Revenue (latest)")).toBeInTheDocument();
    expect(screen.getByText(formatUsdShort(50_000_000))).toBeInTheDocument();
    expect(screen.getByText("EBITDA Margin")).toBeInTheDocument();
    expect(screen.getByText(formatBpAsPct(1500))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discrepancy on revenueLatestUsd" })).toBeInTheDocument();
  });

  it("renders the real financialGrid, unit economics, retention, and sales-efficiency fields from the memo instead of the empty-states", () => {
    mockFetchFinancials.mockResolvedValue(EMPTY_FINANCIALS);
    const memo = buildE2eDeliverableMemo();
    renderFinancialsTab({ memoTyped: memo, dealMetrics: undefined, dealMetricDiscrepancies: [] });

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
    mockFetchFinancials.mockResolvedValue(EMPTY_FINANCIALS);
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
    renderFinancialsTab({ memoTyped: memo, dealMetrics: undefined, dealMetricDiscrepancies: [] });

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

  // -------------------------------------------------------------------------
  // Financial Figures section — claims-driven GET /deals/{id}/financials.
  // -------------------------------------------------------------------------

  it("renders extracted financial facts across the statement sections with value, period, status and a source-URL link", async () => {
    mockFetchFinancials.mockResolvedValue({
      ...EMPTY_FINANCIALS,
      incomeStatement: [
        { label: "Revenue", value: "$497.2M", period: "FY23", citation: "cim.pdf · p.12", status: "verified", entity: null, sourceUrl: null },
      ],
      profitability: [
        { label: "Gross Margin", value: "42%", period: "FY23 Estimate", citation: "EDGAR 10-K", status: "cited", entity: null, sourceUrl: "https://www.sec.gov/filing/123" },
      ],
    });
    renderFinancialsTab({ memoTyped: null, dealMetrics: undefined, dealMetricDiscrepancies: [] });

    expect(await screen.findByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$497.2M")).toBeInTheDocument();
    expect(screen.getByText("FY23")).toBeInTheDocument();
    expect(screen.getByText("Gross Margin")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("FY23 Estimate")).toBeInTheDocument();

    // Trust status surfaced, plain-string citation shown for the URL-less fact.
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Cited")).toBeInTheDocument();
    expect(screen.getByText("cim.pdf · p.12")).toBeInTheDocument();

    // A valid http(s) sourceUrl renders as a link showing the hostname.
    const link = screen.getByRole("link", { name: "www.sec.gov" });
    expect(link).toHaveAttribute("href", "https://www.sec.gov/filing/123");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.queryByText("No financial figures extracted")).not.toBeInTheDocument();
  });

  it("shows a loading state for the figures section, not a false empty-state, while the fetch is pending", () => {
    mockFetchFinancials.mockReturnValue(new Promise<FinancialsView>(() => {}));
    renderFinancialsTab({ memoTyped: null, dealMetrics: undefined, dealMetricDiscrepancies: [] });

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("No financial figures extracted")).not.toBeInTheDocument();
  });

  it("shows an error state when the financials fetch fails on first load", async () => {
    mockFetchFinancials.mockRejectedValue(new Error("boom"));
    renderFinancialsTab({ memoTyped: null, dealMetrics: undefined, dealMetricDiscrepancies: [] });

    expect(await screen.findByText("Couldn't load financial figures for this deal.")).toBeInTheDocument();
  });

  it("treats a 404 (null view) as neutral 'not available yet', not the confident 'nothing extracted'", async () => {
    mockFetchFinancials.mockResolvedValue(null);
    renderFinancialsTab({ memoTyped: null, dealMetrics: undefined, dealMetricDiscrepancies: [] });

    expect(await screen.findByText("Financial figures not available yet")).toBeInTheDocument();
    expect(screen.queryByText("No financial figures extracted")).not.toBeInTheDocument();
  });

  it("shows 'No financial figures extracted' when a 200 returns all-empty sections", async () => {
    mockFetchFinancials.mockResolvedValue(EMPTY_FINANCIALS);
    renderFinancialsTab({ memoTyped: null, dealMetrics: undefined, dealMetricDiscrepancies: [] });

    expect(await screen.findByText("No financial figures extracted")).toBeInTheDocument();
  });
});
