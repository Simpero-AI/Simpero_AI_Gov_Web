import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { useEffect } from "react";
import DealDetail, { nextDealStatusPollMs, useTabFromUrl } from "./DealDetail";
import { dealStatusQueryKey, fetchDeal, fetchDealStatus } from "@/api/deals";
import type { DealWithLatestMemo } from "@/api/deals";
import { screeningMaterialsQueryKey } from "@/api/screeningMaterials";
import { screeningInsightsQueryKey } from "@/api/screeningInsights";
import { companySynthesisQueryKey } from "@/api/companySynthesis";
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

// Spy on router navigation so the completion redirect is asserted directly
// (the analysis tab shell needs fuller memo data than these fixtures provide, so
// observing the redirect via a real URL change would crash on render instead).
const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock("react-router", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => navigateSpy };
});

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

/** The real production shape: the pipeline ends at screening and no stage
 * produces a memo yet, so latestMemoSession is null on every finished deal.
 * This is the path the memo-wait used to hang on ("retrieving your memo"
 * forever). */
function makeDealResponseNoMemo(name: string): DealWithLatestMemo {
  return { ...makeDealResponse(name), latestMemoSession: null };
}

/** MemoryRouter has no recorded-history array (wouter's `memoryLocation({record:true})`
 * did), so this probe rebuilds the same thing from `useLocation()`. */
function LocationRecorder({ history }: { history: string[] }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (history[history.length - 1] !== pathname) history.push(pathname);
  }, [history, pathname]);
  return null;
}

function renderDealDetail(
  dealId: string,
  tab: "screening" | "analysis",
  { queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }) } = {}
) {
  const history: string[] = [];
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/deals/${dealId}/${tab}`]}>
        <LocationRecorder history={history} />
        <DealDetail dealId={dealId} tab={tab} />
      </MemoryRouter>
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

describe("nextDealStatusPollMs — keeps polling through the screening stage", () => {
  it("keeps polling while jobStatus is processing at currentPhase 'governance' (screening still running)", () => {
    // Regression: the screening stage reports current_phase='governance' while
    // still queued/in-progress (jobStatus='processing'). An earlier version
    // stopped polling here, so the client never saw the processing→complete tick
    // and the post-analysis redirect never fired. It must keep polling.
    expect(
      nextDealStatusPollMs({ ...processingStatus, currentPhase: "governance" })
    ).toBe(2000);
  });

  it("keeps polling a plain processing/queued status", () => {
    expect(nextDealStatusPollMs(processingStatus)).toBe(2000);
    expect(nextDealStatusPollMs({ ...processingStatus, jobStatus: "queued" })).toBe(2000);
  });

  it("stops on a terminal jobStatus (complete/error/no_job) regardless of phase", () => {
    expect(nextDealStatusPollMs(completeStatus)).toBe(false);
    expect(
      nextDealStatusPollMs({ ...completeStatus, jobStatus: "error" })
    ).toBe(false);
    expect(
      nextDealStatusPollMs({ ...completeStatus, jobStatus: "no_job" })
    ).toBe(false);
  });

  it("stops when there is no data yet (undefined)", () => {
    expect(nextDealStatusPollMs(undefined)).toBe(false);
  });
});

describe("useTabFromUrl — invalid ?tab= (FE-15)", () => {
  function renderTabHook(initialPath: string) {
    return renderHook(() => useTabFromUrl(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="*" element={<>{children}</>} />
          </Routes>
        </MemoryRouter>
      ),
    });
  }

  it("returns a redirect target for an unrecognized ?tab= instead of silently rendering it with the bad value left in the URL", () => {
    // AnalysisTabs renders <Navigate to={redirectTo} replace /> for this --
    // a single synchronous redirect (PR #42 review), not a useEffect calling
    // navigate() (which this file's global useNavigate mock, navigateSpy,
    // would swallow as a no-op anyway).
    const { result } = renderTabHook("/deals/deal-1/analysis?tab=captable");
    expect(result.current[0]).toBe("summary");
    expect(result.current[2]).toBe("/deals/deal-1/analysis?tab=summary");
  });

  it("leaves a valid ?tab= alone, with no redirect", () => {
    const { result } = renderTabHook("/deals/deal-1/analysis?tab=cap-table");
    expect(result.current[0]).toBe("cap-table");
    expect(result.current[2]).toBeNull();
  });

  it("defaults a missing ?tab= to summary without a redirect (no bad value to correct)", () => {
    const { result } = renderTabHook("/deals/deal-1/analysis");
    expect(result.current[0]).toBe("summary");
    expect(result.current[2]).toBeNull();
  });
});

describe("DealDetail — completion routes to Initial Screening", () => {
  it("navigates straight to /deals/:dealId/screening the instant the job completes during the visit — no interstitial, no button", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealStatus)
      .mockResolvedValueOnce(processingStatus)
      .mockResolvedValue(completeStatus);

    const { queryClient } = renderDealDetail("deal-1", "screening");

    // Wait for the "processing" state to actually commit a render — otherwise the
    // later "complete" resolution can land in the same React commit, collapsing
    // undefined -> processing -> complete into a single transition the completion
    // effect (which keys off the *previous* committed status) never observes.
    await waitFor(() =>
      expect(screen.getByText("Analyzing your document")).toBeInTheDocument()
    );

    // Simulate the poll's processing -> complete tick.
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: dealStatusQueryKey("deal-1") });
    });

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith("/deals/deal-1/screening", { replace: true })
    );
    expect(screen.queryByText(/Analysis complete/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /View Initial Screening/i })
    ).not.toBeInTheDocument();
  });

  it("redirects a post-upload landing (?from=upload) to screening even when the deal is already complete on arrival (no transition to observe)", async () => {
    // The fast-pipeline / first-poll-already-complete case: the upload flow lands
    // on /analysis?from=upload with the job already done, so there is no
    // processing→complete transition. The upload flag makes the redirect fire
    // anyway. Rendered at the screening tab so the analysis shell (which needs
    // fuller memo data than the fixture provides) doesn't crash the probe.
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponseNoMemo("Acme Corp"));
    vi.mocked(fetchDealStatus).mockResolvedValue(completeStatus);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/deals/deal-5/screening?from=upload"]}>
          <DealDetail dealId="deal-5" tab="screening" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith("/deals/deal-5/screening", { replace: true })
    );
  });

  it("does NOT redirect a deliberate revisit to an already-complete deal (no upload flag, no transition)", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponseNoMemo("Acme Corp"));
    vi.mocked(fetchDealStatus).mockResolvedValue(completeStatus);

    renderDealDetail("deal-6", "screening");

    await waitFor(() =>
      expect(
        screen.getByText(/Quick fit check against the investment mandate/i)
      ).toBeInTheDocument()
    );
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("invalidates the extracted-figures + insights queries on completion, not just the verdict", async () => {
    // The Screening tab's ExtractedGrid/Highlights/RiskFlags read their OWN queries
    // (materials + insights), not screeningQueryKey. If completion invalidates only
    // the verdict, those panels keep pre-pipeline data until a manual reload -- the
    // stale-data bug this guards against.
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealStatus)
      .mockResolvedValueOnce(processingStatus)
      .mockResolvedValue(completeStatus);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderDealDetail("deal-1", "screening", { queryClient });

    await waitFor(() =>
      expect(screen.getByText("Analyzing your document")).toBeInTheDocument()
    );
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: dealStatusQueryKey("deal-1") });
    });

    // The completion effect invalidates the extracted-figures + insights queries.
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: screeningMaterialsQueryKey("deal-1"),
      })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: screeningInsightsQueryKey("deal-1"),
    });
    // The grounded synthesis snapshot is (re)written by the same pipeline and now
    // backs the Market tab's Market Risks / Growth Strategy (and the Company/Summary
    // tabs); completion must invalidate it too so a parked tab picks up the fresh
    // AI summary rather than the pre-analysis snapshot.
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: companySynthesisQueryKey("deal-1"),
    });
  });

  it("re-invalidates the pipeline-derived queries on a SECOND completion (re-analysis) without redirecting a second time", async () => {
    // Bug guard: the one-shot redirectedRef used to gate the ENTIRE completion
    // block, so a second queued/processing → complete transition in the same
    // session (a re-analysis of an already-complete deal) skipped EVERY query
    // invalidation -- a user parked on Market/Company/Financials/Corroboration
    // kept seeing pre-rerun data until an unrelated refetch (window-focus) fired.
    // Invalidation must run on every genuine transition; only the redirect to
    // screening stays one-shot (we don't yank the user back on a re-run).
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    // Drive status through processing → complete → processing → complete via a
    // controlled variable rather than a mockResolvedValueOnce chain: the status
    // query polls on a 2s refetchInterval while processing, so a stray poll must
    // never consume a one-shot value out of order and desync the sequence.
    let currentStatus: DealStatusPayload = processingStatus;
    vi.mocked(fetchDealStatus).mockImplementation(async () => currentStatus);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderDealDetail("deal-1", "screening", { queryClient });

    await waitFor(() =>
      expect(screen.getByText("Analyzing your document")).toBeInTheDocument()
    );

    // First completion: processing → complete. Redirect fires once, queries invalidate.
    currentStatus = completeStatus;
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: dealStatusQueryKey("deal-1") });
    });
    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith("/deals/deal-1/screening", { replace: true })
    );
    expect(navigateSpy).toHaveBeenCalledTimes(1);

    // Re-analysis begins: complete → processing (the progress view returns).
    invalidateSpy.mockClear();
    currentStatus = processingStatus;
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: dealStatusQueryKey("deal-1") });
    });
    await waitFor(() =>
      expect(screen.getByText("Analyzing your document")).toBeInTheDocument()
    );

    // Second completion: processing → complete again.
    currentStatus = completeStatus;
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: dealStatusQueryKey("deal-1") });
    });

    // The whole invalidation batch fires AGAIN on the second transition...
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: screeningMaterialsQueryKey("deal-1"),
      })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: screeningInsightsQueryKey("deal-1"),
    });
    // ...but the redirect stays one-shot: no second yank back to screening.
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it("routes to screening on completion even when the completed deal has no memo (no 'retrieving your memo' hang)", async () => {
    // Regression for the staging hang: no pipeline stage produces a memo, so
    // latestMemoSession is null. The old memo-wait blocked the completed view on
    // an exponential-backoff spinner for ~13 min. Completion must route to
    // screening regardless.
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponseNoMemo("Acme Corp"));
    vi.mocked(fetchDealStatus)
      .mockResolvedValueOnce(processingStatus)
      .mockResolvedValue(completeStatus);

    const { queryClient } = renderDealDetail("deal-3", "screening");

    await waitFor(() =>
      expect(screen.getByText("Analyzing your document")).toBeInTheDocument()
    );

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: dealStatusQueryKey("deal-3") });
    });

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith("/deals/deal-3/screening", { replace: true })
    );
    expect(screen.queryByText(/retrieving your memo/i)).not.toBeInTheDocument();
  });

  it("renders the screening tab directly (no memo-wait spinner) on a fresh visit to an already-complete deal with no memo", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponseNoMemo("Acme Corp"));
    vi.mocked(fetchDealStatus).mockResolvedValue(completeStatus);

    renderDealDetail("deal-4", "screening");

    await waitFor(() =>
      expect(
        screen.getByText(/Quick fit check against the investment mandate/i)
      ).toBeInTheDocument()
    );
    expect(screen.queryByText(/retrieving your memo/i)).not.toBeInTheDocument();
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
});
