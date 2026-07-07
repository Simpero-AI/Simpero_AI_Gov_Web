import { describe, expect, it } from "vitest";
import { PIPELINE_STEPS, computeStepStatuses } from "./pipelineSteps";

describe("PIPELINE_STEPS", () => {
  it("lists 9 user-facing phases in pipeline order", () => {
    expect(PIPELINE_STEPS.map((s) => s.phase)).toEqual([
      "parsing",
      "classify",
      "pass1",
      "pass2",
      "governance",
      "ofac",
      "pass3_compose",
      "pass4_score",
      "finalize",
    ]);
  });
});

describe("computeStepStatuses", () => {
  it("returns all 'pending' when no current phase", () => {
    const result = computeStepStatuses(null, false);
    expect(result.every((s) => s.status === "pending")).toBe(true);
  });

  it("marks earlier phases done, current as current", () => {
    const result = computeStepStatuses("pass1", false);
    expect(result.find((s) => s.phase === "parsing")?.status).toBe("done");
    expect(result.find((s) => s.phase === "classify")?.status).toBe("done");
    expect(result.find((s) => s.phase === "pass1")?.status).toBe("current");
    expect(result.find((s) => s.phase === "pass2")?.status).toBe("pending");
    expect(result.find((s) => s.phase === "finalize")?.status).toBe("pending");
  });

  it("marks current as 'failed' when failed flag set", () => {
    const result = computeStepStatuses("governance", true);
    expect(result.find((s) => s.phase === "governance")?.status).toBe("failed");
  });

  it("marks every step done when phase is finalize", () => {
    const result = computeStepStatuses("finalize", false);
    expect(result.every((s) => s.status === "done" || s.status === "current")).toBe(true);
    expect(result.find((s) => s.phase === "finalize")?.status).toBe("current");
  });
});
