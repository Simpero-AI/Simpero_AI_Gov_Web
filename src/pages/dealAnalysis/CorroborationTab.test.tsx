import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CorroborationTab } from "./CorroborationTab";
import {
  fetchCorroboration,
  type CorroborationEvent,
  type CorroborationView,
} from "@/api/corroboration";

// CorroborationTab fetches GET /deals/{id}/corroboration via react-query — mock
// the client so the tab renders against controlled data with no real network.
vi.mock("@/api/corroboration", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/corroboration")>();
  return { ...actual, fetchCorroboration: vi.fn() };
});

const mockFetch = vi.mocked(fetchCorroboration);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CorroborationTab dealId="deal-1" />
    </QueryClientProvider>
  );
}

function event(overrides: Partial<CorroborationEvent> = {}): CorroborationEvent {
  return {
    id: "e1",
    claimId: "c1",
    outsideSource: "sec_edgar",
    agrees: true,
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193",
    result: { cik: 320193, edgar_value: 15000000 },
    createdAt: "2026-02-01T00:00:00Z",
    claimEntity: "Acme Corp",
    claimAttribute: "revenueLatestUsd",
    claimValue: { raw: "$15M", normalized: 15000000 },
    claimStatus: "cited",
    ...overrides,
  };
}

const EMPTY: CorroborationView = {
  events: [],
  confirmedCount: 0,
  conflictingCount: 0,
  totalCount: 0,
};

describe("CorroborationTab", () => {
  it("renders an honest empty state when the pass has produced no checks", async () => {
    mockFetch.mockResolvedValue(EMPTY);
    renderTab();
    expect(await screen.findByText("No external corroboration yet")).toBeInTheDocument();
  });

  it("renders the empty state on a 404 (deal gone -> null)", async () => {
    mockFetch.mockResolvedValue(null);
    renderTab();
    expect(await screen.findByText("No external corroboration yet")).toBeInTheDocument();
  });

  it("shows the verdict, source, claim context, and a clickable source link", async () => {
    mockFetch.mockResolvedValue({
      events: [event()],
      confirmedCount: 1,
      conflictingCount: 0,
      totalCount: 1,
    });
    renderTab();

    // "Confirmed" appears both as a summary-strip count label and as the pill,
    // so anchor the wait on the unique source label, then assert the pill exists.
    expect(await screen.findByText("SEC EDGAR")).toBeInTheDocument();
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThanOrEqual(1);
    // Claim context: the deck's value and the entity·attribute header.
    expect(screen.getByText("$15M")).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    // "cite the cite": a real external link with the resolved https href.
    const link = screen.getByRole("link", { name: /View source record/ });
    expect(link).toHaveAttribute("href", event().sourceUrl);
  });

  it("badges a disagreement as Conflicting and flags the claim", async () => {
    mockFetch.mockResolvedValue({
      events: [event({ agrees: false, claimStatus: "conflicted" })],
      confirmedCount: 0,
      conflictingCount: 1,
      totalCount: 1,
    });
    renderTab();

    expect(await screen.findByText("Claim conflicted")).toBeInTheDocument();
    expect(screen.getAllByText("Conflicting").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'no direct record link' when a source exposes no permalink", async () => {
    mockFetch.mockResolvedValue({
      events: [
        event({
          outsideSource: "trademarks_cipo_uspto",
          sourceUrl: null,
          result: { registry: "uspto", registration_id: "88123456" },
        }),
      ],
      confirmedCount: 1,
      conflictingCount: 0,
      totalCount: 1,
    });
    renderTab();

    expect(await screen.findByText("CIPO / USPTO Trademarks")).toBeInTheDocument();
    expect(screen.getByText("No direct record link for this source")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /View source record/ })).not.toBeInTheDocument();
  });

  it("groups multiple source checks under the one claim they ran against", async () => {
    mockFetch.mockResolvedValue({
      events: [
        event({ id: "e1", outsideSource: "sec_edgar" }),
        event({ id: "e2", outsideSource: "us_federal_register", sourceUrl: null, agrees: null }),
      ],
      confirmedCount: 1,
      conflictingCount: 0,
      totalCount: 2,
    });
    renderTab();

    // Both source rows render, but the claim header (its value) appears once.
    expect(await screen.findByText("SEC EDGAR")).toBeInTheDocument();
    expect(screen.getByText("US Federal Register")).toBeInTheDocument();
    expect(screen.getAllByText("$15M")).toHaveLength(1);
    // A presence-only check (agrees null) reads as "Recorded".
    expect(screen.getByText("Recorded")).toBeInTheDocument();
  });

  it("does not render a non-https source url as a link (defensive)", async () => {
    mockFetch.mockResolvedValue({
      events: [event({ sourceUrl: "javascript:alert(1)" })],
      confirmedCount: 1,
      conflictingCount: 0,
      totalCount: 1,
    });
    renderTab();

    await screen.findByText("SEC EDGAR");
    expect(screen.queryByRole("link", { name: /View source record/ })).not.toBeInTheDocument();
    expect(screen.getByText("No direct record link for this source")).toBeInTheDocument();
  });

  it("shows an error state when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("boom"));
    renderTab();
    expect(
      await screen.findByText("Couldn't load corroboration data for this deal.")
    ).toBeInTheDocument();
  });

  it("shows a loading state instead of a false empty-state flash while fetching", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderTab();
    expect(screen.getByText("Loading corroboration results…")).toBeInTheDocument();
    expect(screen.queryByText("No external corroboration yet")).not.toBeInTheDocument();
  });
});
