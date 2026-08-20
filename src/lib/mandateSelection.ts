import type { MandateCategory, MandateSelectionItem } from "@/api/mandate";

/**
 * The seven UI sections in EditableMandateBlock.tsx that join to a
 * `mandate_categories` row by name (plan D1 — no stable id/slug exists yet,
 * see §8 gap 2 there). Adding an eighth section here requires an admin to
 * create a matching category by this exact name; anything unmapped just
 * doesn't render in the Builder.
 */
export type MandateSection =
  | "investmentStages"
  | "geoLabels"
  | "sectorLabels"
  | "dealTypeLabels"
  | "assetClassLabels"
  | "mustHaves"
  | "dealBreakers";

export const SECTION_CATEGORY_NAMES: Record<MandateSection, string> = {
  investmentStages: "Investment Stage",
  geoLabels: "Geographies",
  sectorLabels: "Target Sectors",
  dealTypeLabels: "Deal Types",
  assetClassLabels: "Asset Classes",
  mustHaves: "Must Have",
  dealBreakers: "Deal Breaker",
};

/**
 * The stable, admin-unrenameable identifier for each of the seven sections —
 * matched first, so a platform admin renaming a category's display name in
 * the Mandate Taxonomy admin page no longer orphans that section here.
 * SECTION_CATEGORY_NAMES above is now only a fallback (findCategory below)
 * for a category that predates the backend's slug backfill, or a backend
 * that hasn't shipped `slug` yet — see MandateCategory.slug in api/mandate.ts.
 */
export const SECTION_SLUGS: Record<MandateSection, string> = {
  investmentStages: "investment_stage",
  geoLabels: "geographies",
  sectorLabels: "target_sectors",
  dealTypeLabels: "deal_types",
  assetClassLabels: "asset_classes",
  mustHaves: "must_have",
  dealBreakers: "deal_breaker",
};

const MANDATE_SECTIONS = Object.keys(SECTION_CATEGORY_NAMES) as MandateSection[];

/**
 * The eighth category, structurally different from the other seven (D2
 * revised) — numeric min/max, no options, no OptionPicker. Kept out of
 * `SECTION_CATEGORY_NAMES`/`MandateSection` on purpose since it isn't one of
 * the Builder's option-backed chip/row sections.
 */
export const CHECK_SIZE_CATEGORY_NAME = "Check Size Range";
export const CHECK_SIZE_SLUG = "check_size_range";

/** The Builder's Check Size Range inputs are denominated in $K (e.g. an
 * entered "30" means $30K) — the saved mandate stores the full dollar
 * amount instead, so this is the conversion factor at the save/load
 * boundary (toMandateItems/fromMandateItems), not in the UI's own state. */
export const CHECK_SIZE_UNIT_K = 1000;

/**
 * Sub-selections, keyed by section then by the *parent option's label*
 * (chips are label-keyed, so this stays consistent — mandate-suboptions plan
 * D5). One level deep only (D7) — a parent's `subOptions` may themselves
 * have children, but the Builder never lets a user pick into them.
 */
export type SubSelections = Record<MandateSection, Record<string, string[]>>;

/** All seven section keys present, each an empty parent→children map — mirrors how `sections` is built in fromMandateItems. */
export function createEmptySubSelections(): SubSelections {
  return Object.fromEntries(MANDATE_SECTIONS.map((s) => [s, {}])) as SubSelections;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function findCategory(categories: MandateCategory[], section: MandateSection): MandateCategory | undefined {
  const bySlug = categories.find((c) => c.slug === SECTION_SLUGS[section]);
  if (bySlug) return bySlug;
  // Fallback for a category with no slug yet (pre-backfill, or a backend
  // that hasn't shipped `slug` at all) — the same name match as before.
  const name = normalize(SECTION_CATEGORY_NAMES[section]);
  return categories.find((c) => normalize(c.category) === name);
}

/**
 * The heading text to show for a section — the actual `category` name from
 * `/mandate-categories` when that row exists, so a platform admin's rename
 * in the Mandate Taxonomy admin page is reflected here with no code change.
 * Falls back to `SECTION_CATEGORY_NAMES[section]` while categories are still
 * loading or (currently normal, nothing seeded yet) the category doesn't
 * exist — same "honest, don't guess, but don't go blank" pattern as
 * `optionsForSection`'s null handling.
 */
export function categoryDisplayName(categories: MandateCategory[], section: MandateSection): string {
  return findCategory(categories, section)?.category ?? SECTION_CATEGORY_NAMES[section];
}

/** Check Size Range isn't one of the seven MandateSection-keyed categories
 * (see findCategory above), so it gets its own slug-first, name-fallback
 * lookup rather than reusing that one. Only ever called with
 * CHECK_SIZE_CATEGORY_NAME — not a generic by-name lookup. */
function findCheckSizeCategory(categories: MandateCategory[]): MandateCategory | undefined {
  const bySlug = categories.find((c) => c.slug === CHECK_SIZE_SLUG);
  if (bySlug) return bySlug;
  const name = normalize(CHECK_SIZE_CATEGORY_NAME);
  return categories.find((c) => normalize(c.category) === name);
}

/**
 * The "Check Size Range" category's id, or `null` if a platform admin
 * hasn't created it yet (D2's fallback — the Check Size Range entry is
 * simply omitted from the PUT /mandate payload until it exists).
 */
export function findCheckSizeCategoryId(categories: MandateCategory[]): string | null {
  return findCheckSizeCategory(categories)?.id ?? null;
}

/**
 * Options available for a section's add-picker. `null` means the category
 * itself is absent from `/mandate-categories` (distinct from present but
 * empty) — callers render the D7 "no options configured" disabled state for
 * both, but the distinction is kept for anyone who wants to log/report it.
 */
export function optionsForSection(
  categories: MandateCategory[],
  section: MandateSection
): { id: string; option: string }[] | null {
  const category = findCategory(categories, section);
  return category ? category.options : null;
}

/**
 * Parent option label → child option labels, for every option in a section
 * that has at least one child (mandate-suboptions plan D6). Options with no
 * children are omitted rather than included with `[]`, so callers (TagField)
 * can treat a missing key the same as "no caret". Generic over category
 * contents — no category name is ever checked here.
 */
export function subOptionLabelsForSection(
  categories: MandateCategory[],
  section: MandateSection
): Record<string, string[]> {
  const category = findCategory(categories, section);
  if (!category) return {};
  const result: Record<string, string[]> = {};
  for (const option of category.options) {
    const children = option.subOptions ?? [];
    if (children.length > 0) result[option.option] = children.map((c) => c.option);
  }
  return result;
}

/**
 * Builds the `PUT /mandate` body (D2, revised) from the Builder's
 * per-section selections plus the Check Size Range numbers, resolving each
 * picked label back to its category/option id via the categories response.
 * A selection whose category or matching option can no longer be found
 * (e.g. deleted mid-session) is dropped rather than sent with a placeholder
 * id — the OptionPicker only ever offers labels that exist in the same
 * categories response, so this only guards a refetch race. A category with
 * zero resulting selections is omitted entirely (nothing to round-trip).
 *
 * `subSelections` (mandate-suboptions plan D5) resolves the same
 * drop-if-unresolvable way, one level down: for each selected top-level
 * option, `sub_options` is attached only when the resolved child array is
 * non-empty (D2 of that plan) — a parent option is always a normal
 * selection whether or not it has children picked.
 */
export function toMandateItems(
  selections: Record<MandateSection, string[]>,
  subSelections: SubSelections,
  checkSize: { min: number; max: number },
  categories: MandateCategory[]
): MandateSelectionItem[] {
  const items: MandateSelectionItem[] = [];
  for (const section of MANDATE_SECTIONS) {
    const category = findCategory(categories, section);
    if (!category) continue;
    const options = (selections[section] ?? []).flatMap((label) => {
      const option = category.options.find((o) => normalize(o.option) === normalize(label));
      if (!option) return [];
      const childLabels = subSelections[section]?.[label] ?? [];
      const subOptions = childLabels.flatMap((childLabel) => {
        const child = (option.subOptions ?? []).find((c) => normalize(c.option) === normalize(childLabel));
        return child ? [{ option: child.option, option_id: child.id }] : [];
      });
      return [{
        option: option.option,
        option_id: option.id,
        ...(subOptions.length > 0 ? { sub_options: subOptions } : {}),
      }];
    });
    if (options.length === 0) continue;
    items.push({ category: category.category, category_id: category.id, options });
  }

  const checkSizeCategory = findCheckSizeCategory(categories);
  if (checkSizeCategory) {
    items.push({
      category: checkSizeCategory.category,
      category_id: checkSizeCategory.id,
      // The Builder's inputs are in $K (e.g. 30 means $30K) — the saved
      // mandate stores the full dollar amount, so convert on the way out.
      min: checkSize.min * CHECK_SIZE_UNIT_K,
      max: checkSize.max * CHECK_SIZE_UNIT_K,
    });
  }

  return items;
}

/**
 * Reads `GET /mandate`'s nested item list back into per-section chip arrays
 * plus the Check Size Range numbers, grouping on each item's own stored
 * `category` name — not a fresh `/mandate-categories` lookup, so a chip
 * whose option was later renamed or deleted by an admin still renders from
 * its stored label (D2). Items whose category doesn't match any of the
 * seven known section names or the Check Size Range name are dropped; pick
 * order and per-section dedupe are preserved. `checkSize` is `null` when no
 * matching entry is present (category didn't exist yet at save time).
 *
 * `subSelections` (mandate-suboptions plan) is populated per parent label
 * only when that option's stored `sub_options` is present and non-empty —
 * same dedupe/order rule as the top level. A legacy item with no
 * `sub_options` key simply leaves that parent's entry absent.
 */
export function fromMandateItems(items: MandateSelectionItem[]): {
  sections: Record<MandateSection, string[]>;
  subSelections: SubSelections;
  checkSize: { min: number; max: number } | null;
} {
  const sections = Object.fromEntries(
    MANDATE_SECTIONS.map((s) => [s, [] as string[]])
  ) as Record<MandateSection, string[]>;
  const subSelections = createEmptySubSelections();
  const sectionByCategoryName = new Map<string, MandateSection>(
    MANDATE_SECTIONS.map((s) => [normalize(SECTION_CATEGORY_NAMES[s]), s])
  );
  let checkSize: { min: number; max: number } | null = null;

  for (const item of items) {
    if ("options" in item) {
      const section = sectionByCategoryName.get(normalize(item.category));
      if (!section) continue;
      for (const { option, sub_options } of item.options) {
        if (!sections[section].includes(option)) sections[section].push(option);
        if (sub_options && sub_options.length > 0) {
          const existing = subSelections[section][option] ?? [];
          for (const { option: childLabel } of sub_options) {
            if (!existing.includes(childLabel)) existing.push(childLabel);
          }
          subSelections[section][option] = existing;
        }
      }
    } else if (normalize(item.category) === normalize(CHECK_SIZE_CATEGORY_NAME)) {
      // Stored as full dollar amounts (see CHECK_SIZE_UNIT_K) — convert back
      // to the $K units the Builder's inputs use.
      checkSize = { min: item.min / CHECK_SIZE_UNIT_K, max: item.max / CHECK_SIZE_UNIT_K };
    }
  }

  return { sections, subSelections, checkSize };
}
