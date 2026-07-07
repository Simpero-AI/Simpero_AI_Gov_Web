import { describe, expect, it } from "vitest";
import { buildMvpNav, ROUTES, type MvpUser } from "./mvpNav";

const nonAdmin: MvpUser = { id: 1, role: "user" };
const admin: MvpUser = { id: 2, role: "admin" };

describe("buildMvpNav", () => {
  it("returns Workspace + Intelligence dividers for non-admin", () => {
    const nav = buildMvpNav(nonAdmin);
    expect(nav.map((d) => d.title)).toEqual(["Workspace", "Intelligence"]);
  });

  it("includes Admin divider for admin users", () => {
    const nav = buildMvpNav(admin);
    expect(nav.map((d) => d.title)).toEqual(["Workspace", "Intelligence", "Admin"]);
  });

  it("Workspace contains Overview + Deal Flow groups", () => {
    const [workspace] = buildMvpNav(nonAdmin);
    const groups = workspace.children.filter((c): c is { kind: "group"; title: string; items: unknown[] } => "kind" in c && c.kind === "group");
    expect(groups.map((g) => g.title)).toEqual(["Overview", "Deal Flow"]);
  });

  it("Intelligence contains exactly one leaf: Intelligence Suite", () => {
    const [, intelligence] = buildMvpNav(nonAdmin);
    expect(intelligence.children).toHaveLength(1);
    const leaf = intelligence.children[0];
    expect(leaf).toMatchObject({
      kind: "leaf",
      key: "intelligence-suite",
      label: "Intelligence Suite",
      badge: "Beta",
      href: "#",
      disabled: true,
    });
  });

  it("Deal Flow 'history' leaf is labelled 'Memo History'", () => {
    const [workspace] = buildMvpNav(nonAdmin);
    const dealFlow = workspace.children.find(
      (c): c is { kind: "group"; items: { key: string; label: string }[] } =>
        "kind" in c && c.kind === "group" && (c as { title: string }).title === "Deal Flow"
    );
    const historyLeaf = dealFlow?.items.find((i) => i.key === "history");
    expect(historyLeaf?.label).toBe("Memo History");
  });
});
