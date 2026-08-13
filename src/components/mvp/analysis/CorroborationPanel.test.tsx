import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CorroborationPanel } from "./CorroborationPanel";

afterEach(cleanup);

describe("CorroborationPanel", () => {
  it("renders the empty state when there are no items", () => {
    render(<CorroborationPanel items={[]} verifiedCount={0} partialCount={0} unverifiedCount={0} />);
    expect(screen.getByText(/no structured source citations/i)).toBeInTheDocument();
  });

  it("shows the header counts and reveals items on toggle", async () => {
    const user = userEvent.setup();
    render(
      <CorroborationPanel
        items={[{ id: "1", name: "CIM.pdf", kind: "document", citeCount: 3 }]}
        verifiedCount={2}
        partialCount={1}
        unverifiedCount={0}
      />
    );
    expect(screen.getByText("Corroboration (1 source)")).toBeInTheDocument();
    expect(screen.getByText("2 Verified")).toBeInTheDocument();
    expect(screen.getByText("1 Partial")).toBeInTheDocument();
    expect(screen.queryByText("CIM.pdf")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("CIM.pdf")).toBeInTheDocument();
    expect(screen.getByText("cited 3x")).toBeInTheDocument();
  });
});
