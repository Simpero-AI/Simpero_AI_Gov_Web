import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MetricVerificationChip } from "./MetricVerificationChip";

afterEach(cleanup);

describe("MetricVerificationChip", () => {
  it("renders 'Verified' for tier=high", () => {
    render(<MetricVerificationChip tier="high" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });
  it("renders 'Extracted' for tier=medium", () => {
    render(<MetricVerificationChip tier="medium" />);
    expect(screen.getByText("Extracted")).toBeInTheDocument();
  });
  it("renders 'Unverified' for tier=low", () => {
    render(<MetricVerificationChip tier="low" />);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });
  it("renders nothing when tier is undefined", () => {
    const { container } = render(<MetricVerificationChip tier={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
