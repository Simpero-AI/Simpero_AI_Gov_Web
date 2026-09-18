import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactElement } from "react";
import { ScorecardTab } from "./ScorecardTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";

// The tab reads the investment profile via GET /investment-profile through
// @tanstack/react-query's useQuery (migrated off the deleted tRPC route). Mock
// ONLY useQuery -- importOriginal keeps every other export -- so these tests
// drive the tab's loading / error / configured states synchronously.
const { profileQueryMock } = vi.hoisted(() => ({ profileQueryMock: vi.fn() }));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: profileQueryMock };
});

// ScorecardTab renders a react-router <Link>, which needs router context.
function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: MemoryRouter });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const CONFIGURED_PROFILE = { weights: { framework: { categories: [{ id: "revenue-growth" }] } } };

describe("ScorecardTab", () => {
  it("renders the NotConfiguredScorecard state when no investment framework is set up", () => {
    profileQueryMock.mockReturnValue({ data: { weights: {} }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByText("Investment Framework not configured")).toBeInTheDocument();
  });

  it("renders a loading state while the investment profile is fetching", () => {
    profileQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() });
    render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders an error state with a retry action when the investment profile fails to load", () => {
    profileQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "Network error" },
      refetch: vi.fn(),
    });
    render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByText("Failed to load investment profile")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows the scoring action disabled with an honest note (no scoring endpoint yet)", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /score this deal/i })).toBeDisabled();
    expect(screen.getByText(/isn.t wired up yet/i)).toBeInTheDocument();
  });

  it("labels the action 'Re-score' once a scoring result exists", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    render(<ScorecardTab memoTyped={buildE2eDeliverableMemo()} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /^re-score$/i })).toBeInTheDocument();
  });

  it("renders the real scoring result (AI score, completion) once a scoring result exists", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    render(<ScorecardTab memoTyped={buildE2eDeliverableMemo()} sessionId="s1" dealId="d1" />);

    // aiScore (72) renders in both the shared panel header and the sidebar ring.
    expect(screen.getAllByText("72").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Overall Score")).toBeInTheDocument();
    expect(screen.getByText("7/7 criteria scored")).toBeInTheDocument();
  });

  it("links 'Edit scores' to the Mandate & Scorecard deal-scorecard tab with this deal's id in ?dealId=", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    render(<ScorecardTab memoTyped={buildE2eDeliverableMemo()} sessionId="s1" dealId="deal-42" />);

    const link = screen.getByRole("link", { name: /edit scores in mandate & scorecard/i });
    expect(link).toHaveAttribute("href", "/mandate-scorecard/scorecard?dealId=deal-42");
  });
});
