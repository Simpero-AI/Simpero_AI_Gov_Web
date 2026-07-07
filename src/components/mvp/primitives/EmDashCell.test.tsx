import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EmDashCell } from "./EmDashCell";

afterEach(cleanup);

describe("EmDashCell", () => {
  it("renders an em-dash with cursor-help", () => {
    render(<EmDashCell />);
    const cell = screen.getByText("—");
    expect(cell).toBeInTheDocument();
    expect(cell).toHaveClass("cursor-help");
  });
});
