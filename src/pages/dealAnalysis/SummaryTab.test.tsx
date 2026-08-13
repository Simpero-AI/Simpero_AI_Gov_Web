import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SummaryTab } from "./SummaryTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { GovernanceFlag, ICMemoResult } from "@shared/simperoTypes";

afterEach(cleanup);

describe("SummaryTab", () => {
  it("renders the missing-data placeholder for Executive Summary and Risk Assessment when there is no memo", () => {
    render(<SummaryTab memoTyped={null} />);
    // Executive Summary + Risk Assessment both fall back to MissingDataPlaceholder.
    expect(screen.getAllByTestId("missing-placeholder").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument(); // Third-Party Reviews empty state
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("folds governance_flags and deliverable.riskRegister into one Risk Assessment table, high severity first", () => {
    const memo: ICMemoResult = {
      ...buildE2eDeliverableMemo(),
      governance_flags: [
        {
          category: "AML Screening Gap",
          description: "No documented AML policy on file.",
          severity: "H",
          regulation: "BSA/AML",
        } as GovernanceFlag,
      ],
    };
    render(<SummaryTab memoTyped={memo} />);

    // Both sources are present in the same table.
    expect(screen.getByText("AML Screening Gap")).toBeInTheDocument();
    expect(screen.getByText("Customer concentration")).toBeInTheDocument(); // from the fixture's riskRegister
    expect(screen.getByText("BSA/AML · Compliance")).toBeInTheDocument();
    expect(screen.getByText(/Medium probability · Business/)).toBeInTheDocument();

    // High-severity governance flag sorts ahead of the medium-severity register item.
    const rows = screen.getAllByRole("row").filter(r => r.textContent?.includes("AML Screening Gap") || r.textContent?.includes("Customer concentration"));
    expect(rows[0].textContent).toContain("AML Screening Gap");
    expect(rows[1].textContent).toContain("Customer concentration");
  });

  it("renders a visibly disabled IC Sign-off control with no fake success state", () => {
    render(<SummaryTab memoTyped={buildE2eDeliverableMemo()} />);
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
    expect(screen.getByText(/isn't persisted yet/i)).toBeInTheDocument();
  });

  it("derives real Corroboration counts from the memo's own Sourced citations rather than fabricating data", async () => {
    const user = userEvent.setup();
    const memo = buildE2eDeliverableMemo();
    render(<SummaryTab memoTyped={memo} />);

    // The fixture's deliverable fields are all `synthesized` (no document
    // citation) — none is a verified extraction, so the panel should report
    // Partial coverage only, grouped under the memo's own file name.
    expect(screen.getByText(/^Corroboration \(1 source\)$/)).toBeInTheDocument();
    expect(screen.getByText(/Partial/)).toBeInTheDocument();
    expect(screen.queryByText(/Verified/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText(memo.fileName)).toBeInTheDocument();
  });
});
