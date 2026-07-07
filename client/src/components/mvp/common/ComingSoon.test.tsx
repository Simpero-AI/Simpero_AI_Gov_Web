import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ComingSoon } from "./ComingSoon";

afterEach(cleanup);

describe("ComingSoon", () => {
  it("renders the feature label", () => {
    render(<ComingSoon feature="Mandate Config" />);
    expect(screen.getByText(/mandate config/i)).toBeInTheDocument();
  });

  it("renders feature text regardless of gapRef — no tracking link ever shown", () => {
    render(<ComingSoon feature="Mandate Config" gapRef="G-10" />);
    expect(screen.getByText(/mandate config.*coming soon/i)).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
