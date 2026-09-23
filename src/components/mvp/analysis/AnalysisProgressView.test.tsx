import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AnalysisProgressView } from "./AnalysisProgressView";
import type { PipelineStepWithStatus } from "@shared/pipelineSteps";
import { LLM_CREDIT_EXHAUSTED_CODE } from "@shared/dealsStatus";

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

  it("softens the framing to 'paused' and names the cause on a credit/usage-limit failure", () => {
    render(
      <AnalysisProgressView
        fileName="Acme Corp"
        steps={STEPS}
        startedAt={new Date(Date.now() - 15_000).toISOString()}
        endedAt={null}
        failed
        errorCode={LLM_CREDIT_EXHAUSTED_CODE}
      />
    );
    expect(screen.getByText("Analysis paused")).toBeInTheDocument();
    expect(screen.queryByText("Analysis failed")).not.toBeInTheDocument();
    expect(
      screen.getByText("Paused on an AI provider credit or usage limit — see above.")
    ).toBeInTheDocument();
  });

  it("relabels a credit-blocked document's finding as 'paused', not 'rejected'", () => {
    // A run that went terminal before the backend started stamping such docs
    // "paused" still carries the raw "rejected" outcome; on a credit failure the
    // view must render it as paused so it doesn't read as a bad document.
    render(
      <AnalysisProgressView
        fileName="Acme Corp"
        steps={STEPS}
        startedAt={new Date(Date.now() - 15_000).toISOString()}
        endedAt={null}
        failed
        errorCode={LLM_CREDIT_EXHAUSTED_CODE}
        jobComments={[
          {
            dataSourceId: "ds-1",
            fileName: "cim.pdf",
            status: "rejected",
            comment: "You have reached your specified API usage limits.",
          },
        ]}
      />
    );
    expect(screen.getByText("paused")).toBeInTheDocument();
    expect(screen.queryByText("rejected")).not.toBeInTheDocument();
  });
});
