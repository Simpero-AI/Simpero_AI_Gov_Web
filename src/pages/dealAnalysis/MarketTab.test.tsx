import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarketTab } from "./MarketTab";
import { fetchMarket, type MarketView } from "@/api/market";

// MarketTab fetches GET /deals/{id}/market via react-query — mock the client so
// the tab renders against controlled data with no real network call.
vi.mock("@/api/market", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/market")>();
  return { ...actual, fetchMarket: vi.fn() };
});

const mockFetchMarket = vi.mocked(fetchMarket);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderMarketTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MarketTab dealId="deal-1" />
    </QueryClientProvider>
  );
}

const EMPTY: MarketView = { sizing: [], marketDefinition: [], competitivePosition: [] };

describe("MarketTab", () => {
  it("renders an honest empty-state for every section when the deal has no market claims", async () => {
    mockFetchMarket.mockResolvedValue(EMPTY);
    renderMarketTab();

    expect(await screen.findByText("Market sizing not available")).toBeInTheDocument();
    expect(screen.getByText("Market definition not available")).toBeInTheDocument();
    expect(screen.getByText("Competitive position not available")).toBeInTheDocument();
  });

  it("renders extracted sizing, market-definition and competitive-position facts with status", async () => {
    mockFetchMarket.mockResolvedValue({
      sizing: [
        { label: "TAM", value: "$5.00B", citation: "cim.pdf · p.12", status: "verified", entity: null },
        { label: "SOM", value: "$400.00M", citation: "cim.pdf · p.13", status: "cited", entity: null },
      ],
      marketDefinition: [
        {
          label: "UK student housing market",
          value: "The UK student housing market is highly fragmented.",
          citation: "cim.pdf · p.8",
          status: "verified",
          entity: "UK student housing market",
        },
      ],
      competitivePosition: [
        {
          label: "AcmeCo",
          value: "Holds the leading position in three of four regions.",
          citation: "cim.pdf · p.9",
          status: "cited",
          entity: "AcmeCo",
        },
      ],
    });
    renderMarketTab();

    expect(await screen.findByText("$5.00B")).toBeInTheDocument();
    expect(screen.getByText("$400.00M")).toBeInTheDocument();
    expect(screen.getByText("The UK student housing market is highly fragmented.")).toBeInTheDocument();
    expect(screen.getByText("Holds the leading position in three of four regions.")).toBeInTheDocument();
    // Trust status is surfaced, and the citation string is shown.
    expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cited").length).toBeGreaterThan(0);
    expect(screen.getByText("cim.pdf · p.12")).toBeInTheDocument();

    expect(screen.queryByText("Market sizing not available")).not.toBeInTheDocument();
    expect(screen.queryByText("Competitive position not available")).not.toBeInTheDocument();
  });

  it("shows an error state when the market fetch fails", async () => {
    mockFetchMarket.mockRejectedValue(new Error("boom"));
    renderMarketTab();

    expect(await screen.findByText("Couldn't load market data for this deal.")).toBeInTheDocument();
  });
});
