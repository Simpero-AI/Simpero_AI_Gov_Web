import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PatternRecognitionCard } from "./PatternRecognitionCard";

afterEach(cleanup);

describe("PatternRecognitionCard", () => {
  it("renders the honest empty state, no fabricated pattern content", () => {
    render(<PatternRecognitionCard />);

    expect(screen.getByRole("region", { name: "Pattern Recognition" })).toBeInTheDocument();
    expect(screen.getByText("No decline patterns yet")).toBeInTheDocument();
  });
});
