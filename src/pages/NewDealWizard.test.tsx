import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from "react-router";
import { useEffect } from "react";
import NewDealWizard from "./NewDealWizard";
import { createDeal, fetchDeal } from "@/api/deals";
import type { DealWithLatestMemo } from "@/api/deals";
import { fetchDealDocuments } from "@/api/documents";
import type { DealDocument } from "@/api/documents";
import { IntakeApiError, createIntakeLink, fetchIntakeLink, revokeIntakeLink } from "@/api/intakeLink";
import type { IntakeLink } from "@/api/intakeLink";
import { toast } from "@/components/mvp/primitives/sonner";
import fs from "node:fs";
import path from "node:path";

// Real fetchDeal hits the network via apiFetch — mock the module's data
// function while keeping the real (pure) query-key helpers, same convention
// as DealDetail.test.tsx.
vi.mock("@/api/deals", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/deals")>();
  return { ...actual, fetchDeal: vi.fn(), createDeal: vi.fn() };
});

vi.mock("@/api/documents", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/documents")>();
  return { ...actual, fetchDealDocuments: vi.fn() };
});

vi.mock("@/api/intakeLink", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/intakeLink")>();
  return {
    ...actual,
    fetchIntakeLink: vi.fn(),
    createIntakeLink: vi.fn(),
    revokeIntakeLink: vi.fn(),
  };
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

function makePendingIntakeLink(overrides: Partial<IntakeLink> = {}): IntakeLink {
  return {
    status: "pending",
    recipientEmail: "gp@example.com",
    expiresAt: new Date().toISOString(),
    submittedAt: null,
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

describe("NewDealWizard — reissue intake link (F10)", () => {
  function renderReissuable() {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]); // no verified docs -> reissue prompt shows
    vi.mocked(fetchIntakeLink).mockResolvedValue({
      status: "submitted",
      recipientEmail: "gp@example.com",
      expiresAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    });
    return renderWizard("/new-deal/confirm?dealId=deal-1");
  }

  it("409 (a link already active, raced by another tab or a just-landed submission) surfaces a distinct message", async () => {
    vi.mocked(createIntakeLink).mockRejectedValue(
      new IntakeApiError(409, "An active intake link already exists for this deal")
    );
    renderReissuable();

    await waitFor(() => expect(screen.getByTestId("wizard-reissue-link")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("wizard-reissue-link"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "A link is already active for this deal",
        expect.anything()
      )
    );
  });

  it("a non-409 failure shows the generic message", async () => {
    vi.mocked(createIntakeLink).mockRejectedValue(new Error("network down"));
    renderReissuable();

    await waitFor(() => expect(screen.getByTestId("wizard-reissue-link")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("wizard-reissue-link"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Could not generate a new link",
        expect.objectContaining({ description: "network down" })
      )
    );
  });
});

describe("NewDealWizard — Step 1 external collection checkbox (P5-01)", () => {
  it("AC: checkbox unchecked (default) — createDeal called with an identical body, createIntakeLink not called, navigates to upload-files", async () => {
    vi.mocked(createDeal).mockResolvedValue({ id: "deal-1" });
    // Explicit, not relying on a leftover mock value from a prior test:
    // this test reaches Step 2's render, which reads fetchIntakeLink.
    vi.mocked(fetchIntakeLink).mockResolvedValue(null);
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);

    const { history } = renderWizard("/new-deal");

    fireEvent.change(screen.getByTestId("wizard-deal-name"), {
      target: { value: "CloudMed" },
    });
    fireEvent.change(screen.getByTestId("wizard-gp-source"), {
      target: { value: "Sequoia" },
    });

    expect(screen.queryByTestId("wizard-recipient-email")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("wizard-continue-step-1"));

    await waitFor(() => expect(createDeal).toHaveBeenCalledWith({
      name: "CloudMed",
      gpSource: "Sequoia",
      dealSizeMinUsd: null,
      dealSizeMaxUsd: null,
      sectorTags: [],
    }));
    expect(createIntakeLink).not.toHaveBeenCalled();
    await waitFor(() => expect(history).toContain("/new-deal/upload-files"));
    expect(screen.getByText("Upload Materials")).toBeInTheDocument();
  });

  it("checked + valid email — createIntakeLink called with {recipientEmail}, navigates to share-link", async () => {
    vi.mocked(createDeal).mockResolvedValue({ id: "deal-1" });
    vi.mocked(createIntakeLink).mockResolvedValue({
      token: "raw-token",
      expiresAt: new Date().toISOString(),
    });

    const { history } = renderWizard("/new-deal");

    fireEvent.change(screen.getByTestId("wizard-deal-name"), {
      target: { value: "CloudMed" },
    });
    fireEvent.change(screen.getByTestId("wizard-gp-source"), {
      target: { value: "Sequoia" },
    });
    fireEvent.click(screen.getByTestId("wizard-collect-externally"));
    fireEvent.change(screen.getByTestId("wizard-recipient-email"), {
      target: { value: "gp@example.com" },
    });

    expect(screen.getByTestId("wizard-continue-step-1")).toHaveTextContent("Generate Link");

    fireEvent.click(screen.getByTestId("wizard-continue-step-1"));

    await waitFor(() =>
      expect(createIntakeLink).toHaveBeenCalledWith("deal-1", {
        recipientEmail: "gp@example.com",
      })
    );
    await waitFor(() => expect(history).toContain("/new-deal/share-link"));
  });

  it("createIntakeLink failing after the deal is created shows a link-specific error, not 'Could not create deal', and lands on Step 2", async () => {
    vi.mocked(createDeal).mockResolvedValue({ id: "deal-1" });
    vi.mocked(createIntakeLink).mockRejectedValue(
      new IntakeApiError(409, "An active intake link already exists for this deal")
    );
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(null);

    const { history } = renderWizard("/new-deal");

    fireEvent.change(screen.getByTestId("wizard-deal-name"), {
      target: { value: "CloudMed" },
    });
    fireEvent.change(screen.getByTestId("wizard-gp-source"), {
      target: { value: "Sequoia" },
    });
    fireEvent.click(screen.getByTestId("wizard-collect-externally"));
    fireEvent.change(screen.getByTestId("wizard-recipient-email"), {
      target: { value: "gp@example.com" },
    });
    fireEvent.click(screen.getByTestId("wizard-continue-step-1"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Could not generate the intake link",
        expect.objectContaining({
          description: "An active intake link already exists for this deal",
        })
      )
    );
    expect(toast.error).not.toHaveBeenCalledWith("Could not create deal", expect.anything());
    expect(createDeal).toHaveBeenCalledTimes(1); // the deal is not re-created
    await waitFor(() => expect(history).toContain("/new-deal/upload-files"));
  });

  it("checked + blank email — Continue disabled, no network call", async () => {
    vi.mocked(createDeal).mockResolvedValue({ id: "deal-1" });

    renderWizard("/new-deal");

    fireEvent.change(screen.getByTestId("wizard-deal-name"), {
      target: { value: "CloudMed" },
    });
    fireEvent.change(screen.getByTestId("wizard-gp-source"), {
      target: { value: "Sequoia" },
    });
    fireEvent.click(screen.getByTestId("wizard-collect-externally"));

    expect(screen.getByTestId("wizard-continue-step-1")).toBeDisabled();
    fireEvent.click(screen.getByTestId("wizard-continue-step-1"));

    expect(createDeal).not.toHaveBeenCalled();
    expect(createIntakeLink).not.toHaveBeenCalled();
  });
});

describe("NewDealWizard — share-link step (P5-02)", () => {
  // Test-only stand-in for the browser back button — MemoryRouter keeps its
  // own history stack, so `navigate(-1)` inside that same router is the
  // faithful way to exercise a real "go back" from inside the test.
  function HistoryBackButton() {
    const navigate = useNavigate();
    return (
      <button type="button" data-testid="test-history-back" onClick={() => navigate(-1)}>
        back (test only)
      </button>
    );
  }

  function renderWithBack(initialPath: string) {
    const history: string[] = [];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const utils = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <LocationRecorder history={history} />
          <HistoryBackButton />
          <Routes>
            <Route path="/new-deal/:step?" element={<NewDealWizardRoute />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    return { ...utils, queryClient, history };
  }

  async function createDealViaExternalCollection() {
    vi.mocked(createDeal).mockResolvedValue({ id: "deal-1" });
    vi.mocked(createIntakeLink).mockResolvedValue({
      token: "raw-token-xyz",
      expiresAt: new Date().toISOString(),
    });
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(null);

    const rendered = renderWithBack("/new-deal");
    fireEvent.change(screen.getByTestId("wizard-deal-name"), {
      target: { value: "CloudMed" },
    });
    fireEvent.change(screen.getByTestId("wizard-gp-source"), {
      target: { value: "Sequoia" },
    });
    fireEvent.click(screen.getByTestId("wizard-collect-externally"));
    fireEvent.change(screen.getByTestId("wizard-recipient-email"), {
      target: { value: "gp@example.com" },
    });
    fireEvent.click(screen.getByTestId("wizard-continue-step-1"));
    await waitFor(() => expect(rendered.history).toContain("/new-deal/share-link"));
    return rendered;
  }

  it("token is displayed on first arrival at share-link", async () => {
    await createDealViaExternalCollection();
    const input = await screen.findByTestId("wizard-intake-link-url");
    expect(input).toHaveValue(`${window.location.origin}/intake/raw-token-xyz`);
  });

  it("AC: navigating away and back never re-displays the token, nor leaks it into storage or the DOM", async () => {
    await createDealViaExternalCollection();
    await screen.findByTestId("wizard-intake-link-url");

    fireEvent.click(screen.getByTestId("wizard-continue-share-link"));
    await waitFor(() => expect(screen.getByTestId("wizard-step-2")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("test-history-back"));
    await waitFor(() =>
      expect(screen.getByTestId("wizard-step-share-link")).toBeInTheDocument()
    );

    expect(screen.queryByText("raw-token-xyz")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wizard-intake-link-url")).not.toBeInTheDocument();
    expect(screen.getByTestId("wizard-intake-link-unavailable")).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("raw-token-xyz");

    expect(sessionStorage.length).toBe(0);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) as string;
      expect(localStorage.getItem(key)).not.toContain("raw-token-xyz");
    }
  });

  it("copy button writes the full origin+/intake/<token> URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await createDealViaExternalCollection();
    await screen.findByTestId("wizard-intake-link-url");
    fireEvent.click(screen.getByTestId("wizard-copy-intake-link"));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/intake/raw-token-xyz`)
    );
    expect(toast.success).toHaveBeenCalledWith("Link copied");
  });

  it("copy failure (rejected clipboard write) shows an error toast instead of an unhandled rejection", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await createDealViaExternalCollection();
    await screen.findByTestId("wizard-intake-link-url");
    fireEvent.click(screen.getByTestId("wizard-copy-intake-link"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't copy automatically",
        expect.anything()
      )
    );
  });

  it("progress bar: share-link maps to step-2 active, and the pre-existing steps are unchanged", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(null);

    renderWizard("/new-deal");
    expect(screen.getByTestId("wizard-step-indicator-1")).toHaveAttribute(
      "data-state",
      "active"
    );
    cleanup();

    renderWizard("/new-deal/upload-files?dealId=deal-1");
    await waitFor(() =>
      expect(screen.getByTestId("wizard-step-indicator-2")).toHaveAttribute(
        "data-state",
        "active"
      )
    );
    cleanup();

    renderWizard("/new-deal/confirm?dealId=deal-1");
    await waitFor(() =>
      expect(screen.getByTestId("wizard-step-indicator-3")).toHaveAttribute(
        "data-state",
        "active"
      )
    );
    cleanup();

    await createDealViaExternalCollection();
    expect(screen.getByTestId("wizard-step-indicator-2")).toHaveAttribute(
      "data-state",
      "active"
    );
  });
});

describe("NewDealWizard — Step 2 external-collection waiting panel (P5-04)", () => {
  it("intakeStatus 'pending': dropzone does not render, panel shows the recipient email, Continue disabled", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(makePendingIntakeLink());

    renderWizard("/new-deal/upload-files?dealId=deal-1");

    await waitFor(() =>
      expect(screen.getByTestId("wizard-step2-waiting-panel")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("deal-document-dropzone")).not.toBeInTheDocument();
    expect(screen.getByTestId("wizard-intake-recipient")).toHaveTextContent(
      "gp@example.com"
    );
    expect(screen.getByTestId("wizard-continue-step-2")).toBeDisabled();
  });

  it("intakeStatus null: dropzone renders, Continue carries neither `disabled` nor `title` (byte-identical non-intake DOM)", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(null);

    renderWizard("/new-deal/upload-files?dealId=deal-1");

    await waitFor(() =>
      expect(screen.getByTestId("deal-document-dropzone")).toBeInTheDocument()
    );
    const btn = screen.getByTestId("wizard-continue-step-2");
    expect(btn).not.toHaveAttribute("disabled");
    expect(btn).not.toHaveAttribute("title");
  });

  it("revoke: two clicks call revokeIntakeLink exactly once with the dealId; the dropzone reappears once the mocked GET flips status", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    // First GET (initial render) is pending; the second (after invalidation
    // fires the refetch) mocks the link having flipped to revoked/gone.
    vi.mocked(fetchIntakeLink)
      .mockResolvedValueOnce(makePendingIntakeLink())
      .mockResolvedValueOnce(null);
    vi.mocked(revokeIntakeLink).mockResolvedValue(undefined);

    renderWizard("/new-deal/upload-files?dealId=deal-1");

    await waitFor(() =>
      expect(screen.getByTestId("wizard-revoke-link")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("wizard-revoke-link"));
    expect(revokeIntakeLink).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("wizard-confirm-revoke-link"));

    await waitFor(() => expect(revokeIntakeLink).toHaveBeenCalledTimes(1));
    expect(revokeIntakeLink).toHaveBeenCalledWith("deal-1");

    // Dropzone reappearing after a revoke is the ordinary non-intake path
    // resuming, not a violation (see Step2WaitingPanel.tsx's comment).
    await waitFor(() =>
      expect(screen.getByTestId("deal-document-dropzone")).toBeInTheDocument()
    );
  });

  it("revoke racing a 404 (already revoked elsewhere, or just submitted) refreshes the panel instead of showing a failure toast", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    // Second GET (after the invalidation this 404 should trigger) reflects
    // what actually happened — the external party submitted in the meantime.
    vi.mocked(fetchIntakeLink)
      .mockResolvedValueOnce(makePendingIntakeLink())
      .mockResolvedValueOnce({
        status: "submitted",
        recipientEmail: "gp@example.com",
        expiresAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      });
    vi.mocked(revokeIntakeLink).mockRejectedValue(
      new IntakeApiError(404, "No pending intake link exists for this deal")
    );

    renderWizard("/new-deal/upload-files?dealId=deal-1");

    await waitFor(() =>
      expect(screen.getByTestId("wizard-revoke-link")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("wizard-revoke-link"));
    fireEvent.click(screen.getByTestId("wizard-confirm-revoke-link"));

    await waitFor(() => expect(revokeIntakeLink).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
    // Same "dropzone reappears" outcome as an actual successful revoke — the
    // panel corrected itself off the stale cached "pending" view, it didn't
    // fail. Still on Step 2: this fix doesn't add navigation, just a refetch.
    await waitFor(() =>
      expect(screen.getByTestId("deal-document-dropzone")).toBeInTheDocument()
    );
  });

  it("createdAt absent renders '—', never a fabricated or 'Invalid Date' value (flagged risk: §3.2 doesn't list this field — delete this case if P3-02 ships without it)", async () => {
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(makePendingIntakeLink()); // no createdAt

    renderWizard("/new-deal/upload-files?dealId=deal-1");

    await waitFor(() =>
      expect(screen.getByTestId("wizard-intake-sent-date")).toHaveTextContent("—")
    );
  });

  it("createdAt present renders the formatted send date (flagged risk: §3.2 doesn't list this field — delete this case if P3-02 ships without it)", async () => {
    const createdAt = "2026-01-15T00:00:00.000Z";
    vi.mocked(fetchDeal).mockResolvedValue(makeDealResponse("Acme Corp"));
    vi.mocked(fetchDealDocuments).mockResolvedValue([]);
    vi.mocked(fetchIntakeLink).mockResolvedValue(makePendingIntakeLink({ createdAt }));

    renderWizard("/new-deal/upload-files?dealId=deal-1");

    await waitFor(() =>
      expect(screen.getByTestId("wizard-intake-sent-date")).toHaveTextContent(
        new Date(createdAt).toLocaleDateString()
      )
    );
  });

  it("Step2WaitingPanel.tsx names no TODO or 'coming soon' hinting org-side upload is arriving (deliberately out of v1 scope)", () => {
    const filePath = path.resolve(__dirname, "newDealWizard", "Step2WaitingPanel.tsx");
    const source = fs.readFileSync(filePath, "utf-8");
    expect(source).not.toMatch(/TODO/i);
    expect(source).not.toMatch(/coming soon/i);
  });
});
