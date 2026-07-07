import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DiscrepancyChip } from "./DiscrepancyChip";

afterEach(cleanup);

describe("DiscrepancyChip", () => {
  it("renders the ⚠ trigger with aria-label", () => {
    render(
      <DiscrepancyChip
        discrepancy={{
          field: "revenueLatestUsd",
          xlsxValue: 5_000_000_000,
          claimValue: 4_200_000_000,
          deltaPct: 16,
        }}
      />
    );
    expect(screen.getByLabelText(/discrepancy on revenueLatestUsd/i)).toBeInTheDocument();
    expect(screen.getByText("⚠")).toBeInTheDocument();
  });
});
