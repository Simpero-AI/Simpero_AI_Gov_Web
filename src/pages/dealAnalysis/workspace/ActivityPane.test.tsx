import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityPane } from "./ActivityPane";
import { fetchRecentActivity, type RecentActivityRow } from "@/api/logs";

vi.mock("@/api/logs", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/logs")>();
  return { ...actual, fetchRecentActivity: vi.fn() };
});

const fetchRecentActivityMock = vi.mocked(fetchRecentActivity);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function row(over: Partial<RecentActivityRow> = {}): RecentActivityRow {
  return {
    id: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    action: "deal.created",
    sessionId: "session-1",
    jobId: null,
    ...over,
  };
}

function renderActivityPane(sessionId: string | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityPane sessionId={sessionId} />
    </QueryClientProvider>
  );
}

describe("ActivityPane", () => {
  it("renders an honest empty state and does not fetch when the deal has no session", () => {
    renderActivityPane(null);
    expect(screen.getByText("No active analysis session yet")).toBeInTheDocument();
    expect(fetchRecentActivityMock).not.toHaveBeenCalled();
  });

  it("renders only rows matching the deal's sessionId, filtering out other sessions' activity", async () => {
    fetchRecentActivityMock.mockResolvedValue({
      total: 2,
      warnings: 0,
      critical: 0,
      rows: [
        row({ id: 1, action: "deal.session-1.event", sessionId: "session-1" }),
        row({ id: 2, action: "deal.session-2.event", sessionId: "session-2" }),
      ],
    });
    renderActivityPane("session-1");

    await waitFor(() => expect(screen.getByText("deal.session-1.event")).toBeInTheDocument());
    expect(screen.queryByText("deal.session-2.event")).not.toBeInTheDocument();
    expect(screen.getByText("1 event · newest first")).toBeInTheDocument();
  });

  it("renders an empty state when no fetched rows match the deal's sessionId", async () => {
    fetchRecentActivityMock.mockResolvedValue({
      total: 1,
      warnings: 0,
      critical: 0,
      rows: [row({ id: 1, action: "other-deal.event", sessionId: "some-other-session" })],
    });
    renderActivityPane("session-1");

    await waitFor(() => expect(screen.getByText("No activity yet on this deal")).toBeInTheDocument());
    expect(screen.queryByText("other-deal.event")).not.toBeInTheDocument();
  });
});
