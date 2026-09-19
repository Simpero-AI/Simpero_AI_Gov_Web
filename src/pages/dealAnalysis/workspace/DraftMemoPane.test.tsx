import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DraftMemoPane } from "./DraftMemoPane";
import { fetchMemoDraft, saveMemoRecommendation } from "@/api/memoDraft";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { ICMemoResult } from "@shared/simperoTypes";

vi.mock("@/api/memoDraft", async importOriginal => {
  const actual = await importOriginal<typeof import("@/api/memoDraft")>();
  return { ...actual, fetchMemoDraft: vi.fn(), saveMemoRecommendation: vi.fn() };
});

const mockFetch = vi.mocked(fetchMemoDraft);
const mockSave = vi.mocked(saveMemoRecommendation);

beforeEach(() => {
  mockFetch.mockResolvedValue({ recommendation: null });
});

afterEach(cleanup);

function renderPane(memoTyped: Partial<ICMemoResult> | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DraftMemoPane memoTyped={memoTyped} dealId="deal-1" />
    </QueryClientProvider>
  );
}

describe("DraftMemoPane", () => {
  it("renders honest empty-states when there is no memo", async () => {
    renderPane(null);
    expect(await screen.findByTestId("missing-placeholder")).toBeInTheDocument();
    expect(screen.getByText("Merits not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Risks not yet extracted")).toBeInTheDocument();
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("renders the AI Recommendation, Merits, and Risks from the memo when no override exists", async () => {
    renderPane(buildE2eDeliverableMemo());

    expect(
      await screen.findByText(/Recommend the IC approve a \$25M Series B ticket/)
    ).toBeInTheDocument();
    expect(screen.getByText(/AI draft — edit to override/i)).toBeInTheDocument();
    expect(screen.getByText("Durable revenue growth")).toBeInTheDocument();
    expect(screen.getByText("Customer concentration")).toBeInTheDocument();
  });

  it("renders a saved analyst override instead of the AI draft", async () => {
    mockFetch.mockResolvedValue({
      recommendation: {
        content: "Analyst override: pass for now, revisit next round.",
        actorEmail: "me@fund.com",
        createdAt: "2026-09-18T00:00:00Z",
      },
    });
    renderPane(buildE2eDeliverableMemo());

    expect(
      await screen.findByText("Analyst override: pass for now, revisit next round.")
    ).toBeInTheDocument();
    expect(screen.getByText(/Edited by me@fund.com/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Recommend the IC approve a \$25M Series B ticket/)
    ).not.toBeInTheDocument();
  });

  it("edits and saves a Recommendation override", async () => {
    const user = userEvent.setup();
    mockSave.mockResolvedValue({
      content: "My revised recommendation.",
      actorEmail: "me@fund.com",
      createdAt: "2026-09-18T00:00:00Z",
    });
    renderPane(buildE2eDeliverableMemo());

    await screen.findByText(/AI draft — edit to override/i);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    const textarea = screen.getByPlaceholderText(/Write the IC recommendation/i);
    await user.clear(textarea);
    await user.type(textarea, "My revised recommendation.");
    await user.click(screen.getByRole("button", { name: /^Save$/ }));

    expect(mockSave).toHaveBeenCalledWith("deal-1", "My revised recommendation.");
    expect(await screen.findByText("My revised recommendation.")).toBeInTheDocument();
    expect(screen.getByText(/overrides the AI draft/i)).toBeInTheDocument();
  });

  it("never renders icRecommendation.highlightBullets — that field is deliberately excluded here", async () => {
    const memo = buildE2eDeliverableMemo();
    expect(memo.deliverable?.icRecommendation.highlightBullets?.length).toBeGreaterThan(0);

    renderPane(memo);
    await screen.findByText(/Recommend the IC approve/);
    for (const bullet of memo.deliverable!.icRecommendation.highlightBullets!) {
      expect(screen.queryByText(bullet.value as string)).not.toBeInTheDocument();
    }
  });
});
