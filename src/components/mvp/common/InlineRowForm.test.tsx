import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { InlineRowForm } from "./InlineRowForm";

afterEach(cleanup);

describe("InlineRowForm", () => {
  it("toggles between display and form via the render props", async () => {
    const user = userEvent.setup();
    render(
      <InlineRowForm
        renderDisplay={(startEdit) => (
          <button onClick={startEdit}>Edit row</button>
        )}
        renderForm={(stopEdit) => (
          <button onClick={stopEdit}>Cancel</button>
        )}
      />
    );
    expect(screen.getByText("Edit row")).toBeInTheDocument();

    await user.click(screen.getByText("Edit row"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.queryByText("Edit row")).not.toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.getByText("Edit row")).toBeInTheDocument();
  });
});
