import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PlaybooksPane } from "./PlaybooksPane";

afterEach(cleanup);

describe("PlaybooksPane", () => {
  it("shows a disabled 'New playbook' button and an honest empty state, no fabricated cards", () => {
    render(<PlaybooksPane />);

    const newPlaybookButton = screen.getByRole("button", { name: "New playbook" });
    expect(newPlaybookButton).toBeDisabled();

    expect(screen.getByText("No playbooks yet")).toBeInTheDocument();
    // Only the disabled toolbar button — no card-grid buttons/links standing
    // in for real playbooks.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
