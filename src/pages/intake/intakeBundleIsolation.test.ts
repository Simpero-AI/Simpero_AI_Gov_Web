// @vitest-environment node
//
// P4-03's AC: the intake page's bundle must import nothing from
// src/components/mvp/shell/** or the product auth hooks. No import-graph
// tool (dependency-cruiser/madge) is installed in this repo and no existing
// test does this for the admin surface to mirror — so this walks the real
// import graph from IntakePage.tsx with plain fs/path, resolving this
// repo's two path aliases (`@` -> src, `@shared` -> src/shared, per
// vite.config.ts), and fails if any reachable file lives under a forbidden
// path. Only files under `src/` are followed — node_modules packages
// (react, lucide-react, react-dropzone, ...) aren't the boundary at issue.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC_ROOT = path.resolve(__dirname, "..", "..");
const ENTRY = path.join(__dirname, "IntakePage.tsx");

const FORBIDDEN_SUBSTRINGS = [
  `${path.sep}components${path.sep}mvp${path.sep}shell${path.sep}`,
  `${path.sep}_core${path.sep}hooks${path.sep}useAuth`,
];

function resolveImport(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@shared")) {
    base = path.join(SRC_ROOT, "shared", specifier.slice("@shared".length));
  } else if (specifier.startsWith("@/")) {
    base = path.join(SRC_ROOT, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null; // bare package specifier — node_modules, not our concern here
  }

  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

function collectImports(file: string): string[] {
  const src = fs.readFileSync(file, "utf-8");
  const specifiers: string[] = [];
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) specifiers.push(m[1]);
  for (const m of src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) specifiers.push(m[1]);
  return specifiers;
}

function walk(entry: string): Set<string> {
  const visited = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    for (const specifier of collectImports(file)) {
      const resolved = resolveImport(file, specifier);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return visited;
}

describe("intake page bundle isolation (P4-03)", () => {
  it("never transitively imports the product shell or product auth hooks", () => {
    const reachable = walk(ENTRY);
    expect(reachable.size).toBeGreaterThan(1); // sanity: the walk actually traversed something

    const offenders = [...reachable].filter((f) =>
      FORBIDDEN_SUBSTRINGS.some((forbidden) => f.includes(forbidden))
    );
    expect(offenders).toEqual([]);
  });
});
