import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DealScorecardTab } from "./DealScorecardTab";
import { fetchDealsPipeline } from "@/api/deals";
import type { LivePipelineRow } from "@shared/dealsListPipeline";
import type { InvestmentProfile } from "@/data/mandateDefaults";

// fetchDealsPipeline hits the network via apiFetch — mock it while keeping
// the real query-key export DealScorecardTab's useQuery relies on.
vi.mock("@/api/deals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/deals")>();
  return { ...actual, fetchDealsPipeline: vi.fn() };
});

// Radix Select's trigger opens on pointerdown, which jsdom doesn't
// implement — stub the pieces it touches so userEvent.click can drive it
// (same setup as src/admin/__tests__/Members.test.tsx).
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const PROFILE: InvestmentProfile = {
  firmName: "Acme Capital",
  firmType: null,
  aumBand: null,
  mandate: {},
  weights: {
    framework: {
      categories: [
        {
          id: "revenue-growth",
          name: "Revenue Growth",
          weight: 40,
          criteria: [{ id: "arr-growth", name: "ARR Growth", benchmark: "≥25% YoY" }],
        },
        {
          id: "margins",
          name: "Margins",
          weight: 60,
          criteria: [{ id: "gm", name: "Gross Margin" }],
        },
      ],
    },
  },
  updatedAt: new Date().toISOString(),
};

function makeDeal(over: Partial<LivePipelineRow> = {}): LivePipelineRow {
  return {
    dealId: "d1",
    name: "Acme Co",
    gpSource: "Sourced",
    sectorTags: [],
    state: "sourcing",
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

function renderTab(profile: InvestmentProfile | null, dealId: string | null, onDealIdChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DealScorecardTab profile={profile} dealId={dealId} onDealIdChange={onDealIdChange} />
    </QueryClientProvider>
  );
}

describe("DealScorecardTab", () => {
  it("shows a 'no deal selected' empty state, and populates the deal picker from fetchDealsPipeline", async () => {
    vi.mocked(fetchDealsPipeline).mockResolvedValue([makeDeal({ dealId: "d1", name: "Acme Co", gpSource: "Sourced" })]);
    renderTab(PROFILE, null);

    expect(screen.getByText("No deal selected")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: /select a deal to evaluate/i }));
    expect(await screen.findByRole("option", { name: "Acme Co — Sourced" })).toBeInTheDocument();
  });

  it("selecting a deal from the picker reports its id via onDealIdChange", async () => {
    vi.mocked(fetchDealsPipeline).mockResolvedValue([makeDeal({ dealId: "d1", name: "Acme Co", gpSource: "Sourced" })]);
    const onDealIdChange = vi.fn();
    renderTab(PROFILE, null, onDealIdChange);

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: /select a deal to evaluate/i }));
    await user.click(await screen.findByRole("option", { name: "Acme Co — Sourced" }));
    expect(onDealIdChange).toHaveBeenCalledWith("d1");
  });

  it("renders the real criteria list from the scoring framework once a deal is selected, with disabled score inputs and dash rollups", async () => {
    vi.mocked(fetchDealsPipeline).mockResolvedValue([makeDeal({ dealId: "d1", name: "Acme Co", gpSource: "Sourced" })]);
    // dealId is controlled by the parent page (MandateScorecard, via the URL) —
    // supply it directly rather than driving it through the Select, which is
    // covered by the previous test.
    renderTab(PROFILE, "d1");

    // Real criteria, from the live framework fixture — not fabricated. Category
    // names legitimately render twice (criteria card header + by-category
    // rollup sidebar), so use getAllByText for those.
    expect(await screen.findAllByText("Revenue Growth")).toHaveLength(2);
    expect(screen.getByText("ARR Growth")).toBeInTheDocument();
    expect(screen.getAllByText("Margins")).toHaveLength(2);
    expect(screen.getByText("Gross Margin")).toBeInTheDocument();

    // Score inputs (1-5 buttons) are disabled — no persistence backend yet.
    const scoreButtons = screen.getAllByRole("button", { name: /^Score \d of 5$/ });
    expect(scoreButtons.length).toBe(10); // 2 criteria x 5 buttons
    for (const btn of scoreButtons) expect(btn).toBeDisabled();

    // Weighted Mandate Fit and by-category rollups are honest dashes, never
    // a computed number.
    expect(screen.getByText("Weighted Mandate Fit")).toBeInTheDocument();
    expect(screen.getByText("Not yet scored")).toBeInTheDocument();
    const dashes = screen.getAllByText("—");
    // At least: overall score + 2 category rollup dashes.
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it("shows the 'framework not configured' empty state when no categories exist", () => {
    vi.mocked(fetchDealsPipeline).mockResolvedValue([]);
    const emptyProfile: InvestmentProfile = { ...PROFILE, weights: {} };
    renderTab(emptyProfile, "d1");
    expect(screen.getByText("Scoring framework not configured")).toBeInTheDocument();
  });
});
