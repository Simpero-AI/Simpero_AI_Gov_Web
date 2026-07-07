/**
 * Parses a user-typed millions-USD string into bigint-safe cents.
 *
 * Input examples: "3", "3.5", "" (unspecified), " 7 ".
 * Output: discriminated union — empty | ok | error.
 *
 * Cents = dollars * 100. Dollars = millions * 1_000_000.
 * → cents = millions * 100_000_000.
 *
 * Sanity cap at 100,000 ($100B) — anything bigger is almost certainly typo.
 * Values are stored as `number` here (safe up to Number.MAX_SAFE_INTEGER
 * ~= 9e15, comfortably above the cap of 1e13).
 */

export type ParseDealSizeMResult =
  | { kind: "empty" }
  | { kind: "ok"; cents: number }
  | { kind: "error"; message: string };

const MAX_M = 100_000;

export function parseDealSizeM(input: string): ParseDealSizeMResult {
  const trimmed = input.trim();
  if (trimmed === "") return { kind: "empty" };
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { kind: "error", message: "Must be a number" };
  }
  const n = Number(trimmed);
  if (n < 0) return { kind: "error", message: "Must be at least 0" };
  if (n > MAX_M) return { kind: "error", message: "Must be at most 100,000" };
  return { kind: "ok", cents: Math.round(n * 100_000_000) };
}
