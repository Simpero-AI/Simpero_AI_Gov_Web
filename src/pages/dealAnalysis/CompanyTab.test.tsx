import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyTab } from "./CompanyTab";
import { fetchCompany, type CompanyView } from "@/api/company";
import type { ICMemoResult } from "@shared/simperoTypes";

// CompanyTab fetches GET /deals/{id}/company via react-query — mock the client so
// the tab renders against controlled data with no real network call.
vi.mock("@/api/company", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/company")>();
  return { ...actual, fetchCompany: vi.fn() };
});

const mockFetchCompany = vi.mocked(fetchCompany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCompanyTab(memoTyped: Partial<ICMemoResult> | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CompanyTab dealId="deal-1" memoTyped={memoTyped} />
    </QueryClientProvider>
  );
}

const EMPTY: CompanyView = {
  facts: [],
  overview: [],
  risks: [],
  commercial: [],
  relatedParties: [],
  plans: [],
};

describe("CompanyTab", () => {
  it("renders an honest empty-state for every section when the deal has no company claims", async () => {
    mockFetchCompany.mockResolvedValue(EMPTY);
    renderCompanyTab();

    expect(await screen.findByText("Company facts not available")).toBeInTheDocument();
    expect(screen.getByText("Business overview not available")).toBeInTheDocument();
    expect(screen.getByText("Business risks not available")).toBeInTheDocument();
    expect(screen.getByText("Commercial terms not available")).toBeInTheDocument();
    expect(screen.getByText("Related parties not available")).toBeInTheDocument();
    expect(screen.getByText("Plans & commitments not available")).toBeInTheDocument();
  });

  it("renders identity facts and grouped qualitative assertions with status", async () => {
    mockFetchCompany.mockResolvedValue({
      facts: [
        { label: "Sector", value: "Gaming & Leisure", citation: null, status: "derived", entity: "AcmeCo" },
        { label: "Headcount", value: "1,450", citation: "cim.pdf · p.4", status: "verified", entity: "AcmeCo" },
      ],
      overview: [
        {
          label: "AcmeCo",
          value: "Revenue is 70% recurring subscription.",
          citation: "cim.pdf · p.6",
          status: "verified",
          entity: "AcmeCo",
        },
      ],
      risks: [
        {
          label: "AcmeCo",
          value: "Heavily dependent on a single supplier.",
          citation: "cim.pdf · p.7",
          status: "cited",
          entity: "AcmeCo",
        },
      ],
      commercial: [],
      relatedParties: [],
      plans: [],
    });
    renderCompanyTab();

    expect(await screen.findByText("Gaming & Leisure")).toBeInTheDocument();
    expect(screen.getByText("1,450")).toBeInTheDocument();
    expect(screen.getByText("Revenue is 70% recurring subscription.")).toBeInTheDocument();
    expect(screen.getByText("Heavily dependent on a single supplier.")).toBeInTheDocument();
    // Trust status is surfaced (derived for sector/HQ, verified/cited for claims).
    expect(screen.getByText("Derived")).toBeInTheDocument();
    expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
    expect(screen.getByText("Cited")).toBeInTheDocument();
    expect(screen.getByText("cim.pdf · p.4")).toBeInTheDocument();

    expect(screen.queryByText("Company facts not available")).not.toBeInTheDocument();
    // A section with no claims still renders its honest empty-state.
    expect(screen.getByText("Commercial terms not available")).toBeInTheDocument();
  });

  it("shows an error state when the company fetch fails", async () => {
    mockFetchCompany.mockRejectedValue(new Error("boom"));
    renderCompanyTab();

    expect(await screen.findByText("Couldn't load company data for this deal.")).toBeInTheDocument();
  });

  it("shows a loading state instead of a false 'not available' flash while fetching", () => {
    mockFetchCompany.mockReturnValue(new Promise(() => {}));  // never resolves
    renderCompanyTab();

    expect(screen.getByText("Loading company profile…")).toBeInTheDocument();
    // Must NOT flash the empty state before data arrives.
    expect(screen.queryByText("Company facts not available")).not.toBeInTheDocument();
  });

  it("keeps the mockup's not-yet-sourced sections as honest placeholders", async () => {
    mockFetchCompany.mockResolvedValue(EMPTY);
    renderCompanyTab();

    await screen.findByText("Company facts not available");
    expect(screen.getByText("Co-investor data coming soon")).toBeInTheDocument();
    expect(screen.getByText("Key customer data coming soon")).toBeInTheDocument();
    expect(screen.getByText("Funding history coming soon")).toBeInTheDocument();
    expect(screen.getByText("Geographic breakdown coming soon")).toBeInTheDocument();
    expect(screen.getByText("Technology & operations details coming soon")).toBeInTheDocument();
    // No memo OFAC data -> the compliance section shows its own placeholder.
    expect(screen.getByText("IP & compliance data coming soon")).toBeInTheDocument();
  });

  it("surfaces an OFAC sanctions match from the memo (compliance visibility not dropped)", async () => {
    mockFetchCompany.mockResolvedValue(EMPTY);
    const memoWithOfac = {
      ofac_screening: {
        confirmedMatches: 1,
        possibleMatches: 0,
        screeningAvailable: true,
        entitiesScreened: 2,
        screenedAt: "2026-01-15T00:00:00Z",
        results: [
          {
            entity: "Sanctioned Holdco LLC",
            entityType: "organization",
            status: "CONFIRMED_MATCH",
            matchedName: "Sanctioned Holdco LLC",
          },
        ],
      },
    } as unknown as Partial<ICMemoResult>;

    renderCompanyTab(memoWithOfac);

    expect(await screen.findByText(/OFAC Sanctions Screening/)).toBeInTheDocument();
    expect(screen.getByText("Sanctioned Holdco LLC")).toBeInTheDocument();
    expect(screen.queryByText("IP & compliance data coming soon")).not.toBeInTheDocument();
  });
});
