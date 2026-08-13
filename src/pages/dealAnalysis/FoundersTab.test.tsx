import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FoundersTab } from "./FoundersTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { ICMemoResult } from "@shared/simperoTypes";

afterEach(cleanup);

describe("FoundersTab", () => {
  it("renders the honest empty-state when there is no managementTeam data", () => {
    render(<FoundersTab memoTyped={null} />);
    expect(screen.getByText("Founder & leadership profiles not yet extracted")).toBeInTheDocument();
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("renders real founder name/title/background and the keyAchievement as a pull-quote shown once, not duplicated into Track Record", () => {
    const memo = buildE2eDeliverableMemo();
    render(<FoundersTab memoTyped={memo} />);

    expect(screen.getByText("Jane Founder")).toBeInTheDocument();
    expect(screen.getByText("CEO & Co-Founder")).toBeInTheDocument();
    expect(screen.getByText("10y fintech")).toBeInTheDocument();

    // The pull-quote renders the achievement sentence once, wrapped in curly quotes.
    expect(screen.getByText("Scaled prior company to $100M ARR")).toBeInTheDocument();

    // Track Record has no separate backing field — it must show its own
    // honest empty-state, not a fabricated duplicate of the pull-quote.
    expect(screen.getByText("Track record claims not yet available")).toBeInTheDocument();
    expect(
      screen.getByText(/the one achievement sentence the pipeline does produce is shown as the pull-quote above/i)
    ).toBeInTheDocument();

    // Background checks / employment history are likewise unbacked today.
    expect(screen.getByText("Background checks not yet available")).toBeInTheDocument();
    expect(screen.getByText("Employment history not yet available")).toBeInTheDocument();
  });

  it("only shows the Compare toggle with 2+ founders, and the comparison table renders each founder's real fields", async () => {
    const user = userEvent.setup();
    const base = buildE2eDeliverableMemo();
    const soloMemo = base;
    const { unmount } = render(<FoundersTab memoTyped={soloMemo} />);
    expect(screen.queryByRole("button", { name: /compare founders/i })).not.toBeInTheDocument();
    unmount();

    const twoFounderMemo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        managementTeam: {
          value: [
            { name: "Jane Founder", title: "CEO & Co-Founder", background: "10y fintech", keyAchievement: "Scaled prior company to $100M ARR" },
            { name: "Sam Cofounder", title: "CTO & Co-Founder", background: "Ex-Google infra lead", keyAchievement: "Built payments infra at scale" },
          ],
          provenance: "synthesized",
        },
      },
    };
    render(<FoundersTab memoTyped={twoFounderMemo} />);

    const compareButton = screen.getByRole("button", { name: /compare founders/i });
    expect(compareButton).toBeInTheDocument();
    expect(screen.getByText("Sam Cofounder")).toBeInTheDocument();

    await user.click(compareButton);
    expect(screen.getByRole("button", { name: /hide comparison/i })).toBeInTheDocument();
    // Comparison table column headers are the founder names, plus a Key Achievement row.
    const table = screen.getByRole("table");
    expect(within(table).getByText("Sam Cofounder")).toBeInTheDocument();
    expect(within(table).getByText("Key Achievement")).toBeInTheDocument();
    expect(within(table).getByText("Built payments infra at scale")).toBeInTheDocument();
  });
});
