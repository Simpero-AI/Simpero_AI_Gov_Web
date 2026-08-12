import { describe, expect, it } from "vitest";
import { PIPELINE_STEPS, computeStepStatuses } from "./pipelineSteps";

describe("PIPELINE_STEPS", () => {
  it("lists the 2 phases the backend can actually report, in pipeline order", () => {
    expect(PIPELINE_STEPS.map(s => s.phase)).toEqual(["parsing", "verification"]);
  });
});

describe("computeStepStatuses", () => {
  it("returns all 'pending' when no current phase", () => {
    const result = computeStepStatuses(null, false);
    expect(result.every(s => s.status === "pending")).toBe(true);
  });

  it("marks parsing current, verification pending", () => {
    const result = computeStepStatuses("parsing", false);
    expect(result.find(s => s.phase === "parsing")?.status).toBe("current");
    expect(result.find(s => s.phase === "verification")?.status).toBe("pending");
  });

  it("marks parsing done, verification current", () => {
    const result = computeStepStatuses("verification", false);
    expect(result.find(s => s.phase === "parsing")?.status).toBe("done");
    expect(result.find(s => s.phase === "verification")?.status).toBe("current");
  });

  it("marks the current phase as 'failed' when failed flag set", () => {
    const result = computeStepStatuses("verification", true);
    expect(result.find(s => s.phase === "verification")?.status).toBe("failed");
  });

  it("marks every step done once past the tracked list (governance)", () => {
    // Nothing is actively running once verification succeeds — this is not
    // an "unknown phase" case, it's "everything we track already ran".
    const result = computeStepStatuses("governance", false);
    expect(result.every(s => s.status === "done")).toBe(true);
  });
});
