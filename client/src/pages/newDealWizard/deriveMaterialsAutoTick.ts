/**
 * Derives Required-Materials checklist tick state from uploaded filenames.
 *
 * Pure function — re-runs every render in Step 2. Manual checkbox overrides
 * (state.materialsTicked in the wizard reducer) are layered on top of the
 * result here by the consumer.
 *
 * Heuristic is intentionally generous on the False-positive side. The
 * checklist is informational — soft warning, not gating — so false-ticks
 * are recoverable.
 */

export type MaterialKey = "cim" | "financials" | "captable" | "mgmtbios";
export type MaterialsTickMap = Record<MaterialKey, boolean>;

export function deriveMaterialsAutoTick(fileNames: string[]): MaterialsTickMap {
  const lower = fileNames.map((n) => n.toLowerCase());
  return {
    cim: lower.some((n) => /(cim|teaser|deck)/.test(n)),
    financials: lower.some(
      (n) => /(financial|pnl|p&l|balance)/.test(n) || /\.xlsx?$/.test(n)
    ),
    captable: lower.some((n) => /(cap[_\s-]?table)/.test(n)),
    mgmtbios: lower.some((n) => /(bios|management|team)/.test(n)),
  };
}
