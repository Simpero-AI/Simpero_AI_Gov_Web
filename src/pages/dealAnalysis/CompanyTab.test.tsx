import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CompanyTab } from "./CompanyTab";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";
import type { ICMemoResult } from "@shared/simperoTypes";

afterEach(cleanup);

describe("CompanyTab", () => {
  it("renders honest empty-states for every section when there is no memo", () => {
    render(<CompanyTab memoTyped={null} />);
    expect(screen.getByText("Company facts not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Co-investor data coming soon")).toBeInTheDocument();
    expect(screen.getByText("Business model details not yet extracted")).toBeInTheDocument();
    expect(screen.getByText("Key customer data coming soon")).toBeInTheDocument();
    expect(screen.getByText("Funding history coming soon")).toBeInTheDocument();
    expect(screen.getByText("Geographic breakdown coming soon")).toBeInTheDocument();
    expect(screen.getByText("IP & compliance data coming soon")).toBeInTheDocument();
    expect(screen.getByText("Technology & operations details coming soon")).toBeInTheDocument();
    // No fabricated corroboration when nothing real was rendered.
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("renders the real companyOverview fields (founded/HQ/employees, products, revenue mix) instead of the empty-states", () => {
    const memo = buildE2eDeliverableMemo();
    render(<CompanyTab memoTyped={memo} />);

    expect(screen.getByText("2018")).toBeInTheDocument();
    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.queryByText("Company facts not yet extracted")).not.toBeInTheDocument();

    expect(screen.getByText("Core Platform")).toBeInTheDocument();
    expect(screen.getByText("API-first ledger for B2B payments.")).toBeInTheDocument();
    expect(screen.getByText("Revenue Mix — Subscription")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.queryByText("Business model details not yet extracted")).not.toBeInTheDocument();

    // Sections with genuinely no backing field stay honest even with a fully-populated memo.
    expect(screen.getByText("Co-investor data coming soon")).toBeInTheDocument();
    expect(screen.getByText("Key customer data coming soon")).toBeInTheDocument();
  });

  it("labels ofac_screening honestly as sanctions screening (not fabricated IP/patent data) and reflects a CLEAR result", () => {
    const memo: ICMemoResult = {
      ...buildE2eDeliverableMemo(),
      ofac_screening: {
        results: [],
        entitiesScreened: 3,
        possibleMatches: 0,
        confirmedMatches: 0,
        screeningAvailable: true,
        screenedAt: "2026-01-01T00:00:00.000Z",
      },
    };
    render(<CompanyTab memoTyped={memo} />);
    expect(screen.getByText(/OFAC Sanctions Screening — Clear/)).toBeInTheDocument();
    expect(screen.getByText(/3 entities screened/)).toBeInTheDocument();
    expect(screen.getByText(/Patent and licensing data aren't extracted/)).toBeInTheDocument();
    expect(screen.queryByText("IP & compliance data coming soon")).not.toBeInTheDocument();
  });

  it("flags a confirmed OFAC match distinctly from a clear result", () => {
    const memo: ICMemoResult = {
      ...buildE2eDeliverableMemo(),
      ofac_screening: {
        results: [
          {
            entity: "Acme Holdings",
            entityType: "organization",
            status: "CONFIRMED_MATCH",
            matchedName: "Acme Holdings Ltd",
            screened_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        entitiesScreened: 1,
        possibleMatches: 0,
        confirmedMatches: 1,
        screeningAvailable: true,
        screenedAt: "2026-01-01T00:00:00.000Z",
      },
    };
    render(<CompanyTab memoTyped={memo} />);
    expect(screen.getByText(/OFAC Sanctions Screening — Confirmed Match/)).toBeInTheDocument();
    expect(screen.getByText("Acme Holdings")).toBeInTheDocument();
    expect(screen.getByText(/Matched: Acme Holdings Ltd/)).toBeInTheDocument();
  });
});
