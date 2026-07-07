import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AgentStatusStepList } from "./AgentStatusStepList";
import { PIPELINE_STEPS, computeStepStatuses } from "@shared/pipelineSteps";

describe("AgentStatusStepList", () => {
  afterEach(() => cleanup());

  it("shows a live section counter next to the current pass1 step (issue: looks stuck during Pass 1)", () => {
    const steps = computeStepStatuses("pass1", false);
    render(<AgentStatusStepList steps={steps} phaseProgress={{ completed: 3, total: 8 }} />);
    expect(screen.getByText("(3 of 8 sections)")).toBeInTheDocument();
  });

  it("does not show the counter for a different current phase", () => {
    const steps = computeStepStatuses("pass2", false);
    render(<AgentStatusStepList steps={steps} phaseProgress={{ completed: 3, total: 8 }} />);
    expect(screen.queryByText(/of 8 sections/)).not.toBeInTheDocument();
  });

  it("does not show the counter when phaseProgress is absent", () => {
    const steps = computeStepStatuses("pass1", false);
    render(<AgentStatusStepList steps={steps} />);
    expect(screen.queryByText(/sections\)/)).not.toBeInTheDocument();
  });

  it("does not show the counter once pass1 is done (moved past current)", () => {
    const steps = computeStepStatuses("pass2", false);
    render(<AgentStatusStepList steps={steps} phaseProgress={{ completed: 8, total: 8 }} />);
    // pass1 step is now "done", not "current" — counter should not render anywhere
    expect(screen.queryByText(/of 8 sections/)).not.toBeInTheDocument();
  });

  it("still shows the counter when pass1 itself failed (status: failed, not current)", () => {
    const steps = computeStepStatuses("pass1", true); // failed=true marks the current phase "failed"
    render(<AgentStatusStepList steps={steps} phaseProgress={{ completed: 3, total: 8 }} />);
    expect(screen.getByText("(3 of 8 sections)")).toBeInTheDocument();
  });

  it("shows a live composer counter next to the current pass3_compose step (Drafting analysis)", () => {
    const steps = computeStepStatuses("pass3_compose", false);
    render(<AgentStatusStepList steps={steps} phaseProgress={{ completed: 5, total: 13 }} />);
    expect(screen.getByText("(5 of 13 memo sections)")).toBeInTheDocument();
  });

  it("still shows the composer counter when pass3_compose failed", () => {
    const steps = computeStepStatuses("pass3_compose", true);
    render(<AgentStatusStepList steps={steps} phaseProgress={{ completed: 9, total: 13 }} />);
    expect(screen.getByText("(9 of 13 memo sections)")).toBeInTheDocument();
  });

  it("labels the counter by the step's own phase, not by the numbers in phaseProgress", () => {
    // The unit word ("sections" vs "memo sections") comes from PHASE_PROGRESS_UNIT
    // keyed on step.phase, independent of whatever completed/total values are passed.
    // Regression guard: an 8-based Pass 1-shaped count under pass3_compose should
    // still render with the pass3_compose label, not silently borrow pass1's.
    const steps = computeStepStatuses("pass3_compose", false);
    render(<AgentStatusStepList steps={steps} phaseProgress={{ completed: 3, total: 8 }} />);
    expect(screen.getByText("(3 of 8 memo sections)")).toBeInTheDocument();
  });

  it("renders all pipeline step titles", () => {
    const steps = computeStepStatuses(null, false);
    render(<AgentStatusStepList steps={steps} />);
    for (const step of PIPELINE_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });
});
