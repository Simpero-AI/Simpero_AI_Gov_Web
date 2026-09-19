import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CapTableTab } from "./CapTableTab";
import { fetchDealTerms, dealTermsQueryKey, type DealTermsView } from "@/api/dealTerms";

// CapTableTab fetches GET /deals/{id}/deal-terms via react-query — mock the
// client so the tab renders against controlled data with no real network call.
vi.mock("@/api/dealTerms", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/dealTerms")>();
  return { ...actual, fetchDealTerms: vi.fn() };
});

const mockFetchDealTerms = vi.mocked(fetchDealTerms);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCapTableTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CapTableTab dealId="deal-1" />
    </QueryClientProvider>
  );
}

const EMPTY: DealTermsView = { terms: [] };

describe("CapTableTab", () => {
  it("renders an honest empty-state for Key Deal Terms when the deal has no term claims", async () => {
    mockFetchDealTerms.mockResolvedValue(EMPTY);
    renderCapTableTab();

    expect(await screen.findByText("Deal terms not available")).toBeInTheDocument();
    // Cap table + exit waterfall are pipeline gaps, always the honest coming-soon state.
    expect(screen.getByText("Cap table coming soon")).toBeInTheDocument();
    expect(screen.getByText("Exit waterfall coming soon")).toBeInTheDocument();
  });

  it("renders extracted deal terms with their value, status and citation", async () => {
    mockFetchDealTerms.mockResolvedValue({
      terms: [
        {
          label: "Pre-Money Valuation",
          value: "$40.00M",
          citation: "termsheet.pdf · p.3",
          status: "verified",
          entity: "AcmeCo",
          sourceUrl: null,
        },
        {
          label: "Ownership Stake",
          value: "16.7%",
          citation: "termsheet.pdf · p.3",
          status: "cited",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
    });
    renderCapTableTab();

    expect(await screen.findByText("$40.00M")).toBeInTheDocument();
    expect(screen.getByText("16.7%")).toBeInTheDocument();
    expect(screen.getByText("Pre-Money Valuation")).toBeInTheDocument();
    expect(screen.getByText("Ownership Stake")).toBeInTheDocument();
    // Trust status is surfaced, and the citation string is shown.
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Cited")).toBeInTheDocument();
    expect(screen.getAllByText("termsheet.pdf · p.3").length).toBe(2);

    expect(screen.queryByText("Deal terms not available")).not.toBeInTheDocument();
  });

  it("renders a web sourceUrl as a link and a deck citation as plain text", async () => {
    mockFetchDealTerms.mockResolvedValue({
      terms: [
        {
          label: "Investment Amount",
          value: "$10.00M",
          citation: "example.com",
          status: "cited",
          entity: "AcmeCo",
          sourceUrl: "https://example.com/round",
        },
        {
          label: "Pre-Money Valuation",
          value: "$40.00M",
          citation: "termsheet.pdf · p.3",
          status: "verified",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
    });
    renderCapTableTab();

    const link = await screen.findByRole("link", { name: "example.com" });
    expect(link).toHaveAttribute("href", "https://example.com/round");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // The deck-sourced fact stays plain text — not wrapped in an anchor.
    const deckCitation = screen.getByText("termsheet.pdf · p.3");
    expect(deckCitation.closest("a")).toBeNull();
  });

  it("never fabricates cap-table or exit-waterfall rows, even when deal terms are present", async () => {
    mockFetchDealTerms.mockResolvedValue({
      terms: [
        {
          label: "Pre-Money Valuation",
          value: "$40.00M",
          citation: null,
          status: "verified",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
    });
    renderCapTableTab();

    await screen.findByText("$40.00M");
    // Both remain honest coming-soon gaps — no per-holder rows, no proceeds table.
    expect(screen.getByText("Cap table coming soon")).toBeInTheDocument();
    expect(screen.getByText("Exit waterfall coming soon")).toBeInTheDocument();
    expect(screen.getByText(/liquidation preference and seniority/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows a loading state, not a false empty-state, while the fetch is pending", () => {
    // A never-resolving fetch keeps the query pending. The tab must render its
    // loading state and NOT the definitive "not available" negative, which would
    // otherwise flash on a term-rich deal before its figures arrive.
    mockFetchDealTerms.mockReturnValue(new Promise<DealTermsView>(() => {}));
    renderCapTableTab();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Deal terms not available")).not.toBeInTheDocument();
  });

  it("shows an error state when the deal-terms fetch fails", async () => {
    mockFetchDealTerms.mockRejectedValue(new Error("boom"));
    renderCapTableTab();

    expect(await screen.findByText("Couldn't load deal terms for this deal.")).toBeInTheDocument();
  });

  it("treats a 404 (null view) as neutral 'unavailable', not the confident 'nothing extracted'", async () => {
    // fetchDealTerms maps a 404 to null. A 404 is NOT proof the pipeline ran and
    // extracted nothing -- it's also what a route-not-found returns if the web is
    // deployed ahead of the backend -- so the tab must show a neutral "not
    // available yet" state, never the "no deal terms were extracted" negative.
    mockFetchDealTerms.mockResolvedValue(null);
    renderCapTableTab();

    expect(await screen.findByText("Deal terms aren't available yet")).toBeInTheDocument();
    expect(screen.queryByText("Deal terms not available")).not.toBeInTheDocument();
  });

  it("keeps the last figures under a stale notice when a refetch fails", async () => {
    // react-query keeps cached `data` across a failed refetch (and still reports
    // isError), so a transient refresh failure after figures have loaded -- e.g.
    // right after a re-analysis invalidates the query -- must keep the figures
    // under a stale notice, never blank them or swap in the error alert.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchDealTerms.mockResolvedValueOnce({
      terms: [
        {
          label: "Pre-Money Valuation",
          value: "$40.00M",
          citation: null,
          status: "verified",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CapTableTab dealId="deal-1" />
      </QueryClientProvider>
    );
    expect(await screen.findByText("$40.00M")).toBeInTheDocument();

    mockFetchDealTerms.mockRejectedValue(new Error("refetch boom"));
    await queryClient.refetchQueries({ queryKey: dealTermsQueryKey("deal-1") });

    await waitFor(() =>
      expect(screen.getByText(/Showing the last loaded deal terms/)).toBeInTheDocument()
    );
    expect(screen.getByText("$40.00M")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load deal terms for this deal.")).not.toBeInTheDocument();
  });
});
