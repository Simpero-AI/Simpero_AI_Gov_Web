import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DraftMemoPane } from "./DraftMemoPane";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";

afterEach(cleanup);

describe("DraftMemoPane", () => {
  it("renders honest empty-states when there is no memo", () => {
    render(<DraftMemoPane memoTyped={null} />);
    expect(screen.getByTestId("missing-placeholder")).toBeInTheDocument();
    expect(screen.getByText("Merits not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Risks not yet extracted")).toBeInTheDocument();
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("renders the real Recommendation, Merits, and Risks from the memo instead of the empty-states", () => {
    const memo = buildE2eDeliverableMemo();
    render(<DraftMemoPane memoTyped={memo} />);

    expect(
      screen.getByText(/Recommend the IC approve a \$25M Series B ticket/)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("missing-placeholder")).not.toBeInTheDocument();

    expect(screen.getByText("Durable revenue growth")).toBeInTheDocument();
    expect(screen.getByText("Experienced team")).toBeInTheDocument();
    expect(screen.queryByText("Merits not yet extracted")).not.toBeInTheDocument();

    expect(screen.getByText("Customer concentration")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.queryByText("Risks not yet extracted")).not.toBeInTheDocument();
  });

  it("never renders icRecommendation.highlightBullets — that field is deliberately excluded here", () => {
    const memo = buildE2eDeliverableMemo();
    // Sanity-check the fixture actually carries highlightBullets, so this
    // test would fail if the pane ever started rendering them.
    expect(memo.deliverable?.icRecommendation.highlightBullets?.length).toBeGreaterThan(0);

    render(<DraftMemoPane memoTyped={memo} />);
    for (const bullet of memo.deliverable!.icRecommendation.highlightBullets!) {
      expect(screen.queryByText(bullet.value as string)).not.toBeInTheDocument();
    }
  });
});
