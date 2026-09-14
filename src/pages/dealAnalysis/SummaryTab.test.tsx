import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SummaryTab } from "./SummaryTab";
import { fetchCompanySynthesis } from "@/api/companySynthesis";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { GovernanceFlag, ICMemoResult } from "@shared/simperoTypes";

// The Executive Summary prefers the grounded synthesis (deal-level
// executive_summary section) when the memo composer hasn't written one.
vi.mock("@/api/companySynthesis", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/companySynthesis")>();
  return { ...actual, fetchCompanySynthesis: vi.fn() };
});

const mockFetchCompanySynthesis = vi.mocked(fetchCompanySynthesis);

beforeEach(() => {
  // Default: no synthesis -> the Executive Summary falls back to memo / placeholder.
  mockFetchCompanySynthesis.mockResolvedValue({ sections: [] });
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

  it("derives real Corroboration counts from the memo's own Sourced citations rather than fabricating data", async () => {
    const user = userEvent.setup();
    const memo = buildE2eDeliverableMemo();
    renderSummary(memo);

    expect(screen.getByText(/^Corroboration \(1 source\)$/)).toBeInTheDocument();
    expect(screen.getByText(/Partial/)).toBeInTheDocument();
    expect(screen.queryByText(/Verified/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText(memo.fileName)).toBeInTheDocument();
  });
});
