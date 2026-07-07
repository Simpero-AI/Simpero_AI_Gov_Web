import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProvenanceGlyph } from "./ProvenanceGlyph";

afterEach(cleanup);

describe("ProvenanceGlyph", () => {
  it("renders XLSX label for xlsx source", () => {
    render(<ProvenanceGlyph source="xlsx" />);
    expect(screen.getByText("XLSX")).toBeInTheDocument();
  });
  it("renders CIM label for claim_extract source", () => {
    render(<ProvenanceGlyph source="claim_extract" />);
    expect(screen.getByText("CIM")).toBeInTheDocument();
  });
});
