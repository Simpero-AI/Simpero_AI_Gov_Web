/**
 * Canonical 14-chip sector tag list for the New Deal wizard Step 1.
 * Order matches the Figma reference at
 * ux-ui/Simpero MVP/src/app/components/NewDeal.tsx:25-28
 *
 * Stored as a JSON array on deals.sectorTags (longtext). Strings here are
 * the canonical labels — no separate id/label split. If we later need
 * stable ids decoupled from display labels (e.g., for i18n), introduce
 * them additively.
 */
export const SECTOR_TAGS: readonly string[] = [
  "HealthTech",
  "SaaS",
  "AI / ML",
  "B2B Software",
  "Marketplace",
  "FinTech",
  "LegalTech",
  "Logistics",
  "AgTech",
  "EdTech",
  "PropTech",
  "Construction AI",
  "Retail",
  "Consumer",
  "Other",
] as const;
