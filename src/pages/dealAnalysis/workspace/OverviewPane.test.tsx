import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { OverviewPane } from "./OverviewPane";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { ICMemoResult } from "@shared/simperoTypes";

afterEach(cleanup);

describe("OverviewPane", () => {
  it("renders honest empty-states for every section when there is no memo", () => {
    render(<OverviewPane memoTyped={null} />);
    expect(screen.getByText("Diligence summary not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("No risks registered yet")).toBeInTheDocument();
    expect(screen.getByText("No documents uploaded yet")).toBeInTheDocument();
    // "Top Open Findings" is always empty regardless of fixture — no backend.
    expect(screen.getByText("No findings logged yet")).toBeInTheDocument();
    // Workstream Progress still renders all 6 categories as "Not started".
    for (const category of [
      "Legal & Corporate",
      "Financial",
      "Technology & IP",
      "Commercial",
      "Team & HR",
      "Market & Strategy",
    ]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("derives progress ring, complete/in-review/not-started counts, and workstream bars from real categories (absent categories = not started)", () => {
    const base = buildE2eDeliverableMemo();
    const memo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        dueDiligenceSummary: {
          categories: [
            {
              category: "Legal & Corporate",
              status: { value: "complete", provenance: "synthesized" },
              findings: { value: "No red flags.", provenance: "synthesized" },
              completenessPct: { value: 100, provenance: "synthesized" },
              flaggedCount: { value: 0, provenance: "synthesized" },
            },
            {
              category: "Financial",
              status: { value: "in_progress", provenance: "synthesized" },
              findings: { value: "Still reviewing.", provenance: "synthesized" },
              completenessPct: { value: 50, provenance: "synthesized" },
              flaggedCount: { value: 1, provenance: "synthesized" },
            },
            {
              category: "Technology & IP",
              status: { value: "complete", provenance: "synthesized" },
              findings: { value: "Clean IP.", provenance: "synthesized" },
              completenessPct: { value: 90, provenance: "synthesized" },
              flaggedCount: { value: 0, provenance: "synthesized" },
            },
          ],
          conclusion: { value: "Partial DD complete.", provenance: "synthesized" },
        },
      },
    };
    render(<OverviewPane memoTyped={memo} />);

    // 2 complete, 1 in review, 3 absent from the 6-category universe = not started.
    const progressCard = screen.getByText("Diligence Progress").closest(".rounded-xl") as HTMLElement;
    expect(within(progressCard).getByText("2")).toBeInTheDocument(); // Complete count
    expect(within(progressCard).getByText("1")).toBeInTheDocument(); // In review count
    expect(within(progressCard).getByText("3")).toBeInTheDocument(); // Not started count

    // progressPct = round((100 + 50 + 90) / 6) = 40.
    expect(screen.getByRole("img", { name: "40% complete" })).toBeInTheDocument();

    // Workstream Progress bars: real percentages for present categories,
    // "—" placeholder for the 3 absent ("not started") categories.
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);

    expect(screen.queryByText("Diligence summary not yet extracted")).not.toBeInTheDocument();
  });

  it("derives Risk Profile H/M/L counts and overall exposure from riskRegister severities", () => {
    const base = buildE2eDeliverableMemo();
    const memo: ICMemoResult = {
      ...base,
      deliverable: {
        ...base.deliverable!,
        riskRegister: {
          value: [
            { risk: "Key-person dependency", severity: "H" },
            { risk: "Customer concentration", severity: "M" },
            { risk: "Regulatory exposure", severity: "M" },
            { risk: "Minor tooling gap", severity: "L" },
          ],
          provenance: "synthesized",
        },
      },
    };
    render(<OverviewPane memoTyped={memo} />);

    const riskCard = screen.getByText("Risk Profile").closest(".rounded-xl") as HTMLElement;
    // Overall exposure headline + the "High" severity bar label — 2 occurrences.
    expect(within(riskCard).getAllByText("High")).toHaveLength(2);
    expect(within(riskCard).getByText("overall exposure")).toBeInTheDocument();
    // H=1, M=2, L=1 — the "1" value renders for both the High and Low bars.
    expect(within(riskCard).getAllByText("1")).toHaveLength(2);
    expect(within(riskCard).getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("No risks registered yet")).not.toBeInTheDocument();
  });

  it("always shows the honest 'Top Open Findings' empty state, even with a fully populated memo", () => {
    render(<OverviewPane memoTyped={buildE2eDeliverableMemo()} />);
    expect(screen.getByText("No findings logged yet")).toBeInTheDocument();
    expect(screen.getByText("Not yet wired to a backend")).toBeInTheDocument();
  });
});
