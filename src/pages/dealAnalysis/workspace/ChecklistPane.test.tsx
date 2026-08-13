import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChecklistPane } from "./ChecklistPane";

afterEach(cleanup);

describe("ChecklistPane", () => {
  it("renders a disabled Add request button and an empty checklist", () => {
    render(<ChecklistPane />);
    expect(screen.getByRole("button", { name: /add request/i })).toBeDisabled();
    expect(screen.getByText("0 of 0 requests complete")).toBeInTheDocument();
    expect(screen.getByText("No checklist requests yet")).toBeInTheDocument();
  });
});
