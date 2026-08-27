import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router";
import { useEffect } from "react";
import NewDealWizard from "./NewDealWizard";
import { fetchDeal } from "@/api/deals";
import type { DealWithLatestMemo } from "@/api/deals";
import { fetchDealDocuments } from "@/api/documents";
import type { DealDocument } from "@/api/documents";
import { fetchIntakeLink } from "@/api/intakeLink";
import { toast } from "@/components/mvp/primitives/sonner";

// Real fetchDeal hits the network via apiFetch — mock the module's data
// function while keeping the real (pure) query-key helpers, same convention
// as DealDetail.test.tsx.
vi.mock("@/api/deals", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/deals")>();
  return { ...actual, fetchDeal: vi.fn() };
});

vi.mock("@/api/documents", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/documents")>();
  return { ...actual, fetchDealDocuments: vi.fn() };
});

vi.mock("@/api/intakeLink", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/intakeLink")>();
  return { ...actual, fetchIntakeLink: vi.fn() };
});

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "user", name: "Test User", email: "test@example.com" },
    refresh: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/mvp/primitives/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// jsdom doesn't implement Element.scrollTo — MvpAppShell calls it on every
// location change.
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** MemoryRouter has no recorded-history array — rebuild it from useLocation(). */
function LocationRecorder({ history }: { history: string[] }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (history[history.length - 1] !== pathname) history.push(pathname);
  }, [history, pathname]);
  return null;
}

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
    latestMemoSession: null,
  };
}

function makeDealDocument(overrides: Partial<DealDocument> = {}): DealDocument {
  return {
    id: "d1",
    filename: "deck.pdf",
    status: "verified",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Mirrors routes.tsx's (unexported) NewDealWizardRoute — routed through an
// actual :step? param match, not a fixed `step` prop, so a `navigate()` call
// inside NewDealWizard re-renders the component with the new step, the same
// as it does in production. A directly-rendered <NewDealWizard step="confirm" />
// would never observe that re-render, since `step` would stay a fixed prop.
function NewDealWizardRoute() {
  const params = useParams();
  return <NewDealWizard step={params.step} />;
}

function renderWizard(
  initialPath: string,
  {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }: { queryClient?: QueryClient } = {}
) {
  const history: string[] = [];
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationRecorder history={history} />
        <Routes>
          <Route path="/new-deal/:step?" element={<NewDealWizardRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...utils, queryClient, history };
}

describe("NewDealWizard — Step 3 confirm guard (attach mode)", () => {
  it("P5-09 regression: opening /new-deal/confirm?dealId=<uuid> for a deal with existing verified documents lands on Step 3 directly, with no in-session upload having occurred", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([makeDealDocument()]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(null);

    const { history } = renderWizard("/new-deal/confirm?dealId=deal-1");

    // Step 3 always renders on the very first paint regardless of the guard's
    // eventual verdict — `stepName` is driven straight off the URL, not off
    // any query's settled state. `findByTestId` alone would pass trivially on
    // that transient first render even against the buggy guard (it resolves
    // on the first matching check, before the async `fetchDeal` mock's
    // microtask — and any guard-triggered navigate() it schedules — has run).
    // Wait for the attach-mode deal fetch to actually land (the summary shows
    // the fetched deal name) before asserting anything about where the guard
    // left us — only then has the guard effect had its chance to fire too.
    await waitFor(() => expect(screen.getByText("Acme Corp")).toBeInTheDocument());

    expect(screen.getByTestId("wizard-step-3")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalledWith("Attach a primary document first");
    expect(history).not.toContain("/new-deal/upload-files");
  });

  it("fail-closed: an intake-link fetch that keeps erroring (through the retry policy) bounces to Step 2, never rendering Step 3", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([
      makeDealDocument({ id: "d1" }),
      makeDealDocument({ id: "d2" }),
    ]);
    vi.mocked(fetchIntakeLink).mockRejectedValue(new Error("network down"));

    // Real retry policy (main.tsx's), not `retry: false` — the whole point of
    // this case is that the guard must not resolve to "error" (and block)
    // until the query has actually exhausted its retries, and must not read
    // an in-flight retry as "loading forever" either.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: (failureCount: number) => failureCount < 2,
          retryDelay: (i: number) => Math.min(1000 * 2 ** i, 10_000),
        },
      },
    });

    renderWizard("/new-deal/confirm?dealId=deal-1", { queryClient });

    // The global retry policy means this needs to cover retry attempts (two
    // retries, ~1s + ~2s of backoff), not a single synchronous tick.
    await waitFor(
      () => expect(screen.queryByTestId("wizard-step-3")).not.toBeInTheDocument(),
      { timeout: 8_000 }
    );
    await waitFor(() =>
      expect(screen.getByTestId("wizard-step-2")).toBeInTheDocument()
    );
  }, 15_000);

  it("zero documents and no intake link still bounces to Step 2 (guard not merely deleted)", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(null);

    renderWizard("/new-deal/confirm?dealId=deal-1");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Attach a primary document first",
        expect.anything()
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId("wizard-step-2")).toBeInTheDocument()
    );
  });

  it("intake link 'pending' bounces even with documents attached (early-analysis block)", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([
      makeDealDocument({ id: "d1" }),
      makeDealDocument({ id: "d2" }),
    ]);
    vi.mocked(fetchIntakeLink).mockResolvedValue({
      status: "pending",
      recipientEmail: "gp@example.com",
      expiresAt: new Date().toISOString(),
      submittedAt: null,
    });

    renderWizard("/new-deal/confirm?dealId=deal-1");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Waiting on the external party",
        expect.anything()
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId("wizard-step-2")).toBeInTheDocument()
    );
  });

  it("intake link 'submitted' with one document lands on Step 3", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([makeDealDocument({ id: "d1" })]);
    vi.mocked(fetchIntakeLink).mockResolvedValue({
      status: "submitted",
      recipientEmail: "gp@example.com",
      expiresAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    });

    renderWizard("/new-deal/confirm?dealId=deal-1");

    await waitFor(() => expect(screen.getByText("Acme Corp")).toBeInTheDocument());
    expect(screen.getByTestId("wizard-step-3")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not navigate or toast while the documents query is still unresolved", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockReturnValue(new Promise(() => {})); // never resolves
    vi.mocked(fetchIntakeLink).mockResolvedValue(null);

    const { history } = renderWizard("/new-deal/confirm?dealId=deal-1");

    await waitFor(() => expect(screen.getByText("Acme Corp")).toBeInTheDocument());

    expect(screen.getByTestId("wizard-step-3")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    expect(history).not.toContain("/new-deal/upload-files");
  });
});
