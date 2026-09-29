import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import DealReport from "./DealReport";
import { fetchDeal } from "@/api/deals";
import type { DealWithLatestMemo } from "@/api/deals";

// fetchDeal hits the network via apiFetch — mock it, keeping the real (pure)
// query-key helpers. The five tab bodies are exercised by their own suites, so
// stub them to sentinels here: this suite covers the report's own composition
// (cover, section order, print toolbar), not the tabs' internals.
vi.mock("@/api/deals", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/deals")>();
  return { ...actual, fetchDeal: vi.fn() };
});
vi.mock("./dealAnalysis/SummaryTab", () => ({
  SummaryTab: () => <div data-testid="tab-summary" />,
}));
vi.mock("./dealAnalysis/CompanyTab", () => ({
  CompanyTab: () => <div data-testid="tab-company" />,
}));
vi.mock("./dealAnalysis/MarketTab", () => ({
  MarketTab: () => <div data-testid="tab-market" />,
}));
vi.mock("./dealAnalysis/FinancialsTab", () => ({
  FinancialsTab: () => <div data-testid="tab-financials" />,
}));
vi.mock("./dealAnalysis/CorroborationTab", () => ({
  CorroborationTab: () => <div data-testid="tab-corroboration" />,
}));

const mockFetchDeal = vi.mocked(fetchDeal);

function makeDealResponse(name: string): DealWithLatestMemo {
  return {
    deal: {
      name,
      gpSource: "Sourced",
      dealSizeMinUsd: null,
      dealSizeMaxUsd: null,
      sectorTags: "[]",
      state: "diligence",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    latestMemoSession: {
      sessionId: "session-1",
      fileName: "deck.pdf",
      memoJson: "{}",
      createdAt: new Date().toISOString(),
    },
  };
}

function renderReport(dealId = "deal-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/deals/${dealId}/report`]}>
        <DealReport dealId={dealId} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DealReport", () => {
  it("renders the cover, every analysis section in order, and the print toolbar", async () => {
    mockFetchDeal.mockResolvedValue(makeDealResponse("Acme Corp"));
    renderReport();

    await waitFor(() =>
      expect(screen.getByText("Acme Corp")).toBeInTheDocument()
    );
    expect(screen.getByText("Deal Analysis Report")).toBeInTheDocument();

    const titles = [
      "Executive Summary",
      "Company",
      "Market",
      "Financials",
      "Corroboration",
    ];
    for (const t of titles) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }

    for (const id of [
      "tab-summary",
      "tab-company",
      "tab-market",
      "tab-financials",
      "tab-corroboration",
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }

    // Sections appear in the intended reading order.
    const order = titles.map(t => screen.getByText(t));
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }

    expect(
      screen.getByRole("button", { name: /save as pdf/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to deal/i })
    ).toHaveAttribute("href", "/deals/deal-1/analysis");
  });

  it("invokes the browser print dialog when Save as PDF is clicked", async () => {
    mockFetchDeal.mockResolvedValue(makeDealResponse("Acme Corp"));
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    renderReport();

    const btn = await screen.findByRole("button", { name: /save as pdf/i });
    fireEvent.click(btn);
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it("shows a not-found message when the deal is inaccessible", async () => {
    mockFetchDeal.mockResolvedValue(null);
    renderReport();

    await waitFor(() =>
      expect(
        screen.getByText(/doesn't exist or isn't accessible/i)
      ).toBeInTheDocument()
    );
    expect(screen.queryByRole("button", { name: /save as pdf/i })).toBeNull();
  });
});
