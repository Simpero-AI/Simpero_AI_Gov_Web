import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityPane } from "./ActivityPane";
import { fetchDealAudit, type DealAuditRow } from "@/api/logs";

// ActivityPane fetches the deal-scoped audit (GET /deals/{id}/audit) — mock it
// so the pane renders against controlled data with no real network call.
vi.mock("@/api/logs", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/logs")>();
  return { ...actual, fetchDealAudit: vi.fn() };
});

const fetchDealAuditMock = vi.mocked(fetchDealAudit);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function row(over: Partial<DealAuditRow> = {}): DealAuditRow {
  return {
    id: "1",
    createdAt: "2026-08-01T00:00:00.000Z",
    action: "deal.created",
    sessionId: null,
    jobId: null,
    actorEmail: null,
    payload: null,
    ...over,
  };
}

function renderActivityPane(dealId = "deal-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityPane dealId={dealId} />
    </QueryClientProvider>
  );
}

describe("ActivityPane", () => {
  it("renders the deal's audit events newest-first, scoped by deal (not session)", async () => {
    // The whole point of the fix: a completed run-based analysis has audit rows
    // keyed by deal but no memo Session, so scoping by deal (not sessionId)
    // surfaces them. sessionId is null on these rows and must not filter them out.
    fetchDealAuditMock.mockResolvedValue([
      row({ id: "1", action: "parsing.started", createdAt: "2026-08-01T00:00:00.000Z" }),
      row({ id: "2", action: "verification.completed", createdAt: "2026-08-01T00:05:00.000Z" }),
    ]);
    renderActivityPane();

    await waitFor(() => expect(screen.getByText("verification.completed")).toBeInTheDocument());
    expect(screen.getByText("parsing.started")).toBeInTheDocument();
    expect(screen.getByText("2 events · newest first")).toBeInTheDocument();
    // Newest first: verification.completed (later) renders before parsing.started.
    const texts = screen.getAllByText(/parsing\.started|verification\.completed/).map(n => n.textContent);
    expect(texts).toEqual(["verification.completed", "parsing.started"]);
  });

  it("renders an honest empty state for a deal with no audit events (never a false 'no session')", async () => {
    fetchDealAuditMock.mockResolvedValue([]);
    renderActivityPane();

    await waitFor(() => expect(screen.getByText("No activity yet on this deal")).toBeInTheDocument());
    // The old "No active analysis session yet" copy is gone — the feed is
    // deal-scoped and no longer depends on a memo session existing.
    expect(screen.queryByText("No active analysis session yet")).not.toBeInTheDocument();
  });

  it("shows a loading state while the audit fetch is in flight", () => {
    fetchDealAuditMock.mockReturnValue(new Promise<DealAuditRow[]>(() => {}));
    renderActivityPane();
    expect(screen.getByText("Loading activity…")).toBeInTheDocument();
  });

  it("shows an error state when the audit fetch fails", async () => {
    fetchDealAuditMock.mockRejectedValue(new Error("GET /deals/deal-1/audit failed: 500"));
    renderActivityPane();
    expect(await screen.findByText("Failed to load activity.")).toBeInTheDocument();
  });
});
