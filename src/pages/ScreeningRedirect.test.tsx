import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import ScreeningRedirect from "./ScreeningRedirect";
import { fetchDealsPipeline } from "@/api/deals";
import type { LivePipelineRow } from "@shared/dealsListPipeline";

vi.mock("@/api/deals", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/deals")>();
  return { ...actual, fetchDealsPipeline: vi.fn() };
});

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "user", name: "Test User", email: "test@example.com" },
    loading: false,
    logout: vi.fn(),
  }),
}));

function makeRow(over: Partial<LivePipelineRow> = {}): LivePipelineRow {
  return {
    dealId: "1",
    name: "Acme",
    gpSource: "GP",
    sectorTags: [],
    state: "diligence",
    createdAt: new Date().toISOString(),
    valuationUsd: null,
    evRevenue: null,
    aiScore: null,
    mandateFitPct: null,
    irrPct: null,
    actionPill: null,
    agentStatus: { jobStatus: "complete", currentPhase: null, steps: [] },
    ...over,
  };
}

// Local two-route table (not the app's `routes`): the component under test at
// /screening, plus a probe route at its redirect target so the <Navigate> has
// somewhere real to land and `router.state.location.pathname` is meaningful.
function renderScreeningRedirect() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/screening", element: <ScreeningRedirect /> },
      { path: "/deals/:dealId/screening", element: <div data-testid="screening-probe" /> },
    ],
    { initialEntries: ["/screening"] }
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { router };
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

describe("ScreeningRedirect", () => {
  it("redirects to the most recently completed deal's screening route", async () => {
    vi.mocked(fetchDealsPipeline).mockResolvedValue([
      makeRow({ dealId: "old", createdAt: "2024-01-01T00:00:00.000Z" }),
      makeRow({ dealId: "new", createdAt: "2024-06-01T00:00:00.000Z" }),
    ]);

    const { router } = renderScreeningRedirect();

    await waitFor(() => expect(router.state.location.pathname).toBe("/deals/new/screening"));
  });

  it("shows the no-deals-to-screen empty state when there are no complete deals", async () => {
    vi.mocked(fetchDealsPipeline).mockResolvedValue([
      makeRow({ agentStatus: { jobStatus: "processing", currentPhase: null, steps: [] } }),
    ]);

    renderScreeningRedirect();

    await waitFor(() => expect(screen.getByText("No deals to screen")).toBeInTheDocument());
  });
});
