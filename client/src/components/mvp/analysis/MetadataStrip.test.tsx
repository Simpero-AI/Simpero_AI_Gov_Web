import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ICMemoResult } from "@shared/simperoTypes";
import { MetadataStrip } from "./MetadataStrip";

describe("MetadataStrip", () => {
  afterEach(() => cleanup());

  it("renders all top-level fields", () => {
    const memo = {
      fileName: "deal.pdf",
      pageCount: 87,
      processedAt: "2026-05-23T10:00:00Z",
      documentType: "CIM",
      resolvedJurisdiction: "US-DE",
      scorecard: {
        matchRate: 75,
        claimsMatched: 30,
        claimsExtracted: 40,
      },
    } as unknown as ICMemoResult;
    render(<MetadataStrip memo={memo} />);
    expect(screen.getByText("deal.pdf")).toBeInTheDocument();
    expect(screen.getByText("87 pages")).toBeInTheDocument();
    expect(screen.getByText("CIM")).toBeInTheDocument();
    expect(screen.getByText("US-DE")).toBeInTheDocument();
    expect(screen.getByText(/75% verified/)).toBeInTheDocument();
    expect(screen.getByText(/30\/40/)).toBeInTheDocument();
  });

  it("omits optional fields when absent", () => {
    const memo = {
      fileName: "deal.pdf",
      pageCount: 10,
      processedAt: "2026-05-23T10:00:00Z",
      scorecard: {
        matchRate: 0,
        claimsMatched: 0,
        claimsExtracted: 0,
      },
    } as unknown as ICMemoResult;
    render(<MetadataStrip memo={memo} />);
    expect(screen.queryByText("CIM")).not.toBeInTheDocument();
    expect(screen.queryByText("US-DE")).not.toBeInTheDocument();
    expect(screen.getByText("deal.pdf")).toBeInTheDocument();
    expect(screen.getByText("10 pages")).toBeInTheDocument();
  });
});
