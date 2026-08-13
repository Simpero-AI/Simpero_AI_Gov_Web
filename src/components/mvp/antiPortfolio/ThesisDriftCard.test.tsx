import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ThesisDriftCard } from "./ThesisDriftCard";

afterEach(cleanup);

describe("ThesisDriftCard", () => {
  it("renders the honest empty state, no fabricated drift content", () => {
    render(<ThesisDriftCard />);

    expect(screen.getByRole("region", { name: "Drift From Investment Thesis" })).toBeInTheDocument();
    expect(screen.getByText("No drift analysis yet")).toBeInTheDocument();
  });
});
