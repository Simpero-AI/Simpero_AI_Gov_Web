import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MissingDataPlaceholder } from "./MissingDataPlaceholder";

afterEach(cleanup);

describe("MissingDataPlaceholder", () => {
  it("renders 'N/A' without a gapRef", () => {
    render(<MissingDataPlaceholder />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
  it("renders N/A regardless of gapRef", () => {
    render(<MissingDataPlaceholder gapRef="G-41" />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.queryByText("G-41")).toBeNull();
  });
  it("renders a tooltip when reason is supplied", () => {
    render(<MissingDataPlaceholder gapRef="G-33" reason="insufficient_evidence" />);
    const node = screen.getByTestId("missing-placeholder");
    expect(node.getAttribute("title")?.toLowerCase()).toContain("not enough source evidence");
  });
});
