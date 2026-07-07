import { describe, it, expect } from "vitest";
import { FRAMEWORK_DEFAULTS, MANDATE_DEFAULTS } from "../data/mandateDefaults";

describe("FRAMEWORK_DEFAULTS", () => {
  it("has benchmark and subWeight on every criterion", () => {
    for (const cat of FRAMEWORK_DEFAULTS) {
      for (const cr of cat.criteria) {
        expect(cr.benchmark, `${cat.name} > ${cr.name} missing benchmark`).toBeTruthy();
        expect(typeof cr.subWeight, `${cat.name} > ${cr.name} missing subWeight`).toBe("number");
      }
    }
  });

  it("criterion subWeights sum to 100 within each category", () => {
    for (const cat of FRAMEWORK_DEFAULTS) {
      const total = cat.criteria.reduce((s, cr) => s + (cr.subWeight ?? 0), 0);
      expect(total, `${cat.name} subWeights total ${total}%`).toBe(100);
    }
  });

  it("category weights sum to 100", () => {
    const total = FRAMEWORK_DEFAULTS.reduce((s, cat) => s + cat.weight, 0);
    expect(total, `Category weights total ${total}%, expected 100%`).toBe(100);
  });
});

describe("MANDATE_DEFAULTS", () => {
  it("has mustHaves array with 7 items", () => {
    expect(MANDATE_DEFAULTS.mustHaves).toHaveLength(7);
  });

  it("has dealBreakers array with 7 items", () => {
    expect(MANDATE_DEFAULTS.dealBreakers).toHaveLength(7);
  });

  it("has esgCriteria array with 4 items", () => {
    expect(MANDATE_DEFAULTS.esgCriteria).toHaveLength(4);
  });
});
