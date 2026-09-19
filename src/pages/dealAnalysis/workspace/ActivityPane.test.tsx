import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityPane } from "./ActivityPane";
import { fetchDealAudit, type DealAuditRow } from "@/api/logs";

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
    id: "row-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    action: "analysis_requested",
    sessionId: null,
    jobId: null,
    actorEmail: "Internal System",
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
  it("fetches the deal-scoped audit trail and renders its rows newest-first", async () => {
    // Rows deliberately supplied oldest-first to prove the client sort, and
    // with a null session_id — the shape the run-based analysis worker writes,
    // which the pane's former session filter could never surface.
    fetchDealAuditMock.mockResolvedValue([
      row({ id: "older", action: "analysis_requested", createdAt: "2026-08-01T00:00:00.000Z" }),
      row({ id: "newer", action: "analysis_parsing_completed", createdAt: "2026-08-02T00:00:00.000Z" }),
    ]);
    renderActivityPane("deal-42");

    await waitFor(() => expect(screen.getByText("analysis_parsing_completed")).toBeInTheDocument());
    expect(fetchDealAuditMock).toHaveBeenCalledWith("deal-42");
    expect(screen.getByText("2 events · newest first")).toBeInTheDocument();

    const newer = screen.getByText("analysis_parsing_completed");
    const older = screen.getByText("analysis_requested");
    // Newest row precedes the older one in the DOM regardless of input order.
    expect(newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText("Internal System")).toHaveLength(2);
  });

  it("renders an honest empty state when the deal has no audit rows", async () => {
    fetchDealAuditMock.mockResolvedValue([]);
    renderActivityPane();

    await waitFor(() => expect(screen.getByText("No activity yet on this deal")).toBeInTheDocument());
    expect(screen.getByText("Deal-scoped activity feed")).toBeInTheDocument();
  });

  it("surfaces a load error", async () => {
    fetchDealAuditMock.mockRejectedValue(new Error("boom"));
    renderActivityPane();

    await waitFor(() => expect(screen.getByText("Failed to load activity.")).toBeInTheDocument());
  });
});
