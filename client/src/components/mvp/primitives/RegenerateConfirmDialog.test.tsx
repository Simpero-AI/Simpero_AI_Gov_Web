import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { RegenerateConfirmDialog } from "./RegenerateConfirmDialog";

afterEach(cleanup);

describe("RegenerateConfirmDialog", () => {
  it("calls onConfirm when user clicks Regenerate", () => {
    const onConfirm = vi.fn();
    render(
      <RegenerateConfirmDialog
        open
        onOpenChange={() => {}}
        onConfirm={onConfirm}
        scope="all"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("warns about edit replacement when scope is 'all'", () => {
    render(
      <RegenerateConfirmDialog
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
        scope="all"
      />,
    );
    expect(
      screen.getByText(/current edits will be replaced/i),
    ).toBeInTheDocument();
  });

  it("shows section-specific copy when scope is 'section'", () => {
    render(
      <RegenerateConfirmDialog
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
        scope="section"
        sectionLabel="Risk Register"
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Risk Register/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/one composer for the Risk Register block/i),
    ).toBeInTheDocument();
  });
});
