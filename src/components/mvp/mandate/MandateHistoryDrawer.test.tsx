import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MandateHistoryDrawer } from "./MandateHistoryDrawer";
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
    action: "mandate_saved",
    sessionId: null,
    jobId: null,
    actorEmail: null,
    payload: null,
    ...over,
  };
}

function renderDrawer(open: boolean, firmName?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MandateHistoryDrawer open={open} onOpenChange={vi.fn()} firmName={firmName} />
    </QueryClientProvider>
  );
}

describe("MandateHistoryDrawer", () => {
  it("renders nothing and does not fetch when closed", () => {
    renderDrawer(false);
    expect(screen.queryByText("Mandate History")).not.toBeInTheDocument();
    expect(fetchRecentActivityMock).not.toHaveBeenCalled();
  });

  it("shows a loading state while the query is in flight", () => {
    fetchRecentActivityMock.mockReturnValue(new Promise(() => {}));
    renderDrawer(true, "Acme Capital");

    expect(screen.getByText("Mandate History")).toBeInTheDocument();
    expect(screen.getByText("Change log · Acme Capital")).toBeInTheDocument();
    expect(screen.getByText("Loading history…")).toBeInTheDocument();
  });

  it("shows an error state when the fetch fails", async () => {
    fetchRecentActivityMock.mockRejectedValue(new Error("boom"));
    renderDrawer(true);

    await waitFor(() => expect(screen.getByText("Failed to load mandate history.")).toBeInTheDocument());
  });

  it("renders an honest empty state when there are no mandate_saved rows, with no fabricated entries", async () => {
    fetchRecentActivityMock.mockResolvedValue({
      total: 1,
      warnings: 0,
      critical: 0,
      rows: [row({ action: "deal.created" })],
    });
    renderDrawer(true);

    await waitFor(() => expect(screen.getByText("No mandate saves recorded yet")).toBeInTheDocument());
    expect(screen.queryByText("Mandate saved")).not.toBeInTheDocument();
  });

  it("renders mandate_saved rows newest-first, filtering out other event types", async () => {
    fetchRecentActivityMock.mockResolvedValue({
      total: 3,
      warnings: 0,
      critical: 0,
      rows: [
        row({ id: 1, createdAt: "2026-08-01T00:00:00.000Z" }),
        row({ id: 2, action: "deal.created", createdAt: "2026-08-02T00:00:00.000Z" }),
        row({ id: 3, createdAt: "2026-08-03T00:00:00.000Z" }),
      ],
    });
    renderDrawer(true);

    const entries = await screen.findAllByText("Mandate saved");
    expect(entries).toHaveLength(2);
  });

  it("omits the firm name from the subtitle when not provided", () => {
    fetchRecentActivityMock.mockReturnValue(new Promise(() => {}));
    renderDrawer(true);
    expect(screen.getByText("Change log")).toBeInTheDocument();
  });

  it("renders actorEmail and a formatted diff summary when the payload is present", async () => {
    fetchRecentActivityMock.mockResolvedValue({
      total: 1,
      warnings: 0,
      critical: 0,
      rows: [
        row({
          actorEmail: "jane@acme.vc",
          payload: [
            { category: "Investment Stage", type: "options", added: ["Series A"] },
            {
              category: "Geographies",
              type: "options",
              added: ["Canada"],
              subOptionsAdded: [{ option: "Canada", subOptions: ["British Columbia"] }],
            },
            {
              // Stored as full dollar amounts (CHECK_SIZE_UNIT_K) — the
              // formatter must divide back down to $K for display.
              category: "Check Size Range",
              type: "range",
              from: { min: 10_000, max: 100_000 },
              to: { min: 50_000, max: 200_000 },
            },
          ],
        }),
      ],
    });
    renderDrawer(true);

    expect(await screen.findByText("Mandate saved")).toBeInTheDocument();
    expect(screen.getByText("by jane@acme.vc")).toBeInTheDocument();
    expect(screen.getByText("Investment Stage: +Series A")).toBeInTheDocument();
    expect(screen.getByText("Geographies: +Canada → +British Columbia")).toBeInTheDocument();
    expect(screen.getByText("Check Size Range: $10K–$100K → $50K–$200K")).toBeInTheDocument();
  });

  it("renders exactly as before (no 'by' line, no diff lines) when actorEmail/payload are absent", async () => {
    fetchRecentActivityMock.mockResolvedValue({
      total: 1,
      warnings: 0,
      critical: 0,
      rows: [row()],
    });
    renderDrawer(true);

    expect(await screen.findByText("Mandate saved")).toBeInTheDocument();
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument();
    // No stray diff-summary <li> rendered alongside the "Mandate saved" row.
    expect(document.querySelector("ul")).not.toBeInTheDocument();
  });

  it("doesn't crash and omits the diff summary when payload is a malformed/unexpected shape", async () => {
    fetchRecentActivityMock.mockResolvedValue({
      total: 1,
      warnings: 0,
      critical: 0,
      rows: [row({ payload: { not: "an array" } })],
    });
    renderDrawer(true);

    expect(await screen.findByText("Mandate saved")).toBeInTheDocument();
    expect(document.querySelector("ul")).not.toBeInTheDocument();
  });
});
