import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RadialProgress } from "./RadialProgress";

afterEach(cleanup);

describe("RadialProgress", () => {
  it("renders a rounded percentage label by default", () => {
    render(<RadialProgress value={62.4} />);
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "62% complete" })).toBeInTheDocument();
  });

  it("clamps out-of-range values into 0-100", () => {
    render(<RadialProgress value={140} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders a caption at size=lg", () => {
    render(<RadialProgress value={40} size="lg" caption="40% done" />);
    expect(screen.getByText("40% done")).toBeInTheDocument();
  });
});
