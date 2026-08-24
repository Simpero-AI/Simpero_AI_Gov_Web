import { describe, it, expect } from "vitest";
import { loadDraft, saveDraft } from "./storage";

describe("loadDraft", () => {
  it("round-trips a draft stored without leadUserId/referredBy (pre-deploy shape)", () => {
    window.localStorage.setItem(
      "simpero.newDealWizard.1",
      JSON.stringify({
        dealName: "CloudMed",
        gpSource: "Sequoia",
        dealSizeMinM: "3",
        dealSizeMaxM: "7",
        sectorTags: ["SaaS"],
      })
    );
    const draft = loadDraft(1);
    expect(draft).toEqual({
      dealName: "CloudMed",
      gpSource: "Sequoia",
      dealSizeMinM: "3",
      dealSizeMaxM: "7",
      sectorTags: ["SaaS"],
    });
  });

  it("round-trips a draft saved with the new fields", () => {
    saveDraft(2, {
      dealName: "CloudMed",
      gpSource: "Sequoia",
      dealSizeMinM: "3",
      dealSizeMaxM: "7",
      sectorTags: ["SaaS"],
      leadUserId: "7",
      referredBy: "Jane Doe",
    });
    expect(loadDraft(2)?.leadUserId).toBe("7");
    expect(loadDraft(2)?.referredBy).toBe("Jane Doe");
  });
});
