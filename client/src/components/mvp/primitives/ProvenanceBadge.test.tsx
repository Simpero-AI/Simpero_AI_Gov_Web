import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProvenanceBadge } from "./ProvenanceBadge";

afterEach(cleanup);

describe("ProvenanceBadge", () => {
  it("renders extracted without citationVerified as '◑ Partial'", () => {
    render(<ProvenanceBadge provenance="extracted" />);
    expect(screen.getByText("◑ Partial")).toBeInTheDocument();
  });

  it("renders extracted + citationVerified=true as '✓ Verified'", () => {
    render(<ProvenanceBadge provenance="extracted" citationVerified={true} />);
    expect(screen.getByText("✓ Verified")).toBeInTheDocument();
  });

  it("renders extracted + citationVerified=false as '◑ Partial'", () => {
    render(<ProvenanceBadge provenance="extracted" citationVerified={false} />);
    expect(screen.getByText("◑ Partial")).toBeInTheDocument();
  });

  it.each([
    "synthesized",
    "modeled",
    "stub",
    "missing",
  ] as const)("renders no badge for %s", (prov) => {
    const { container } = render(<ProvenanceBadge provenance={prov} />);
    expect(container).toBeEmptyDOMElement();
  });
});
