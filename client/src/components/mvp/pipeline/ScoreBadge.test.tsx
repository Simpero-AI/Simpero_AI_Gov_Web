import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScoreBadge, scoreTone } from "./ScoreBadge";

afterEach(cleanup);

describe("scoreTone (policy)", () => {
  it("null → empty", () => expect(scoreTone(null)).toBe("empty"));
  it(">= 7.5 → high", () => {
    expect(scoreTone(7.5)).toBe("high");
    expect(scoreTone(9.2)).toBe("high");
  });
  it("5..7.4 → mid", () => {
    expect(scoreTone(5)).toBe("mid");
    expect(scoreTone(7.4)).toBe("mid");
  });
  it("< 5 → low", () => {
    expect(scoreTone(4.9)).toBe("low");
    expect(scoreTone(0)).toBe("low");
  });
});

describe("ScoreBadge", () => {
  it("renders '—' when score is null", () => {
    render(<ScoreBadge score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
  it("renders score with outOf default 10", () => {
    render(<ScoreBadge score={7.85} />);
    expect(screen.getByText(/7\.85/)).toBeInTheDocument();
    expect(screen.getByText(/\/10/)).toBeInTheDocument();
  });
});
