import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { formatBpAsPct, formatUsdShort } from "@/lib/dealMetricsFormat";
import { DeclineCard, type DeclineRecord } from "./DeclineCard";

afterEach(cleanup);

const fixture: DeclineRecord = {
  id: "decline-1",
  name: "Northwind Robotics",
  sector: "Industrial Automation",
  passedDate: "2024-03-15",
  reason: "Concentration risk",
  category: "missed",
  valuationAtPassCents: 500_000_000, // $5.0M
  valuationNowCents: 1_200_000_000, // $12.0M
  changeBp: 14_000, // +140.0%
  statusNow: "Raised Series C at 3x",
  note: "Should have pushed harder on the customer concentration mitigants.",
};

describe("DeclineCard", () => {
  it("renders valuation-at-pass and valuation-now via the real USD formatter, not raw cents", () => {
    render(<DeclineCard record={fixture} />);

    expect(screen.getByText(formatUsdShort(fixture.valuationAtPassCents!))).toBeInTheDocument();
    expect(screen.getByText(formatUsdShort(fixture.valuationNowCents!))).toBeInTheDocument();
    expect(screen.queryByText(String(fixture.valuationAtPassCents))).not.toBeInTheDocument();
    expect(screen.queryByText(String(fixture.valuationNowCents))).not.toBeInTheDocument();
  });

  it("renders the change since pass via the real basis-point formatter, not raw basis points", () => {
    render(<DeclineCard record={fixture} />);

    expect(screen.getByText(`+${formatBpAsPct(fixture.changeBp!)} since pass`)).toBeInTheDocument();
    expect(screen.queryByText(String(fixture.changeBp))).not.toBeInTheDocument();
  });

  it("renders name, status, and note", () => {
    render(<DeclineCard record={fixture} />);

    expect(screen.getByText(fixture.name)).toBeInTheDocument();
    expect(screen.getByText(fixture.statusNow)).toBeInTheDocument();
    expect(screen.getByText(fixture.note)).toBeInTheDocument();
  });

  it("falls back to em dashes and 'Not yet known' when valuation/change fields are null", () => {
    const unknown: DeclineRecord = {
      ...fixture,
      valuationAtPassCents: null,
      valuationNowCents: null,
      changeBp: null,
    };
    render(<DeclineCard record={unknown} />);

    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("Not yet known")).toBeInTheDocument();
  });
});
