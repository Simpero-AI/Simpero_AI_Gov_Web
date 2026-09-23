import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyTab } from "./CompanyTab";
import { fetchCompany, type CompanyView } from "@/api/company";
import { fetchCompanySynthesis } from "@/api/companySynthesis";
import type { ICMemoResult } from "@shared/simperoTypes";

// CompanyTab fetches GET /deals/{id}/company via react-query — mock the client so
// the tab renders against controlled data with no real network call.
vi.mock("@/api/company", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/company")>();
  return { ...actual, fetchCompany: vi.fn() };
});

// The narrative sections prefer GET /deals/{id}/company-synthesis and fall back
// to the claims sections when it produced nothing.
vi.mock("@/api/companySynthesis", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/companySynthesis")>();
  return { ...actual, fetchCompanySynthesis: vi.fn() };
});

const mockFetchCompany = vi.mocked(fetchCompany);
const mockFetchCompanySynthesis = vi.mocked(fetchCompanySynthesis);

beforeEach(() => {
  // Default: no synthesis -> every narrative section falls back to its claims.
  mockFetchCompanySynthesis.mockResolvedValue({ sections: [] });
});

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
  coInvestors: [],
  fundingHistory: [],
  keyCustomers: [],
  geographicPresence: [],
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

  it("prefers the grounded AI synthesis for the narrative sections, with citations", async () => {
    mockFetchCompany.mockResolvedValue(EMPTY);
    mockFetchCompanySynthesis.mockResolvedValue({
      sections: [
        {
          key: "overview",
          title: "Business Overview",
          points: [
            { text: "The company sells a consumption-based cloud data platform.", citation: "cim.pdf · p.5" },
          ],
          people: [],
        },
        {
          key: "risks",
          title: "Risks & Dependencies",
          points: [{ text: "Revenue is variable with customer usage.", citation: "cim.pdf · p.15" }],
          people: [],
        },
      ],
    });
    renderCompanyTab();

    expect(
      await screen.findByText("The company sells a consumption-based cloud data platform.")
    ).toBeInTheDocument();
    expect(screen.getByText("Revenue is variable with customer usage.")).toBeInTheDocument();
    expect(screen.getByText("cim.pdf · p.5")).toBeInTheDocument();
    // Labelled as an AI summary, and the claims-fallback empty state is NOT shown
    // for a section the synthesis filled.
    expect(screen.getAllByText(/AI summary/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Business overview not available")).not.toBeInTheDocument();
    expect(screen.queryByText("Business risks not available")).not.toBeInTheDocument();
  });

  it("falls back to the claims-driven section when synthesis is empty", async () => {
    // Synthesis unavailable (default empty mock) but the claims spine has an
    // overview assertion -> the box renders the cited claim, not an empty state.
    mockFetchCompany.mockResolvedValue({
      ...EMPTY,
      overview: [
        {
          label: "AcmeCo",
          value: "AcmeCo operates a cloud data warehouse.",
          citation: "cim.pdf · p.2",
          status: "verified",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
    });
    renderCompanyTab();

    expect(await screen.findByText("AcmeCo operates a cloud data warehouse.")).toBeInTheDocument();
    expect(screen.getByText("cim.pdf · p.2")).toBeInTheDocument();
    expect(screen.queryByText(/AI summary/)).not.toBeInTheDocument();
    expect(screen.queryByText("Business overview not available")).not.toBeInTheDocument();
  });

  it("renders identity facts and grouped qualitative assertions with status", async () => {
    mockFetchCompany.mockResolvedValue({
      facts: [
        { label: "Sector", value: "Gaming & Leisure", citation: null, status: "derived", entity: "AcmeCo", sourceUrl: null },
        { label: "Headcount", value: "1,450", citation: "cim.pdf · p.4", status: "verified", entity: "AcmeCo", sourceUrl: null },
      ],
      overview: [
        {
          label: "AcmeCo",
          value: "Revenue is 70% recurring subscription.",
          citation: "cim.pdf · p.6",
          status: "verified",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
      risks: [
        {
          label: "AcmeCo",
          value: "Heavily dependent on a single supplier.",
          citation: "cim.pdf · p.7",
          status: "cited",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
      commercial: [],
      relatedParties: [],
      plans: [],
      coInvestors: [],
      fundingHistory: [],
      keyCustomers: [],
      geographicPresence: [],
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

  it("renders a web sourceUrl as a link and a deck citation as plain text", async () => {
    // A fact with a valid http(s) sourceUrl renders a hostname link (new tab,
    // noopener), mirroring the Financials tab; a deck-sourced fact with no URL
    // keeps its plain citation text and is never an anchor.
    mockFetchCompany.mockResolvedValue({
      facts: [
        {
          label: "Headcount",
          value: "1,450",
          citation: "example.com",
          status: "cited",
          entity: "AcmeCo",
          sourceUrl: "https://example.com/x",
        },
        {
          label: "Founded",
          value: "2011",
          citation: "deck.pdf · p.3",
          status: "cited",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
      overview: [],
      risks: [],
      commercial: [],
      relatedParties: [],
      plans: [],
      coInvestors: [],
      fundingHistory: [],
      keyCustomers: [],
      geographicPresence: [],
    });
    renderCompanyTab();

    const link = await screen.findByRole("link", { name: "example.com" });
    expect(link).toHaveAttribute("href", "https://example.com/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // The deck-sourced fact stays plain text — not wrapped in an anchor.
    const deckCitation = screen.getByText("deck.pdf · p.3");
    expect(deckCitation.closest("a")).toBeNull();
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

  it("shows the shared no-evidence state for the firmographic sections when the deal has none, and drops the redundant Technology & Operations box", async () => {
    mockFetchCompany.mockResolvedValue(EMPTY);
    renderCompanyTab();

    await screen.findByText("Company facts not available");
    // Co-Investors, Key Customers, Funding History, and Geographic Presence are
    // bound to the claims view; with no data for this deal they keep their eyebrow
    // but show the shared "No evidence found" body, never a "coming soon" box.
    expect(screen.getAllByText("No evidence found")).toHaveLength(4);
    expect(
      screen.getAllByText("Nothing on this was found in the deal's materials or public sources.").length
    ).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText("Co-investor data coming soon")).not.toBeInTheDocument();
    expect(screen.queryByText("Key customer data coming soon")).not.toBeInTheDocument();
    expect(screen.queryByText("Funding history coming soon")).not.toBeInTheDocument();
    expect(screen.queryByText("Geographic breakdown coming soon")).not.toBeInTheDocument();
    // The redundant Technology & Operations box is removed entirely (its content
    // is already routed into Business Overview).
    expect(screen.queryByText("Technology & Operations")).not.toBeInTheDocument();
    expect(screen.queryByText("Technology & operations details coming soon")).not.toBeInTheDocument();
    // No memo OFAC data -> the compliance section is untouched and shows its own placeholder.
    expect(screen.getByText("IP & compliance data coming soon")).toBeInTheDocument();
  });

  it("binds the firmographic sections to their claims when the deal has them", async () => {
    // The four firmographic sections read the parser's assertion classes via
    // build_company_view (Alpha #209 / Parser #66). When the deal states them,
    // the extracted assertion renders with its citation — not the no-evidence box.
    mockFetchCompany.mockResolvedValue({
      ...EMPTY,
      keyCustomers: [
        {
          label: "AcmeCo",
          value: "Two customers each account for more than 10% of revenue.",
          citation: "10-K · p.26",
          status: "cited",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
      geographicPresence: [
        {
          label: "AcmeCo",
          value: "Operations span the Americas, Europe, and Greater China.",
          citation: "10-K · p.63",
          status: "verified",
          entity: "AcmeCo",
          sourceUrl: null,
        },
      ],
    });
    renderCompanyTab();

    expect(
      await screen.findByText("Two customers each account for more than 10% of revenue.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Operations span the Americas, Europe, and Greater China.")
    ).toBeInTheDocument();
    expect(screen.getByText("10-K · p.63")).toBeInTheDocument();
    // Only Co-Investors and Funding History remain empty here, so the shared
    // no-evidence body appears twice, not four times.
    expect(screen.getAllByText("No evidence found")).toHaveLength(2);
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
