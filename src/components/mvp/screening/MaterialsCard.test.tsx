import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MaterialsCard } from "./MaterialsCard";
import type { DealDocument } from "@/api/documents";

afterEach(cleanup);

const doc = (over: Partial<DealDocument>): DealDocument => ({
  id: "d1",
  filename: "cim.pdf",
  status: "verified",
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("MaterialsCard", () => {
  it("lists every document with its review status when documents are provided", () => {
    render(
      <MaterialsCard
        documents={[
          doc({ id: "a", filename: "cim.pdf", status: "verified" }),
          doc({ id: "b", filename: "model.xlsx", status: "pending" }),
        ]}
        fileName="ignored.pdf"
      />
    );
    expect(screen.getByText("cim.pdf")).toBeInTheDocument();
    expect(screen.getByText("model.xlsx")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Verification pending")).toBeInTheDocument();
    expect(screen.getByText("2 documents on file")).toBeInTheDocument();
    // The documents listing supersedes the single-file fallback prop.
    expect(screen.queryByText("ignored.pdf")).not.toBeInTheDocument();
  });

  it("falls back to the single source file when there are no documents rows", () => {
    render(<MaterialsCard documents={[]} fileName="deck.pdf" />);
    expect(screen.getByText("deck.pdf")).toBeInTheDocument();
    expect(screen.getByText("Submitted via New Deal intake")).toBeInTheDocument();
  });

  it("shows a loading row instead of a false empty-state while documents load", () => {
    render(<MaterialsCard documents={null} fileName={null} isLoading />);
    expect(screen.getByText("Loading documents…")).toBeInTheDocument();
    expect(screen.queryByText("No materials on file for this deal yet.")).not.toBeInTheDocument();
  });

  it("shows the honest empty-state when a deal has neither documents nor a source file", () => {
    render(<MaterialsCard documents={[]} fileName={null} />);
    expect(screen.getByText("No materials on file for this deal yet.")).toBeInTheDocument();
  });
});
