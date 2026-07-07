import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("renders segments joined by ' / '", () => {
    render(<Breadcrumb segments={["Overview", "Dashboard"]} />);
    expect(screen.getByText("Overview / Dashboard")).toBeInTheDocument();
  });

  it("renders nothing if segments is empty", () => {
    const { container } = render(<Breadcrumb segments={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
