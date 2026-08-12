import { describe, it, expect } from "vitest";
import {
  newDealWizardReducer,
  initialWizardState,
  type WizardState,
} from "./newDealWizardReducer";
import type { PersistedStep1 } from "./storage";

describe("newDealWizardReducer", () => {
  it("initialWizardState defaults", () => {
    const s = initialWizardState();
    expect(s.dealName).toBe("");
    expect(s.gpSource).toBe("");
    expect(s.hasUploadedDocument).toBe(false);
    expect(s.submitting).toBe(false);
    expect(s.attachDealId).toBeNull();
  });

  it("set_field updates a single slot", () => {
    const s0 = initialWizardState();
    const s1 = newDealWizardReducer(s0, {
      type: "set_field",
      key: "dealName",
      value: "CloudMed",
    });
    expect(s1.dealName).toBe("CloudMed");
    expect(s1.gpSource).toBe("");
  });

  it("toggle_sector adds and removes a tag", () => {
    const s0 = initialWizardState();
    const s1 = newDealWizardReducer(s0, { type: "toggle_sector", tag: "SaaS" });
    expect(s1.sectorTags).toEqual(["SaaS"]);
    const s2 = newDealWizardReducer(s1, { type: "toggle_sector", tag: "SaaS" });
    expect(s2.sectorTags).toEqual([]);
  });

  it("rehydrate merges a partial state", () => {
    const s0 = initialWizardState();
    const s1 = newDealWizardReducer(s0, {
      type: "rehydrate",
      partial: { dealName: "Restored", sectorTags: ["SaaS"] },
    });
    expect(s1.dealName).toBe("Restored");
    expect(s1.sectorTags).toEqual(["SaaS"]);
    expect(s1.gpSource).toBe(""); // untouched
  });

  it("rehydrate ignores unknown / forbidden keys", () => {
    const s0 = initialWizardState();
    // Cast through unknown to test runtime safety even when type narrowing is bypassed.
    const action = {
      type: "rehydrate",
      partial: {
        dealName: "Restored",
        submitting: true,
        attachDealId: 99,
      } as unknown as Partial<PersistedStep1>,
    } as const;
    const s1 = newDealWizardReducer(s0, action as any);
    expect(s1.dealName).toBe("Restored");
    expect(s1.submitting).toBe(false); // unchanged
    expect(s1.attachDealId).toBeNull(); // unchanged
  });

  it("set_attach_deal_id pre-fills Step 1 and sets attachDealId", () => {
    const s0 = initialWizardState();
    const s1 = newDealWizardReducer(s0, {
      type: "set_attach_deal_id",
      dealId: "17",
      deal: {
        name: "Existing Deal",
        gpSource: "Sequoia",
        dealSizeMinUsd: 300_000_000,
        dealSizeMaxUsd: 700_000_000,
        sectorTags: ["SaaS"],
      },
    });
    expect(s1.attachDealId).toBe("17");
    expect(s1.dealName).toBe("Existing Deal");
    expect(s1.gpSource).toBe("Sequoia");
    // 300_000_000 cents = $3M = 3 millions
    expect(s1.dealSizeMinM).toBe("3");
    expect(s1.dealSizeMaxM).toBe("7");
    expect(s1.sectorTags).toEqual(["SaaS"]);
  });

  it("deal_created sets attachDealId and clears submitting", () => {
    const s0: WizardState = { ...initialWizardState(), submitting: true };
    const s1 = newDealWizardReducer(s0, { type: "deal_created", dealId: "42" });
    expect(s1.attachDealId).toBe("42");
    // Nothing else clears this — the wizard never remounts, so a stuck `true`
    // leaves Step 3's "Start Analysis" permanently disabled.
    expect(s1.submitting).toBe(false);
  });

  it("deal_created leaves the user's Step 1 input untouched", () => {
    const s0: WizardState = {
      ...initialWizardState(),
      dealName: "CloudMed",
      gpSource: "Sequoia",
      dealSizeMinM: "3",
      dealSizeMaxM: "7",
      sectorTags: ["SaaS"],
      submitting: true,
    };
    const s1 = newDealWizardReducer(s0, { type: "deal_created", dealId: "42" });
    // Unlike set_attach_deal_id, this must not overwrite Step 1 from the server.
    expect(s1.dealName).toBe("CloudMed");
    expect(s1.gpSource).toBe("Sequoia");
    expect(s1.dealSizeMinM).toBe("3");
    expect(s1.dealSizeMaxM).toBe("7");
    expect(s1.sectorTags).toEqual(["SaaS"]);
  });

  it("document_uploaded sets hasUploadedDocument and nothing else", () => {
    const s0 = initialWizardState();
    const s1 = newDealWizardReducer(s0, { type: "document_uploaded" });
    expect(s1.hasUploadedDocument).toBe(true);
    expect(s1).toEqual({ ...s0, hasUploadedDocument: true });
  });

  it("submitting_start flips the flag and clears prior error", () => {
    const s0: WizardState = { ...initialWizardState(), submitError: "stale" };
    const s1 = newDealWizardReducer(s0, { type: "submitting_start" });
    expect(s1.submitting).toBe(true);
    expect(s1.submitError).toBeNull();
  });

  it("submitting_error flips the flag back and stores the message", () => {
    const s0: WizardState = { ...initialWizardState(), submitting: true };
    const s1 = newDealWizardReducer(s0, {
      type: "submitting_error",
      message: "boom",
    });
    expect(s1.submitting).toBe(false);
    expect(s1.submitError).toBe("boom");
  });

  it("reset returns to initial state", () => {
    const s0 = { ...initialWizardState(), dealName: "x" };
    const s1 = newDealWizardReducer(s0, { type: "reset" });
    expect(s1.dealName).toBe("");
  });
});
