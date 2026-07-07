import { describe, it, expect } from "vitest";
import { deriveMaterialsAutoTick } from "./deriveMaterialsAutoTick";

describe("deriveMaterialsAutoTick", () => {
  it("returns all-false for empty input", () => {
    expect(deriveMaterialsAutoTick([])).toEqual({
      cim: false, financials: false, captable: false, mgmtbios: false,
    });
  });

  it("ticks cim when filename contains cim/teaser/deck", () => {
    expect(deriveMaterialsAutoTick(["CloudMed_CIM_2026.pdf"]).cim).toBe(true);
    expect(deriveMaterialsAutoTick(["teaser-deck.pdf"]).cim).toBe(true);
    expect(deriveMaterialsAutoTick(["investor_deck.pdf"]).cim).toBe(true);
  });

  it("ticks financials on financial/pnl/p&l/balance keywords", () => {
    expect(deriveMaterialsAutoTick(["CloudMed_Financials.xlsx"]).financials).toBe(true);
    expect(deriveMaterialsAutoTick(["pnl_2026.pdf"]).financials).toBe(true);
    expect(deriveMaterialsAutoTick(["P&L summary.pdf"]).financials).toBe(true);
    expect(deriveMaterialsAutoTick(["balance_sheet.pdf"]).financials).toBe(true);
  });

  it("ticks financials on .xls and .xlsx extensions regardless of name", () => {
    expect(deriveMaterialsAutoTick(["model.xlsx"]).financials).toBe(true);
    expect(deriveMaterialsAutoTick(["legacy.xls"]).financials).toBe(true);
  });

  it("ticks captable on cap_table / cap table / captable", () => {
    expect(deriveMaterialsAutoTick(["cap_table.pdf"]).captable).toBe(true);
    expect(deriveMaterialsAutoTick(["Cap Table Summary.pdf"]).captable).toBe(true);
    expect(deriveMaterialsAutoTick(["captable_v3.pdf"]).captable).toBe(true);
  });

  it("ticks mgmtbios on bios/management/team", () => {
    expect(deriveMaterialsAutoTick(["team_bios.pdf"]).mgmtbios).toBe(true);
    expect(deriveMaterialsAutoTick(["management_overview.docx"]).mgmtbios).toBe(true);
    expect(deriveMaterialsAutoTick(["team.pdf"]).mgmtbios).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(deriveMaterialsAutoTick(["CIM.PDF"]).cim).toBe(true);
    expect(deriveMaterialsAutoTick(["FINANCIALS.PDF"]).financials).toBe(true);
  });

  it("ticks multiple categories from multiple files", () => {
    const result = deriveMaterialsAutoTick([
      "CloudMed_CIM_2026.pdf",
      "CloudMed_Financials.xlsx",
    ]);
    expect(result).toEqual({
      cim: true, financials: true, captable: false, mgmtbios: false,
    });
  });

  it("returns all-false for a generic filename", () => {
    expect(deriveMaterialsAutoTick(["doc.pdf"])).toEqual({
      cim: false, financials: false, captable: false, mgmtbios: false,
    });
  });
});
