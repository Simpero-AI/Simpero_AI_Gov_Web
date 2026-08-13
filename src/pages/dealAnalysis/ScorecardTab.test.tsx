import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ScorecardTab } from "./ScorecardTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { ICMemoResult } from "@shared/simperoTypes";

// The tRPC client is the legacy, frozen data layer this tab still depends on
// (src/lib/trpc.ts) — mocked wholesale so these tests drive the tab's own
// loading/error/configured/pending/error-mutation states without touching a
// real tRPC/React Query client.
const { profileQueryMock, rescoreMutationMock, invalidateMock } = vi.hoisted(() => ({
  profileQueryMock: vi.fn(),
  rescoreMutationMock: vi.fn(),
  invalidateMock: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ deals: { get: { invalidate: invalidateMock } } }),
    investmentProfile: { get: { useQuery: profileQueryMock } },
    memo: { rescore: { useMutation: rescoreMutationMock } },
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const CONFIGURED_PROFILE = {
  weights: { framework: { categories: [{ id: "revenue-growth" }] } },
};

function mockRescore(overrides: Partial<{ mutate: () => void; isPending: boolean; error: { message: string } | null }> = {}) {
  rescoreMutationMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
    ...overrides,
  });
}

describe("ScorecardTab", () => {
  it("renders the NotConfiguredScorecard state when no investment framework is set up", () => {
    profileQueryMock.mockReturnValue({ data: { weights: {} }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    mockRescore();
    render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByText("Investment Framework not configured")).toBeInTheDocument();
  });

  it("renders a loading state while the investment profile is fetching", () => {
    profileQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() });
    mockRescore();
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
    mockRescore();
    render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByText("Failed to load investment profile")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("labels the action 'Score this deal' with no prior scoring result, and 'Re-score' once a result exists", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    mockRescore();
    const { unmount } = render(<ScorecardTab memoTyped={null} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /score this deal/i })).toBeInTheDocument();
    unmount();

    render(<ScorecardTab memoTyped={buildE2eDeliverableMemo()} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /^re-score$/i })).toBeInTheDocument();
  });

  it("labels the action 'Retry scoring' after a failed pass-4 attempt with no result", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    mockRescore();
    const memo: Partial<ICMemoResult> = { pass4Failed: true };
    render(<ScorecardTab memoTyped={memo} sessionId="s1" dealId="d1" />);
    expect(screen.getByRole("button", { name: /retry scoring/i })).toBeInTheDocument();
  });

  it("renders the real scoring result (AI score, completion) once a scoring result exists", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    mockRescore();
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
    mockRescore();
    const memo = buildE2eDeliverableMemo();
    render(<ScorecardTab memoTyped={memo} sessionId="s1" dealId="deal-42" />);

    const link = screen.getByRole("link", { name: /edit scores in mandate & scorecard/i });
    expect(link).toHaveAttribute("href", "/mandate-scorecard/scorecard?dealId=deal-42");
  });

  it("shows a spinner and disables the action while a rescore mutation is pending", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    mockRescore({ isPending: true });
    render(<ScorecardTab memoTyped={buildE2eDeliverableMemo()} sessionId="s1" dealId="d1" />);

    const button = screen.getByRole("button", { name: /scoring…/i });
    expect(button).toBeDisabled();
  });

  it("surfaces the rescore mutation's error message without crashing", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    mockRescore({ error: { message: "Scoring failed: upstream timeout" } });
    render(<ScorecardTab memoTyped={buildE2eDeliverableMemo()} sessionId="s1" dealId="d1" />);

    expect(screen.getByText("Scoring failed: upstream timeout")).toBeInTheDocument();
  });

  it("disables the action entirely when there is no sessionId to score", () => {
    profileQueryMock.mockReturnValue({ data: CONFIGURED_PROFILE, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    mockRescore();
    render(<ScorecardTab memoTyped={null} sessionId={null} dealId="d1" />);
    expect(screen.getByRole("button", { name: /score this deal/i })).toBeDisabled();
  });
});
