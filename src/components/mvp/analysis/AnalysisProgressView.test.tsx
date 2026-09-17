import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AnalysisProgressView } from "./AnalysisProgressView";
import type { PipelineStepWithStatus } from "@shared/pipelineSteps";

afterEach(cleanup);

const STEPS: PipelineStepWithStatus[] = [
  { phase: "parsing", title: "Parsing & extracting", detail: "…", status: "failed" },
  { phase: "verification", title: "Verifying claims", detail: "…", status: "pending" },
];

describe("AnalysisProgressView", () => {
  it("shows the in-progress framing when not failed", () => {
    render(
      <AnalysisProgressView
        fileName="deck.pdf"
        steps={[
          { phase: "parsing", title: "Parsing & extracting", detail: "…", status: "current" },
          { phase: "verification", title: "Verifying claims", detail: "…", status: "pending" },
        ]}
        startedAt={new Date().toISOString()}
        endedAt={null}
      />
    );
    expect(screen.getByText("Analyzing your document")).toBeInTheDocument();
    expect(screen.getByText("Can take up to ~15 minutes for large documents")).toBeInTheDocument();
  });

  it("drops the in-progress framing on a failed job instead of contradicting the caller's failure banner (FE-7)", () => {
    render(
      <AnalysisProgressView
        fileName="Acme Corp"
        steps={STEPS}
        startedAt={new Date(Date.now() - 15_000).toISOString()}
        endedAt={null}
        failed
      />
    );
    expect(screen.queryByText("Analyzing your document")).not.toBeInTheDocument();
    expect(screen.getByText("Analysis failed")).toBeInTheDocument();
    expect(screen.queryByText("Getting started…")).not.toBeInTheDocument();
    expect(screen.queryByText("Can take up to ~15 minutes for large documents")).not.toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});
