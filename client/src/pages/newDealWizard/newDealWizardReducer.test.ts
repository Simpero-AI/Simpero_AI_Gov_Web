import { describe, it, expect } from "vitest";
import {
  newDealWizardReducer,
  initialWizardState,
  type WizardState,
} from "./newDealWizardReducer";
import type { PersistedStep1 } from "./storage";

const DEFAULT_FRAMEWORKS = ["finra_3110", "sec_206_4_7", "osfi_e23", "eu_ai_act"];

function mkFile(name: string): File {
  return new File(["x"], name, { type: "application/pdf" });
}

describe("newDealWizardReducer", () => {
  it("initialWizardState defaults", () => {
    const s = initialWizardState(DEFAULT_FRAMEWORKS);
    expect(s.dealName).toBe("");
    expect(s.gpSource).toBe("");
    expect(s.selectedFrameworks).toEqual(DEFAULT_FRAMEWORKS);
    expect(s.primaryFile).toBeNull();
    expect(s.financialModelFile).toBeNull();
    expect(s.submitting).toBe(false);
    expect(s.attachDealId).toBeNull();
  });

  it("set_field updates a single slot", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    const s1 = newDealWizardReducer(s0, {
      type: "set_field", key: "dealName", value: "CloudMed",
    });
    expect(s1.dealName).toBe("CloudMed");
    expect(s1.gpSource).toBe("");
  });

  it("toggle_sector adds and removes a tag", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    const s1 = newDealWizardReducer(s0, { type: "toggle_sector", tag: "SaaS" });
    expect(s1.sectorTags).toEqual(["SaaS"]);
    const s2 = newDealWizardReducer(s1, { type: "toggle_sector", tag: "SaaS" });
    expect(s2.sectorTags).toEqual([]);
  });

  it("toggle_framework refuses to remove the last selected one", () => {
    const s0 = { ...initialWizardState(DEFAULT_FRAMEWORKS), selectedFrameworks: ["finra_3110"] };
    const s1 = newDealWizardReducer(s0, { type: "toggle_framework", id: "finra_3110" });
    expect(s1.selectedFrameworks).toEqual(["finra_3110"]); // unchanged
  });

  it("apply_framework_preset replaces the framework array", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    const s1 = newDealWizardReducer(s0, {
      type: "apply_framework_preset", ids: ["sec_206_4_7"],
    });
    expect(s1.selectedFrameworks).toEqual(["sec_206_4_7"]);
  });

  it("set_primary_file accepts a PDF", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    const file = mkFile("cim.pdf");
    const s1 = newDealWizardReducer(s0, { type: "set_primary_file", file });
    expect(s1.primaryFile).toBe(file);
  });

  it("set_financial_model_file accepts an XLSX", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    const file = new File(["x"], "model.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const s1 = newDealWizardReducer(s0, { type: "set_financial_model_file", file });
    expect(s1.financialModelFile).toBe(file);
  });

  it("set_material_ticked records a manual override", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    const s1 = newDealWizardReducer(s0, {
      type: "set_material_ticked", key: "cim", ticked: true,
    });
    expect(s1.materialsTicked.cim).toBe(true);
  });

  it("rehydrate merges a partial state", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    const s1 = newDealWizardReducer(s0, {
      type: "rehydrate",
      partial: { dealName: "Restored", sectorTags: ["SaaS"] },
    });
    expect(s1.dealName).toBe("Restored");
    expect(s1.sectorTags).toEqual(["SaaS"]);
    expect(s1.gpSource).toBe(""); // untouched
  });

  it("rehydrate ignores unknown / forbidden keys", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    // Cast through unknown to test runtime safety even when type narrowing is bypassed.
    const action = {
      type: "rehydrate",
      partial: { dealName: "Restored", submitting: true, attachDealId: 99 } as unknown as Partial<PersistedStep1>,
    } as const;
    const s1 = newDealWizardReducer(s0, action as any);
    expect(s1.dealName).toBe("Restored");
    expect(s1.submitting).toBe(false);   // unchanged
    expect(s1.attachDealId).toBeNull();  // unchanged
  });

  it("set_attach_deal_id pre-fills Step 1 and sets attachDealId", () => {
    const s0 = initialWizardState(DEFAULT_FRAMEWORKS);
    const s1 = newDealWizardReducer(s0, {
      type: "set_attach_deal_id",
      dealId: 17,
      deal: {
        name: "Existing Deal", gpSource: "Sequoia",
        dealSizeMinUsd: 300_000_000, dealSizeMaxUsd: 700_000_000,
        sectorTags: ["SaaS"],
      },
    });
    expect(s1.attachDealId).toBe(17);
    expect(s1.dealName).toBe("Existing Deal");
    expect(s1.gpSource).toBe("Sequoia");
    // 300_000_000 cents = $3M = 3 millions
    expect(s1.dealSizeMinM).toBe("3");
    expect(s1.dealSizeMaxM).toBe("7");
    expect(s1.sectorTags).toEqual(["SaaS"]);
  });

  it("submitting_start flips the flag and clears prior error", () => {
    const s0: WizardState = { ...initialWizardState(DEFAULT_FRAMEWORKS), submitError: "stale" };
    const s1 = newDealWizardReducer(s0, { type: "submitting_start" });
    expect(s1.submitting).toBe(true);
    expect(s1.submitError).toBeNull();
  });

  it("submitting_error flips the flag back and stores the message", () => {
    const s0: WizardState = { ...initialWizardState(DEFAULT_FRAMEWORKS), submitting: true };
    const s1 = newDealWizardReducer(s0, { type: "submitting_error", message: "boom" });
    expect(s1.submitting).toBe(false);
    expect(s1.submitError).toBe("boom");
  });

  it("reset returns to initial state", () => {
    const s0 = { ...initialWizardState(DEFAULT_FRAMEWORKS), dealName: "x" };
    const s1 = newDealWizardReducer(s0, { type: "reset" });
    expect(s1.dealName).toBe("");
  });
});
