import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AgentStatusStepList } from "./AgentStatusStepList";
import { PIPELINE_STEPS, computeStepStatuses } from "@shared/pipelineSteps";

describe("AgentStatusStepList", () => {
  afterEach(() => cleanup());

  it("renders all pipeline step titles", () => {
    const steps = computeStepStatuses(null, false);
    render(<AgentStatusStepList steps={steps} />);
    for (const step of PIPELINE_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it("shows the external data pill only under the current step", () => {
    const steps = computeStepStatuses("parsing", false);
    render(<AgentStatusStepList steps={steps} externalDataPill="cim.pdf" />);
    expect(screen.getByText("cim.pdf")).toBeInTheDocument();
  });

  it("shows a real duration next to a done step, formatted", () => {
    const steps = computeStepStatuses("verification", false); // parsing: done, verification: current
    render(
      <AgentStatusStepList steps={steps} stepDurations={{ parsing: 75 }} />
    );
    expect(screen.getByText("1m 15s")).toBeInTheDocument();
  });

  it("shows only the finished step's duration, never one for the still-running current step", () => {
    const steps = computeStepStatuses("verification", false); // parsing: done, verification: current
    render(
      <AgentStatusStepList steps={steps} stepDurations={{ parsing: 20 }} />
    );
    // Exactly one duration renders (parsing's, real) -- verification has none in
    // stepDurations (its run hasn't ended yet) and is "current", not "done".
    expect(screen.getAllByText(/^\d+(m \d+)?s$/)).toHaveLength(1);
    expect(screen.getByText("20s")).toBeInTheDocument();
  });

  it("hides a zero-second duration (a step we can't meaningfully time, e.g. verification)", () => {
    const steps = computeStepStatuses("analysis", false); // parsing + verification done
    render(
      <AgentStatusStepList steps={steps} stepDurations={{ parsing: 42, verification: 0 }} />
    );
    // Parsing's real time shows; verification's 0s is suppressed rather than
    // rendered as a misleading "0s".
    expect(screen.getByText("42s")).toBeInTheDocument();
    expect(screen.queryByText("0s")).not.toBeInTheDocument();
  });
});
