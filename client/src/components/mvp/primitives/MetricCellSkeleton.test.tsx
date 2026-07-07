import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MetricCellSkeleton } from "./MetricCellSkeleton";

afterEach(cleanup);

describe("MetricCellSkeleton", () => {
  it("renders accessible loading state", () => {
    render(<MetricCellSkeleton />);
    expect(screen.getByLabelText("Loading metric")).toBeInTheDocument();
  });
});
