import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyTab } from "./CompanyTab";
import { fetchCompany, type CompanyView } from "@/api/company";
import { fetchScreeningInsights } from "@/api/screeningInsights";
import type { ICMemoResult } from "@shared/simperoTypes";

// CompanyTab fetches GET /deals/{id}/company via react-query — mock the client so
// the tab renders against controlled data with no real network call.
vi.mock("@/api/company", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/company")>();
  return { ...actual, fetchCompany: vi.fn() };
});

// Business Overview + Key Business Risks now reuse the screening-insights pass
// (Agent Highlights / Risk Flags), so the tab also fetches that endpoint.
vi.mock("@/api/screeningInsights", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/screeningInsights")>();
  return { ...actual, fetchScreeningInsights: vi.fn() };
});

const mockFetchCompany = vi.mocked(fetchCompany);
const mockFetchScreeningInsights = vi.mocked(fetchScreeningInsights);

beforeEach(() => {
  // Default: no insights (empty panels). Tests that exercise the panels override.
  mockFetchScreeningInsights.mockResolvedValue({ highlights: [], riskFlags: [] });
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
};

describe("CompanyTab", () => {
  it("renders an honest empty-state for every section when the deal has no company claims", async () => {
    mockFetchCompany.mockResolvedValue(EMPTY);
    renderCompanyTab();

    expect(await screen.findByText("Company facts not available")).toBeInTheDocument();
    // Business Overview + Key Business Risks are the screening panels now; with no
    // insights they show their own (loading-aware) empty state, not a claim empty.
    expect(await screen.findByText("No highlights yet")).toBeInTheDocument();
    expect(screen.getByText("No risk flags yet")).toBeInTheDocument();
    expect(screen.getByText("Commercial terms not available")).toBeInTheDocument();
    expect(screen.getByText("Related parties not available")).toBeInTheDocument();
    expect(screen.getByText("Plans & commitments not available")).toBeInTheDocument();
  });

  it("renders identity facts with their trust status and citations", async () => {
    mockFetchCompany.mockResolvedValue({
      facts: [
        { label: "Sector", value: "Gaming & Leisure", citation: null, status: "derived", entity: "AcmeCo", sourceUrl: null },
        { label: "Headcount", value: "1,450", citation: "cim.pdf · p.4", status: "verified", entity: "AcmeCo", sourceUrl: null },
      ],
      overview: [],
      risks: [],
      commercial: [],
      relatedParties: [],
      plans: [],
    });
    renderCompanyTab();

    expect(await screen.findByText("Gaming & Leisure")).toBeInTheDocument();
    expect(screen.getByText("1,450")).toBeInTheDocument();
    // Trust status is surfaced (derived for sector/HQ, verified for a cited claim).
    expect(screen.getByText("Derived")).toBeInTheDocument();
    expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
    expect(screen.getByText("cim.pdf · p.4")).toBeInTheDocument();

    expect(screen.queryByText("Company facts not available")).not.toBeInTheDocument();
    // A section with no claims still renders its honest empty-state.
    expect(screen.getByText("Commercial terms not available")).toBeInTheDocument();
  });

  it("shows the screening Agent Highlights + Risk Flags as Business Overview and Key Business Risks", async () => {
    mockFetchCompany.mockResolvedValue(EMPTY);
    mockFetchScreeningInsights.mockResolvedValue({
      highlights: ["Services gross margin expanded in 2025."],
      riskFlags: ["Key components are sourced from single or limited suppliers."],
    });
    renderCompanyTab();

    // The two boxes reuse the curated screening insights, not the raw claim dump.
    expect(await screen.findByText("Services gross margin expanded in 2025.")).toBeInTheDocument();
    expect(
      screen.getByText("Key components are sourced from single or limited suppliers.")
    ).toBeInTheDocument();
    expect(screen.getByText("Agent Highlights")).toBeInTheDocument();
    expect(screen.getByText("Risk Flags")).toBeInTheDocument();
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

  it("renders the uniform no-evidence state for not-yet-sourced sections and drops the redundant Technology & Operations box", async () => {
    mockFetchCompany.mockResolvedValue(EMPTY);
    renderCompanyTab();

    await screen.findByText("Company facts not available");
    // Co-Investors, Key Customers, Funding History, and Geographic Presence keep
    // their eyebrow but show the shared "No evidence found" body, never a per-box
    // "coming soon" placeholder.
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
