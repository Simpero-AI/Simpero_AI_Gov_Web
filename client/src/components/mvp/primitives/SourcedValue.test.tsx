import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SourcedValue } from "./SourcedValue";

afterEach(cleanup);

describe("SourcedValue", () => {
  it("renders extracted scalar with badge", () => {
    render(
      <SourcedValue
        sourced={{
          value: 87,
          provenance: "extracted",
          citation: {
            page: 4,
            section: null,
            quote: "87 full-time",
            verified: true,
          },
        }}
        format={(v) => `${v as number} employees`}
      />,
    );
    expect(screen.getByText("87 employees")).toBeInTheDocument();
    expect(screen.getByText("✓ Verified")).toBeInTheDocument();
  });

  it("renders missing as N/A with gapRef", () => {
    render(
      <SourcedValue
        sourced={{ value: null, provenance: "missing", gapRef: "G-41" }}
      />,
    );
    expect(screen.getByText(/N\/A/)).toBeInTheDocument();
    expect(screen.queryByText("G-41")).toBeNull();
  });

  it("renders modeled with confidence tier", () => {
    render(
      <SourcedValue
        sourced={{
          value: 240000000,
          provenance: "modeled",
          confidence: "medium",
          evidenceAnchors: ["c1", "c2"],
        }}
        format={(v) => `$${v as number}`}
      />,
    );
    expect(screen.getByText("$240000000")).toBeInTheDocument();
    // modeled provenance renders no badge
    expect(screen.queryByText("✗ Unverified")).toBeNull();
    expect(screen.queryByText("AI Synthesized")).toBeNull();
  });

  it("renders stale wave-2 with a 'may be out of date' affordance", () => {
    render(
      <SourcedValue
        sourced={{ value: "old prose", provenance: "synthesized", stale: true }}
      />,
    );
    expect(screen.getByText("old prose")).toBeInTheDocument();
    expect(screen.getByText(/may not reflect latest edits/i)).toBeInTheDocument();
  });
});
