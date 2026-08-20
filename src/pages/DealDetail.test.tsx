import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import DealDetail from "./DealDetail";
import { dealStatusQueryKey, fetchDeal, fetchDealStatus } from "@/api/deals";
import type { DealWithLatestMemo } from "@/api/deals";
import type { DealStatusPayload } from "@shared/dealsStatus";

// Real fetchDeal/fetchDealStatus hit the network via apiFetch — mock the
// module's two data functions while keeping the real (pure) query-key
// helpers so DealDetail's own useQuery({queryKey: dealStatusQueryKey(...)})
// calls line up with what the test drives via queryClient.refetchQueries.
vi.mock("@/api/deals", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/deals")>();
  return { ...actual, fetchDeal: vi.fn(), fetchDealStatus: vi.fn() };
});

// The Screening tab fetches its own screening result; keep the real (pure)
// screeningQueryKey so DealDetail's completion invalidation lines up, and mock
// the fetch (default: not-screened -> null) so tests don't hit a real URL.
vi.mock("@/api/screening", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/screening")>();
  return { ...actual, fetchScreening: vi.fn().mockResolvedValue(null) };
});

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "user", name: "Test User", email: "test@example.com" },
    logout: vi.fn(),
  }),
}));

const processingStatus: DealStatusPayload = {
  jobStatus: "processing",
  currentPhase: "parsing",
  steps: [],
  startedAt: new Date().toISOString(),
  endedAt: null,
  stepDurations: {},
  errorMessage: null,
  jobComments: null,
};

const completeStatus: DealStatusPayload = {
  ...processingStatus,
  jobStatus: "complete",
  endedAt: new Date().toISOString(),
};

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
    // Non-null so the "complete" branch doesn't fall into the isWaitingForMemo
    // retry loop (that guards against the memo session persisting slower
    // than the client poll — not what these tests exercise).
    latestMemoSession: {
      sessionId: "session-1",
      fileName: "deck.pdf",
      memoJson: "{}",
      createdAt: new Date().toISOString(),
    },
  };
}

function renderDealDetail(
  dealId: string,
  tab: "screening" | "analysis",
  { queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }) } = {}
) {
  const { hook, history } = memoryLocation({ path: `/deals/${dealId}/${tab}`, record: true });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <Router hook={hook}>
        <DealDetail dealId={dealId} tab={tab} />
      </Router>
    </QueryClientProvider>
  );
  return { ...utils, queryClient, history };
}

// jsdom doesn't implement Element.scrollTo — MvpAppShell calls it on every
// location change.
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DealDetail — completion interstitial", () => {
  it("shows the one-shot interstitial when the job transitions processing -> complete during the visit, and navigates to /deals/:dealId/screening on click", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealStatus)
      .mockResolvedValueOnce(processingStatus)
      .mockResolvedValue(completeStatus);

    const { queryClient, history } = renderDealDetail("deal-1", "screening");

    // Wait for the "processing" state to actually commit a render (not just
    // for fetchDealStatus to have been *called*) — otherwise the later
    // "complete" resolution can land in the same React commit as this one,
    // collapsing the undefined -> processing -> complete sequence into a
    // single undefined -> complete transition that the justCompleted effect
    // (which keys off the *previous* committed status) would never observe.
    await waitFor(() =>
      expect(screen.getByText("Analyzing your document")).toBeInTheDocument()
    );
    expect(screen.queryByText(/Analysis complete/i)).not.toBeInTheDocument();

    // Simulate the poll's processing -> complete tick without waiting on the
    // real 2s refetchInterval.
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: dealStatusQueryKey("deal-1") });
    });

    await waitFor(() =>
      expect(screen.getByText(/Analysis complete/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /View Initial Screening/i }));

    expect(history[history.length - 1]).toBe("/deals/deal-1/screening");
  });

  it("does not show the interstitial on a fresh mount that's already complete — renders the tab shell directly", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealStatus).mockResolvedValue(completeStatus);

    renderDealDetail("deal-2", "screening");

    await waitFor(() =>
      expect(
        screen.getByText(/Quick fit check against the investment mandate/i)
      ).toBeInTheDocument()
    );
    expect(screen.queryByText(/Analysis complete/i)).not.toBeInTheDocument();
  });

  it("resets completion state per-deal (regression for the key={dealId} fix): a second, already-complete deal must not inherit the first deal's interstitial", async () => {
    let deal1StatusCalls = 0;
    vi.mocked(fetchDealStatus).mockImplementation(async (dealId: string) => {
      if (dealId === "deal-a") {
        deal1StatusCalls += 1;
        return deal1StatusCalls === 1 ? processingStatus : completeStatus;
      }
      // deal-b is already complete from the very first fetch (revisit-style).
      return completeStatus;
    });
    vi.mocked(fetchDeal).mockImplementation(async (dealId: string) =>
      makeDealResponse(dealId === "deal-a" ? "Deal A" : "Deal B")
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { hook } = memoryLocation({ path: "/deals/deal-a/screening" });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Router hook={hook}>
          <DealDetail dealId="deal-a" tab="screening" />
        </Router>
      </QueryClientProvider>
    );

    // See the comment in the previous test — wait for a real "processing"
    // commit before forcing the transition, or the effect never sees an
    // intermediate "processing" previous value to key off of.
    await waitFor(() =>
      expect(screen.getByText("Analyzing your document")).toBeInTheDocument()
    );

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: dealStatusQueryKey("deal-a") });
    });

    await waitFor(() =>
      expect(screen.getByText(/Analysis complete/i)).toBeInTheDocument()
    );

    // Re-render the SAME root with a different dealId — mirrors a route param
    // change without an intervening full unmount (what the key={dealId} fix
    // guards against; without it, `justCompleted` would leak from deal-a
    // into deal-b's still-mounted DealDetailInner instance).
    rerender(
      <QueryClientProvider client={queryClient}>
        <Router hook={hook}>
          <DealDetail dealId="deal-b" tab="screening" />
        </Router>
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Quick fit check against the investment mandate/i)
      ).toBeInTheDocument()
    );
    expect(screen.queryByText(/Analysis complete/i)).not.toBeInTheDocument();
  });
});
