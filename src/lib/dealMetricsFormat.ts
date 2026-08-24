/**
 * Formatters for the typed DealMetrics shape.
 * Input unit conventions match shared/simperoTypes.ts:
 *   - USD inputs are integer CENTS
 *   - Percent inputs are integer BASIS POINTS
 *   - Ratio inputs are plain decimals
 */

export function formatUsdShort(usdCents: number): string {
  const dollars = usdCents / 100;
  const sign = dollars < 0 ? "-" : "";
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatUsdLong(usdCents: number): string {
  const dollars = Math.round(usdCents / 100);
  return `$${dollars.toLocaleString("en-US")}`;
}

export function formatBpAsPct(bp: number): string {
  return `${(bp / 100).toFixed(1)}%`;
}

export function formatRatio(r: number): string {
  return `${r.toFixed(1)}×`;
}

export function formatDealSizeRange(minUsd: number | null, maxUsd: number | null): string {
  if (minUsd == null && maxUsd == null) return "—";
  if (minUsd != null && maxUsd == null) return `${formatUsdShort(minUsd)}+`;
  if (minUsd == null && maxUsd != null) return `Up to ${formatUsdShort(maxUsd)}`;
  return `${formatUsdShort(minUsd!)} – ${formatUsdShort(maxUsd!)}`;
}
