import { describe, expect, it } from "vitest";
import { getSectionConfidence } from "./sectionConfidence";
import type { MemoSection } from "./simperoTypes";

function section(claims: Array<{ verified: boolean }>): MemoSection {
  return {
    title: "Test",
    sectionKey: "test",
    claims: claims.map((c, i) => ({
      id: `c${i}`,
      text: "x",
      citation: { page: 1, section: "s", quote: null, verified: c.verified },
    })),
  };
}

describe("getSectionConfidence", () => {
  it("empty section", () => {
    const s = getSectionConfidence(section([]), false);
    expect(s.level).toBe("empty");
  });

  it("all verified + strong Pass 2", () => {
    const s = getSectionConfidence(section([{ verified: true }, { verified: true }]), false);
    expect(s.level).toBe("strong");
    expect(s.label).toContain("Citations OK");
  });

  it("all verified + degraded Pass 2", () => {
    const s = getSectionConfidence(section([{ verified: true }]), true);
    expect(s.level).toBe("degraded");
    expect(s.label).toContain("verify material");
  });

  it("unverified + strong Pass 2", () => {
    const s = getSectionConfidence(section([{ verified: true }, { verified: false }]), false);
    expect(s.level).toBe("review");
  });

  it("unverified + degraded Pass 2", () => {
    const s = getSectionConfidence(section([{ verified: false }]), true);
    expect(s.level).toBe("degraded");
    expect(s.label).toContain("Low confidence");
  });
});
