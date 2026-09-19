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

  it("renders the full trust-status ladder from statusCounts with each status's own label", () => {
    render(
      <CorroborationPanel
        items={[{ id: "1", name: "cim.pdf · p.12", kind: "document", citeCount: 4 }]}
        statusCounts={[
          { status: "conflicted", count: 1 },
          { status: "verified", count: 3 },
          { status: "cited", count: 2 },
        ]}
      />
    );
    // conflicted and cited keep their own labels — not force-mapped to "Unverified".
    expect(screen.getByText("3 Verified")).toBeInTheDocument();
    expect(screen.getByText("2 Cited")).toBeInTheDocument();
    expect(screen.getByText("1 Conflicted")).toBeInTheDocument();
    expect(screen.queryByText(/Unverified/)).not.toBeInTheDocument();
  });

  it("orders statusCounts by the canonical ladder and drops zero counts", () => {
    render(
      <CorroborationPanel
        items={[{ id: "1", name: "cim.pdf", kind: "document" }]}
        statusCounts={[
          { status: "inconclusive", count: 1 },
          { status: "verified", count: 2 },
          { status: "partially_verified", count: 0 },
        ]}
      />
    );
    const header = screen.getByRole("button");
    // verified before inconclusive, per TRUST_STATUS_ORDER; the zero-count
    // partially_verified is omitted.
    expect(header.textContent).toMatch(/2 Verified.*1 Inconclusive/);
    expect(screen.queryByText(/Partial/)).not.toBeInTheDocument();
  });

  it("renders an unknown status (a backend rename) with its raw label, sorted after the known ladder", () => {
    render(
      <CorroborationPanel
        items={[{ id: "1", name: "cim.pdf", kind: "document" }]}
        statusCounts={[
          { status: "embargoed", count: 1 },
          { status: "verified", count: 2 },
        ]}
      />
    );
    const header = screen.getByRole("button");
    // The unrecognised status still renders legibly (raw value) rather than a
    // blank, and sorts after every known ladder entry.
    expect(screen.getByText("1 embargoed")).toBeInTheDocument();
    expect(header.textContent).toMatch(/2 Verified.*1 embargoed/);
  });
});
