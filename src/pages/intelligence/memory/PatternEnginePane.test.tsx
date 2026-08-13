import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PatternEnginePane } from "./PatternEnginePane";

afterEach(cleanup);

describe("PatternEnginePane", () => {
  it("renders a bare empty state, no fabricated pattern cards", () => {
    render(<PatternEnginePane />);

    expect(screen.getByText("No patterns detected yet")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
