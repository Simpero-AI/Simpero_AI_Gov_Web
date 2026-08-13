import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SectorIntelPane } from "./SectorIntelPane";

afterEach(cleanup);

describe("SectorIntelPane", () => {
  it("renders a bare empty state, no fabricated sector cards", () => {
    render(<SectorIntelPane />);

    expect(screen.getByText("No sector intelligence yet")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
