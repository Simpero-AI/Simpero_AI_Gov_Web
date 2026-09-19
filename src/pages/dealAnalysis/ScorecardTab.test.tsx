import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactElement } from "react";
import { ScorecardTab } from "./ScorecardTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { ICMemoResult } from "@shared/simperoTypes";

// ScorecardTab no longer touches tRPC: automated scoring has no backend
// producer (the memo rescore route is retired), so the action is a disabled,
// honest placeholder rather than a live mutation. The one remaining data read
// is the investment profile via react-query's useQuery (GET
// /api/investment-profile), mocked at that layer — ScorecardTab is this
// file's only useQuery call site, so mocking the whole module is safe here.
const { profileQueryMock } = vi.hoisted(() => ({
  profileQueryMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: profileQueryMock };
});

// ScorecardTab renders a react-router <Link>, which needs router context
// (wouter's <Link> fell back to the browser location and needed no wrapper).
function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: MemoryRouter });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const CONFIGURED_PROFILE = {
  weights: { framework: { categories: [{ id: "revenue-growth" }] } },
};

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

  it("labels the disabled action 'Score this deal' with no prior scoring result, and 'Re-score' once a result exists", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    const { unmount } = render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /score this deal/i })).toBeDisabled();
    unmount();

    render(<ScorecardTab memoTyped={buildE2eDeliverableMemo()} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /^re-score$/i })).toBeDisabled();
  });

  it("labels the disabled action 'Retry scoring' after a failed pass-4 attempt with no result", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    const memo: Partial<ICMemoResult> = { pass4Failed: true };
    render(<ScorecardTab memoTyped={memo} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /retry scoring/i })).toBeDisabled();
  });

  it("disables the scoring action with an honest note since automated scoring has no backend producer", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /score this deal/i })).toBeDisabled();
    expect(screen.getByText(/automated scoring isn.t wired up yet/i)).toBeInTheDocument();
  });

  it("renders the real scoring result (AI score, completion) once a scoring result exists", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    const memo = buildE2eDeliverableMemo();
    render(<ScorecardTab memoTyped={memo} sessionId="s1" dealId="d1" />);

    // sr.aiScore (72) renders both in the shared DealScorecardPanel header
    // and this tab's own Overall Score sidebar ring — assert it's present,
    // not that it's unique.
    expect(screen.getAllByText("72").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Overall Score")).toBeInTheDocument();
    // 7 of 7 criterionScores in the fixture have score > 0.
    expect(screen.getByText("7/7 criteria scored")).toBeInTheDocument();
  });

  it("links 'Edit scores' to the Mandate & Scorecard deal-scorecard tab with this deal's id in ?dealId=", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    const memo = buildE2eDeliverableMemo();
    render(<ScorecardTab memoTyped={memo} sessionId="s1" dealId="deal-42" />);

    const link = screen.getByRole("link", { name: /edit scores in mandate & scorecard/i });
    expect(link).toHaveAttribute("href", "/mandate-scorecard/scorecard?dealId=deal-42");
  });
});
