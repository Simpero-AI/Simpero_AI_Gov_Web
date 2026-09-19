import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarketTab } from "./MarketTab";
import { fetchMarket, marketQueryKey, type MarketView } from "@/api/market";
import {
  fetchCompanySynthesis,
  companySynthesisQueryKey,
  type CompanySynthesis,
} from "@/api/companySynthesis";

// MarketTab fetches GET /deals/{id}/market via react-query — mock the client so
// the tab renders against controlled data with no real network call.
vi.mock("@/api/market", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/market")>();
  return { ...actual, fetchMarket: vi.fn() };
});

// Market Risks / Growth Strategy are backed by the grounded synthesis pass (shared
// with the Company/Summary tabs). Mock it too so tests don't hit the network; it
// defaults to an empty snapshot (below), which every existing market-claims test
// relies on to keep those two sections in their honest no-evidence state.
vi.mock("@/api/companySynthesis", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/companySynthesis")>();
  return { ...actual, fetchCompanySynthesis: vi.fn() };
});

const mockFetchMarket = vi.mocked(fetchMarket);
const mockFetchCompanySynthesis = vi.mocked(fetchCompanySynthesis);

beforeEach(() => {
  // Default: no grounded market synthesis -> Market Risks / Growth Strategy fall to
  // their no-evidence state. Individual tests override for the grounded case.
  mockFetchCompanySynthesis.mockResolvedValue({ sections: [] });
});

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
        { label: "TAM", value: "$5.00B", citation: "cim.pdf · p.12", status: "verified", entity: null, sourceUrl: null },
        { label: "SOM", value: "$400.00M", citation: "cim.pdf · p.13", status: "cited", entity: null, sourceUrl: null },
      ],
      marketDefinition: [
        {
          label: "UK student housing market",
          value: "The UK student housing market is highly fragmented.",
          citation: "cim.pdf · p.8",
          status: "verified",
          entity: "UK student housing market",
          sourceUrl: null,
        },
      ],
      competitivePosition: [
        {
          label: "AcmeCo",
          value: "Holds the leading position in three of four regions.",
          citation: "cim.pdf · p.9",
          status: "cited",
          entity: "AcmeCo",
          sourceUrl: null,
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

  it("renders a web sourceUrl as a link and a deck citation as plain text", async () => {
    // A fact with a valid http(s) sourceUrl renders a hostname link (new tab,
    // noopener), mirroring the Financials tab; a deck-sourced fact with no URL
    // keeps its plain citation text and is never an anchor.
    mockFetchMarket.mockResolvedValue({
      sizing: [
        {
          label: "TAM",
          value: "$5.00B",
          citation: "example.com",
          status: "cited",
          entity: null,
          sourceUrl: "https://example.com/x",
        },
        {
          label: "SOM",
          value: "$400.00M",
          citation: "deck.pdf · p.3",
          status: "cited",
          entity: null,
          sourceUrl: null,
        },
      ],
      marketDefinition: [],
      competitivePosition: [],
    });
    renderMarketTab();

    const link = await screen.findByRole("link", { name: "example.com" });
    expect(link).toHaveAttribute("href", "https://example.com/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // The deck-sourced fact stays plain text — not wrapped in an anchor.
    const deckCitation = screen.getByText("deck.pdf · p.3");
    expect(deckCitation.closest("a")).toBeNull();
  });

  it("renders a non-acronym sizing label with a null citation cleanly (no blank/doubled caption)", async () => {
    // "Market Size" / "Market Growth (CAGR)" aren't in SIZING_DESC, so they have
    // no caption description. With a null citation the card still renders value +
    // status; with a citation it renders exactly once (below the line, never
    // doubled into the caption).
    mockFetchMarket.mockResolvedValue({
      sizing: [
        { label: "Market Size", value: "$1.20B", citation: null, status: "verified", entity: null, sourceUrl: null },
        { label: "Market Growth (CAGR)", value: "8%", citation: "cim.pdf · p.5", status: "cited", entity: null, sourceUrl: null },
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
          sourceUrl: null,
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
      sizing: [{ label: "TAM", value: "$5.00B", citation: null, status: "verified", entity: null, sourceUrl: null }],
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

  it("renders the uniform no-evidence state for the not-yet-sourced sections", async () => {
    // A mockup section with no claims source keeps its eyebrow but shows the
    // shared "No evidence found" body, never a per-box "coming soon" placeholder.
    mockFetchMarket.mockResolvedValue(EMPTY);
    renderMarketTab();

    await screen.findByText("Market sizing not available");
    // Growth Drivers + Competitive Positioning Matrix are permanently unbacked;
    // Market Risks + Growth Strategy fall here too once the (empty) synthesis
    // snapshot loads -- so four in total. waitFor covers the brief window where the
    // two synthesis sections still show their loader.
    await waitFor(() => expect(screen.getAllByText("No evidence found")).toHaveLength(4));
    expect(
      screen.getAllByText("Nothing on this was found in the deal's materials or public sources.").length
    ).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText("Growth drivers coming soon")).not.toBeInTheDocument();
    expect(screen.queryByText("Market risks coming soon")).not.toBeInTheDocument();
    expect(screen.queryByText("Positioning matrix coming soon")).not.toBeInTheDocument();
    expect(screen.queryByText("Growth strategy coming soon")).not.toBeInTheDocument();
  });

  it("backs Market Risks and Growth Strategy with grounded synthesis points", async () => {
    // The two sections the claims spine has no producer for are filled by the
    // grounded synthesis pass (keyed market_risks / market_growth_strategy), shown
    // as the labelled, cited AI summary -- not a fabricated or claims-borrowed stand-in.
    mockFetchMarket.mockResolvedValue(EMPTY);
    const synthesis: CompanySynthesis = {
      sections: [
        {
          key: "market_risks",
          title: "Market Risks",
          points: [
            {
              text: "Intensifying competition from low-cost entrants could compress margins.",
              citation: "cim.pdf · p.20",
            },
          ],
          people: [],
        },
        {
          key: "market_growth_strategy",
          title: "Growth Strategy",
          points: [
            {
              text: "Plans to expand into two new European geographies by 2027.",
              citation: "cim.pdf · p.24",
            },
          ],
          people: [],
        },
      ],
    };
    mockFetchCompanySynthesis.mockResolvedValue(synthesis);
    renderMarketTab();

    expect(
      await screen.findByText("Intensifying competition from low-cost entrants could compress margins.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Plans to expand into two new European geographies by 2027.")
    ).toBeInTheDocument();
    // Each synthesized section carries the AI-summary provenance label and its citation.
    expect(screen.getAllByText(/AI summary/)).toHaveLength(2);
    expect(screen.getByText("cim.pdf · p.20")).toBeInTheDocument();
    expect(screen.getByText("cim.pdf · p.24")).toBeInTheDocument();
    // Only the two still-unbacked sections (Growth Drivers, Positioning Matrix) keep
    // the no-evidence state; the synthesized ones no longer show it.
    expect(screen.getAllByText("No evidence found")).toHaveLength(2);
  });

  it("shows a per-section loader while the synthesis snapshot is still loading", async () => {
    // Market claims resolve but synthesis is still in flight: the two synthesis
    // sections must show their own loader, never a premature "No evidence found".
    mockFetchMarket.mockResolvedValue(EMPTY);
    mockFetchCompanySynthesis.mockReturnValue(new Promise<CompanySynthesis>(() => {}));
    renderMarketTab();

    await screen.findByText("Market sizing not available");
    expect(screen.getAllByText("Loading…")).toHaveLength(2);
  });

  it("shows a neutral note in the synthesis sections when the synthesis fetch fails", async () => {
    // A failed synthesis load must not read as "nothing found" -- the two sections
    // show a neutral couldn't-load note while the market-claims sections are untouched.
    mockFetchMarket.mockResolvedValue(EMPTY);
    mockFetchCompanySynthesis.mockRejectedValue(new Error("synthesis boom"));
    renderMarketTab();

    await screen.findByText("Market sizing not available");
    await waitFor(() =>
      expect(screen.getAllByText("Couldn't load this section right now.")).toHaveLength(2)
    );
    expect(screen.queryByText("Couldn't load market data for this deal.")).not.toBeInTheDocument();
  });

  it("keeps grounded synthesis points visible when a synthesis refetch fails", async () => {
    // react-query keeps cached `data` across a failed refetch (and still reports
    // isError), so a transient refresh failure after synthesis loaded -- e.g. right
    // after a re-analysis invalidates the key -- must keep the points visible, never
    // blank them or swap in the section's error note. This pins synthError's guard
    // (isError && data === undefined): a failed refetch-over-cache is NOT that case.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchMarket.mockResolvedValue(EMPTY);
    mockFetchCompanySynthesis.mockResolvedValueOnce({
      sections: [
        {
          key: "market_risks",
          title: "Market Risks",
          points: [
            { text: "Regulatory tightening could raise compliance costs.", citation: "cim.pdf · p.30" },
          ],
          people: [],
        },
      ],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MarketTab dealId="deal-1" />
      </QueryClientProvider>
    );
    expect(
      await screen.findByText("Regulatory tightening could raise compliance costs.")
    ).toBeInTheDocument();

    mockFetchCompanySynthesis.mockRejectedValue(new Error("refetch boom"));
    await queryClient.refetchQueries({ queryKey: companySynthesisQueryKey("deal-1") });

    // The cached point stays; the error note never appears.
    expect(
      screen.getByText("Regulatory tightening could raise compliance costs.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Couldn't load this section right now.")
    ).not.toBeInTheDocument();
  });
});
