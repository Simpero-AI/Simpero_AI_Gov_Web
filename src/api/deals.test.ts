import { describe, expect, it } from "vitest";
import { pickMostRecentCompleteDeal } from "./deals";
import type { LivePipelineRow } from "@shared/dealsListPipeline";

function makeRow(over: Partial<LivePipelineRow> = {}): LivePipelineRow {
  return {
    dealId: "1",
    name: "Acme",
    gpSource: "GP",
    sectorTags: [],
    state: "diligence",
    createdAt: new Date().toISOString(),
    valuationUsd: null,
    evRevenue: null,
    aiScore: null,
    mandateFitPct: null,
    irrPct: null,
    actionPill: null,
    agentStatus: { jobStatus: "complete", currentPhase: null, steps: [] },
    ...over,
  };
}

describe("pickMostRecentCompleteDeal", () => {
  it("returns null for an empty list", () => {
    expect(pickMostRecentCompleteDeal([])).toBeNull();
  });

  it("returns null when no row has a complete job", () => {
    const rows = [
      makeRow({ agentStatus: { jobStatus: "processing", currentPhase: null, steps: [] } }),
      makeRow({ dealId: "2", agentStatus: { jobStatus: "queued", currentPhase: null, steps: [] } }),
    ];
    expect(pickMostRecentCompleteDeal(rows)).toBeNull();
  });

  it("filters out non-complete rows and returns the most recently created complete one", () => {
    const older = makeRow({ dealId: "older", createdAt: "2024-01-01T00:00:00.000Z" });
    const newer = makeRow({ dealId: "newer", createdAt: "2024-06-01T00:00:00.000Z" });
    const notComplete = makeRow({
      dealId: "wip",
      createdAt: "2025-01-01T00:00:00.000Z",
      agentStatus: { jobStatus: "processing", currentPhase: null, steps: [] },
    });
    expect(pickMostRecentCompleteDeal([older, notComplete, newer])).toEqual(newer);
  });
});
