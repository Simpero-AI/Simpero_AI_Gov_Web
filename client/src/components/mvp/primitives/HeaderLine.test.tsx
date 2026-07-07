import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HeaderLine } from "./HeaderLine";

afterEach(cleanup);

describe("HeaderLine", () => {
  it("renders 'Not extracted' affordance when primary and secondary both missing", () => {
    render(<HeaderLine label="Valuation" primaryFormat={(n) => `$${n}`} emptyAffordance="Not extracted" />);
    expect(screen.getByText("Valuation:")).toBeInTheDocument();
    expect(screen.getByText("Not extracted")).toBeInTheDocument();
  });

  it("renders primary value + provenance glyph", () => {
    render(
      <HeaderLine
        label="Valuation"
        primary={{ value: 17_650_000_000, source: "claim_extract" }}
        primaryFormat={(n) => `$${(n / 100 / 1_000_000).toFixed(1)}M`}
        emptyAffordance="Not extracted"
      />
    );
    expect(screen.getByText("$176.5M")).toBeInTheDocument();
    expect(screen.getByText("CIM")).toBeInTheDocument();
  });

  it("renders em-dash for missing primary when secondary present", () => {
    render(
      <HeaderLine
        label="Valuation"
        secondary={{ value: 16_150_000_000, prefix: "(", suffix: " pre-money)" }}
        primaryFormat={(n) => `$${n}`}
        secondaryFormat={(n) => `$${(n / 100 / 1_000_000).toFixed(1)}M`}
        emptyAffordance="Not extracted"
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(/161\.5M/)).toBeInTheDocument();
  });
});
