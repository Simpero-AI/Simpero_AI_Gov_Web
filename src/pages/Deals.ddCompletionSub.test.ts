import { describe, expect, it } from "vitest";

import { ddCompletionSub } from "./Deals";

describe("ddCompletionSub", () => {
  it("shows the real completed count and no delta when deltaPp is null", () => {
    // The backend sends deltaPp: null because it has no truthful
    // month-over-month completion-rate delta to report. We must NOT fabricate a
    // "+0pp" -- the sub-caption is just the real completed count.
    expect(ddCompletionSub(33, 3, null)).toBe("1 deal with completed analysis");
    expect(ddCompletionSub(100, 4, null)).toBe("4 deals with completed analysis");
  });

  it("reads 'none' when nothing is complete", () => {
    expect(ddCompletionSub(0, 5, null)).toBe("none with completed analysis");
  });

  it("still renders a signed delta when a real number is provided", () => {
    // Backward-compatible: if a real delta ever exists, it is shown.
    expect(ddCompletionSub(50, 2, 5)).toBe("1 deal with completed analysis · +5pp");
    expect(ddCompletionSub(50, 2, -3)).toBe("1 deal with completed analysis · -3pp");
  });

  it("still renders a real 0 delta (as 0pp) -- only null suppresses it", () => {
    // Guards the `deltaPp === null` check against a refactor to a falsy test
    // (`!deltaPp` / `== null`), which would wrongly swallow a legitimate 0
    // delta. (A zero renders "0pp", not "+0pp" -- the sign is only added for
    // positives, matching the pre-existing formatter.)
    expect(ddCompletionSub(50, 2, 0)).toBe("1 deal with completed analysis · 0pp");
  });
});
