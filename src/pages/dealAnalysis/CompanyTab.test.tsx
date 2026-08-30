import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyTab } from "./CompanyTab";
import { fetchCompany, type CompanyView } from "@/api/company";

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

function renderCompanyTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CompanyTab dealId="deal-1" />
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
});
