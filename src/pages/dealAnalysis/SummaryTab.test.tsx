import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SummaryTab } from "./SummaryTab";
import { fetchCompanySynthesis } from "@/api/companySynthesis";
import { fetchFinancials, type FinancialsView } from "@/api/financials";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { GovernanceFlag, ICMemoResult } from "@shared/simperoTypes";

// The Executive Summary prefers the grounded synthesis (deal-level
// executive_summary section) when the memo composer hasn't written one.
vi.mock("@/api/companySynthesis", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/companySynthesis")>();
  return { ...actual, fetchCompanySynthesis: vi.fn() };
});

// The Corroboration panel now reads the tab's OWN live claims view — mock it so
// the tab renders against controlled financial facts instead of the dead memo.
vi.mock("@/api/financials", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/financials")>();
  return { ...actual, fetchFinancials: vi.fn() };
});

const mockFetchCompanySynthesis = vi.mocked(fetchCompanySynthesis);
const mockFetchFinancials = vi.mocked(fetchFinancials);

const EMPTY_FINANCIALS: FinancialsView = {
  incomeStatement: [],
  profitability: [],
  balanceSheet: [],
  cashFlow: [],
  operating: [],
};

beforeEach(() => {
  // Default: no synthesis -> the Executive Summary falls back to memo / placeholder.
  mockFetchCompanySynthesis.mockResolvedValue({ sections: [] });
  // Default: no financial figures -> the Corroboration panel self-empties.
  mockFetchFinancials.mockResolvedValue(EMPTY_FINANCIALS);
});

afterEach(cleanup);

function renderSummary(memoTyped: Partial<ICMemoResult> | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SummaryTab dealId="deal-1" memoTyped={memoTyped} />
    </QueryClientProvider>
  );
}

describe("SummaryTab", () => {
  it("renders the missing-data placeholder for Executive Summary and Risk Assessment when there is no memo", () => {
    renderSummary(null);
    expect(screen.getAllByTestId("missing-placeholder").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("renders the grounded AI executive summary when the memo has none", async () => {
    mockFetchCompanySynthesis.mockResolvedValue({
      sections: [
        {
          key: "executive_summary",
          title: "Executive Summary",
          points: [
            { text: "A consumption-priced cloud data platform serving enterprises.", citation: "cim.pdf · p.5" },
          ],
          people: [],
        },
      ],
    });
    renderSummary(null);

    expect(
      await screen.findByText("A consumption-priced cloud data platform serving enterprises.")
    ).toBeInTheDocument();
    expect(screen.getByText("cim.pdf · p.5")).toBeInTheDocument();
    expect(screen.getByText(/AI summary/)).toBeInTheDocument();
  });

  it("folds governance_flags and deliverable.riskRegister into one Risk Assessment table, high severity first", () => {
    const memo: ICMemoResult = {
      ...buildE2eDeliverableMemo(),
      governance_flags: [
        {
          category: "AML Screening Gap",
          description: "No documented AML policy on file.",
          severity: "H",
          regulation: "BSA/AML",
        } as GovernanceFlag,
      ],
    };
    renderSummary(memo);

    expect(screen.getByText("AML Screening Gap")).toBeInTheDocument();
    expect(screen.getByText("Customer concentration")).toBeInTheDocument();
    expect(screen.getByText("BSA/AML · Compliance")).toBeInTheDocument();
    expect(screen.getByText(/Medium probability · Business/)).toBeInTheDocument();

    const rows = screen.getAllByRole("row").filter(r => r.textContent?.includes("AML Screening Gap") || r.textContent?.includes("Customer concentration"));
    expect(rows[0].textContent).toContain("AML Screening Gap");
    expect(rows[1].textContent).toContain("Customer concentration");
  });

  it("renders a visibly disabled IC Sign-off control with no fake success state", () => {
    renderSummary(buildE2eDeliverableMemo());
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
    expect(screen.getByText(/isn't persisted yet/i)).toBeInTheDocument();
  });

  it("derives real Corroboration counts from the tab's live claims view + grounded exec-summary points, not the dead memo", async () => {
    const user = userEvent.setup();
    // Live claims view: one verified figure + one cited figure with an external
    // SEC record. Labels deliberately aren't Revenue/Gross Margin so the Key
    // Metrics cards don't also render these as pills (keeps the assert focused).
    mockFetchFinancials.mockResolvedValue({
      ...EMPTY_FINANCIALS,
      incomeStatement: [
        { label: "EBITDA", value: "$12.0M", period: "FY23", citation: "cim.pdf · p.12", status: "verified", entity: null, sourceUrl: null },
      ],
      profitability: [
        { label: "Operating Margin", value: "18%", period: "FY23", citation: "EDGAR 10-K", status: "cited", entity: null, sourceUrl: "https://www.sec.gov/filing/1" },
      ],
    });
    // One grounded, cited executive-summary point -> counts as `cited`.
    mockFetchCompanySynthesis.mockResolvedValue({
      sections: [
        {
          key: "executive_summary",
          title: "Executive Summary",
          points: [{ text: "A grounded, cited summary point.", citation: "cim.pdf · p.5" }],
          people: [],
        },
      ],
    });

    renderSummary(null);

    // Header shows the real status ladder: 1 verified figure, 2 cited (the cited
    // figure + the cited synthesis point). No memo-derived source; no force-mapped
    // "Unverified".
    expect(await screen.findByText("1 Verified")).toBeInTheDocument();
    expect(screen.getByText("2 Cited")).toBeInTheDocument();
    expect(screen.queryByText(/Unverified/)).not.toBeInTheDocument();
    expect(screen.getByText(/^Corroboration \(3 sources\)$/)).toBeInTheDocument();

    // Expanding reveals the real sources — including the grounded synthesis and
    // the external SEC record — instead of a single "Source document" row.
    await user.click(screen.getByRole("button", { name: /Corroboration/ }));
    expect(screen.getByText("AI executive summary (grounded)")).toBeInTheDocument();
    expect(screen.getByText("www.sec.gov")).toBeInTheDocument();
    expect(screen.getByText("cim.pdf · p.12")).toBeInTheDocument();
  });
});
