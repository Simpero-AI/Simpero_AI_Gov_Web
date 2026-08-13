import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceInspector } from "./SourceInspector";

afterEach(cleanup);

describe("SourceInspector", () => {
  it("defaults to Full Page mode and switches to Verbatim Quote", async () => {
    const user = userEvent.setup();
    render(
      <SourceInspector
        onClose={vi.fn()}
        docName="CIM.pdf"
        quote="Revenue grew 40% year over year."
        page={12}
        section="Financial Overview"
        verification="verified"
      />
    );
    expect(screen.getByRole("button", { name: "Full Page" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/rendered from source document/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verbatim Quote" }));
    expect(screen.getByRole("button", { name: "Verbatim Quote" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/rendered from source document/i)).not.toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <SourceInspector onClose={onClose} docName="CIM.pdf" quote="quote" verification="unverified" />
    );
    await user.click(container.querySelector('[aria-hidden="true"]')!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
