import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MandateHistoryDrawer } from "./MandateHistoryDrawer";

afterEach(cleanup);

describe("MandateHistoryDrawer", () => {
  it("renders nothing when closed", () => {
    render(<MandateHistoryDrawer open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Mandate History")).not.toBeInTheDocument();
  });

  it("renders the honest 'not tracked yet' empty state when open, with no fabricated history entries", () => {
    render(<MandateHistoryDrawer open onOpenChange={vi.fn()} firmName="Acme Capital" />);

    expect(screen.getByText("Mandate History")).toBeInTheDocument();
    expect(screen.getByText("Change log · Acme Capital")).toBeInTheDocument();
    expect(screen.getByText("History isn't tracked yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Changes to firm profile, mandate parameters, and the scoring framework aren't versioned yet. Once change tracking ships, this will show who changed what and when."
      )
    ).toBeInTheDocument();

    // No fabricated change-log rows/list items.
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("omits the firm name from the subtitle when not provided", () => {
    render(<MandateHistoryDrawer open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Change log")).toBeInTheDocument();
  });
});
