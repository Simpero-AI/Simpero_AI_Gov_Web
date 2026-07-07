import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SectorChip } from "./SectorChip";

afterEach(cleanup);

describe("SectorChip", () => {
  it("renders the sector label", () => {
    render(<SectorChip sector="AI/ML" />);
    expect(screen.getByText("AI/ML")).toBeInTheDocument();
  });
  it("falls back to a generic palette for unknown sectors", () => {
    const { container } = render(<SectorChip sector="Aerospace" />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText("Aerospace")).toBeInTheDocument();
  });
});
