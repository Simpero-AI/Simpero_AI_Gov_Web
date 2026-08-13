import { describe, expect, it } from "vitest";
import { buildMvpNav, INSTITUTIONAL_MEMORY_SUBTABS, ROUTES, type MvpNavSubNav, type MvpUser } from "./mvpNav";

const nonAdmin: MvpUser = { id: 1, role: "user" };
const admin: MvpUser = { id: 2, role: "admin" };
const platformAdmin: MvpUser = { id: 3, role: "user", isPlatformAdmin: true };
const adminPlatformAdmin: MvpUser = { id: 4, role: "admin", isPlatformAdmin: true };

describe("buildMvpNav", () => {
  it("returns Family Office, Deal Flow for a plain non-admin, non-platform-admin user", () => {
    const nav = buildMvpNav(nonAdmin);
    expect(nav.map((d) => d.title)).toEqual(["Family Office", "Deal Flow"]);
  });

  it("omits Admin divider for a product-admin who isn't a platform admin", () => {
    const nav = buildMvpNav(admin);
    expect(nav.map((d) => d.title)).toEqual(["Family Office", "Deal Flow"]);
  });

  it("includes Intelligence (but not Admin) for a platform admin who isn't a product admin", () => {
    const nav = buildMvpNav(platformAdmin);
    expect(nav.map((d) => d.title)).toEqual(["Family Office", "Deal Flow", "Intelligence"]);
  });

  it("includes both Intelligence and Admin only when the user is both a product admin and a platform admin", () => {
    const nav = buildMvpNav(adminPlatformAdmin);
    expect(nav.map((d) => d.title)).toEqual(["Family Office", "Deal Flow", "Intelligence", "Admin"]);
  });

  it("Family Office contains exactly one disabled 'Data Consolidation' leaf", () => {
    const [familyOffice] = buildMvpNav(nonAdmin);
    expect(familyOffice.children).toHaveLength(1);
    expect(familyOffice.children[0]).toMatchObject({
      kind: "leaf",
      key: "data-consolidation",
      disabled: true,
    });
  });

  it("Deal Flow is collapsible and contains 5 leaves (no Anti-Portfolio) for a non-platform-admin", () => {
    const [, dealFlow] = buildMvpNav(nonAdmin);
    expect(dealFlow.collapsible).toBe(true);
    expect(dealFlow.children.map((c) => "key" in c && c.key)).toEqual([
      "deals",
      "new-deal",
      "screening",
      "analysis",
      "mandate-scorecard",
    ]);
  });

  it("Deal Flow includes Anti-Portfolio, enabled with the real href, only for a platform admin", () => {
    const [, dealFlow] = buildMvpNav(platformAdmin);
    expect(dealFlow.children.map((c) => "key" in c && c.key)).toEqual([
      "deals",
      "new-deal",
      "screening",
      "analysis",
      "mandate-scorecard",
      "anti-portfolio",
    ]);
    const antiPortfolio = dealFlow.children.find((c) => "key" in c && c.key === "anti-portfolio");
    expect(antiPortfolio).toMatchObject({ href: ROUTES.antiPortfolio });
    expect((antiPortfolio as { disabled?: boolean } | undefined)?.disabled).toBeFalsy();
  });

  it("Anti-Portfolio is absent entirely (not just disabled) for non-platform-admins, admin or not", () => {
    for (const user of [nonAdmin, admin]) {
      const [, dealFlow] = buildMvpNav(user);
      const antiPortfolio = dealFlow.children.find((c) => "key" in c && c.key === "anti-portfolio");
      expect(antiPortfolio).toBeUndefined();
    }
  });

  it("Deal Flow's 'deals' leaf points at the dashboard route, unconditionally enabled", () => {
    const [, dealFlow] = buildMvpNav(nonAdmin);
    const deals = dealFlow.children.find((c) => "key" in c && c.key === "deals");
    expect(deals).toMatchObject({ href: ROUTES.dashboard });
    expect((deals as { disabled?: boolean } | undefined)?.disabled).toBeFalsy();
  });

  it("Intelligence divider is absent entirely (not just its items disabled) for non-platform-admins, admin or not", () => {
    for (const user of [nonAdmin, admin]) {
      const nav = buildMvpNav(user);
      expect(nav.find((d) => d.title === "Intelligence")).toBeUndefined();
    }
  });

  it("Intelligence contains exactly one subnav: Institutional Memory, with all 6 items enabled and real hrefs, for a platform admin", () => {
    const nav = buildMvpNav(platformAdmin);
    const intelligence = nav.find((d) => d.title === "Intelligence");
    expect(intelligence).toBeDefined();
    expect(intelligence!.children).toHaveLength(1);
    const subnav = intelligence!.children[0] as MvpNavSubNav;
    expect(subnav.kind).toBe("subnav");
    expect(subnav.items.map((i) => i.key)).toEqual([
      "memory-search",
      "analyst-notes",
      "pattern-engine",
      "playbooks",
      "sector-intel",
      "decision-log",
    ]);
    for (const [i, item] of subnav.items.entries()) {
      expect(item.disabled).toBeFalsy();
      expect(item.disabledReason).toBeUndefined();
      expect(item.href).toBe(`${ROUTES.intelligenceMemory}/${INSTITUTIONAL_MEMORY_SUBTABS[i].key}`);
    }
  });

  it("Admin divider requires both role === 'admin' and isPlatformAdmin, not either alone", () => {
    expect(buildMvpNav(admin).find((d) => d.title === "Admin")).toBeUndefined();
    expect(buildMvpNav(platformAdmin).find((d) => d.title === "Admin")).toBeUndefined();
    expect(buildMvpNav(adminPlatformAdmin).find((d) => d.title === "Admin")).toBeDefined();
  });

  it("Admin divider (when present) has Methodology + Product Usage leaves", () => {
    const nav = buildMvpNav(adminPlatformAdmin);
    const adminDivider = nav.find((d) => d.title === "Admin")!;
    expect(adminDivider.children.map((c) => "key" in c && c.key)).toEqual(["methodology", "product-usage"]);
  });
});
