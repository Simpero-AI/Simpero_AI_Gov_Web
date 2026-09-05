import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarketTab } from "./MarketTab";
import { fetchMarket, marketQueryKey, type MarketView } from "@/api/market";

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

  it("renders a non-acronym sizing label with a null citation cleanly (no blank/doubled caption)", async () => {
    // "Market Size" / "Market Growth (CAGR)" aren't in SIZING_DESC, so they have
    // no caption description. With a null citation the card still renders value +
    // status; with a citation it renders exactly once (below the line, never
    // doubled into the caption).
    mockFetchMarket.mockResolvedValue({
      sizing: [
        { label: "Market Size", value: "$1.20B", citation: null, status: "verified", entity: null },
        { label: "Market Growth (CAGR)", value: "8%", citation: "cim.pdf · p.5", status: "cited", entity: null },
      ],
      marketDefinition: [],
      competitivePosition: [],
    });
    renderMarketTab();

    expect(await screen.findByText("$1.20B")).toBeInTheDocument();
    expect(screen.getByText("8%")).toBeInTheDocument();
    expect(screen.getAllByText("cim.pdf · p.5")).toHaveLength(1);
  });

  it("shows a loading state, not a false empty-state, while the fetch is pending", () => {
    // A never-resolving fetch keeps the query pending. The tab must render its
    // loading state and NOT the definitive "not available" negatives, which
    // would otherwise flash on a claim-rich deal before its figures arrive.
    mockFetchMarket.mockReturnValue(new Promise<MarketView>(() => {}));
    renderMarketTab();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Market sizing not available")).not.toBeInTheDocument();
  });

  it("shows an error state when the market fetch fails", async () => {
    mockFetchMarket.mockRejectedValue(new Error("boom"));
    renderMarketTab();

    expect(await screen.findByText("Couldn't load market data for this deal.")).toBeInTheDocument();
  });

  it("renders the backend fallback label for a qualitative fact with no named entity", async () => {
    // A qualitative assertion with no entity carries the backend's class fallback in
    // `label` ("The market" / "Competitor"); the row header must show it, not the
    // raw null entity as a bare em-dash.
    mockFetchMarket.mockResolvedValue({
      sizing: [],
      marketDefinition: [
        {
          label: "The market",
          value: "The market is highly fragmented.",
          citation: null,
          status: "verified",
          entity: null,
        },
      ],
      competitivePosition: [],
    });
    renderMarketTab();

    expect(await screen.findByText("The market is highly fragmented.")).toBeInTheDocument();
    expect(screen.getByText("The market")).toBeInTheDocument();
  });

  it("treats a 404 (null view) as neutral 'unavailable', not the confident 'nothing extracted'", async () => {
    // fetchMarket maps a 404 to null. A 404 is NOT proof the pipeline ran and
    // extracted nothing -- it's also what a route-not-found returns if the web is
    // deployed ahead of the backend -- so the tab must show a neutral "not
    // available yet" state, never the per-section "no ... figures were extracted"
    // negatives (which would be a false claim), and never a "deleted deal" prompt.
    mockFetchMarket.mockResolvedValue(null);
    renderMarketTab();

    expect(await screen.findByText("Market data isn't available yet")).toBeInTheDocument();
    expect(screen.queryByText("Market sizing not available")).not.toBeInTheDocument();
    expect(screen.queryByText("This deal is no longer available")).not.toBeInTheDocument();
  });

  it("keeps the last figures under a stale notice when a refetch fails", async () => {
    // react-query keeps cached `data` across a failed refetch (and still reports
    // isError), so a transient refresh failure after figures have loaded -- e.g.
    // right after a re-analysis invalidates the query -- must keep the figures under
    // a stale notice, never blank them or swap in the error alert (reserved for a
    // first load with nothing cached).
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchMarket.mockResolvedValueOnce({
      sizing: [{ label: "TAM", value: "$5.00B", citation: null, status: "verified", entity: null }],
      marketDefinition: [],
      competitivePosition: [],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MarketTab dealId="deal-1" />
      </QueryClientProvider>
    );
    expect(await screen.findByText("$5.00B")).toBeInTheDocument();

    mockFetchMarket.mockRejectedValue(new Error("refetch boom"));
    await queryClient.refetchQueries({ queryKey: marketQueryKey("deal-1") });

    await waitFor(() =>
      expect(screen.getByText(/Showing the last loaded market data/)).toBeInTheDocument()
    );
    expect(screen.getByText("$5.00B")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load market data for this deal.")).not.toBeInTheDocument();
  });
});
