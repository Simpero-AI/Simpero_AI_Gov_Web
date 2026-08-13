import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FindingsTab } from "./FindingsTab";

afterEach(cleanup);

describe("FindingsTab", () => {
  it("renders a disabled 'Log a finding' action with no fake persisted state", () => {
    render(<FindingsTab />);
    const logButton = screen.getByRole("button", { name: /log a finding/i });
    expect(logButton).toBeDisabled();
    expect(screen.getByText("0 open · 0 resolved")).toBeInTheDocument();
    expect(screen.getByText(/isn't persisted yet/i)).toBeInTheDocument();
    expect(screen.getByText("No findings logged yet")).toBeInTheDocument();
  });

  it("renders CorroborationPanel's own graceful empty state for zero items, with no special-casing needed", () => {
    render(<FindingsTab />);
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
    // Confirms it's the true empty-state branch, not a populated panel.
    expect(screen.queryByText(/^Corroboration \(/)).not.toBeInTheDocument();
  });
});
