import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DualBarRow, LabeledBarRow } from "./BarRow";

afterEach(cleanup);

describe("LabeledBarRow", () => {
  it("renders label + value and clamps the fill width", () => {
    const { container } = render(<LabeledBarRow label="High" value={3} pct={140} />);
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    const fill = container.querySelector('[style*="width"]') as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });
});

describe("DualBarRow", () => {
  it("renders both series plus the delta column", () => {
    render(
      <DualBarRow
        label="Q1"
        portfolio={{ pct: 60, valueLabel: "+4.2%" }}
        benchmark={{ pct: 40, valueLabel: "+1.1%" }}
        deltaLabel="+3.1%"
      />
    );
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("+4.2%")).toBeInTheDocument();
    expect(screen.getByText("+1.1%")).toBeInTheDocument();
    expect(screen.getByText("+3.1%")).toBeInTheDocument();
  });
});
