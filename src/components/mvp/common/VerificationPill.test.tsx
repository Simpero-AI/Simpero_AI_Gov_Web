import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VerificationPill } from "./VerificationPill";

afterEach(cleanup);

describe("VerificationPill", () => {
  it.each([
    ["verified", "Background Check"],
    ["pending", "Reference Check"],
    ["failed", "Employment Verification"],
  ] as const)("renders the %s state with its label", (state, label) => {
    render(<VerificationPill state={state} label={label} detail="Some detail" />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("Some detail")).toBeInTheDocument();
  });
});
