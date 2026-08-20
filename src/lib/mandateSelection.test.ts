import { describe, expect, it } from "vitest";
import type { MandateCategory, MandateSelectionItem } from "@/api/mandate";
import {
  CHECK_SIZE_CATEGORY_NAME,
  SECTION_CATEGORY_NAMES,
  categoryDisplayName,
  createEmptySubSelections,
  findCheckSizeCategoryId,
  fromMandateItems,
  optionsForSection,
  subOptionLabelsForSection,
  toMandateItems,
  type MandateSection,
  type SubSelections,
} from "./mandateSelection";

const CATEGORIES: MandateCategory[] = [
  {
    id: "cat-stage",
    category: "Investment Stage",
    options: [
      { id: "opt-a", option: "Series A" },
      { id: "opt-b", option: "Series B" },
    ],
  },
  {
    id: "cat-geo",
    category: "geographies", // lowercased on purpose — join is case-insensitive
    options: [
      {
        id: "opt-c",
        option: "Canada",
        subOptions: [
          { id: "opt-c-bc", option: "British Columbia" },
          { id: "opt-c-on", option: "Ontario" },
        ],
      },
      // Sibling top-level option with no children — exercises the "no caret" case.
      { id: "opt-us", option: "United States" },
    ],
  },
  // "Target Sectors" deliberately absent — exercises the `null` case.
  {
    id: "cat-checksize",
    category: "Check Size Range",
    options: [],
  },
];

const CATEGORIES_NO_CHECK_SIZE: MandateCategory[] = CATEGORIES.filter(
  (c) => c.category !== "Check Size Range"
);

const EMPTY_SELECTIONS: Record<MandateSection, string[]> = {
  investmentStages: [],
  geoLabels: [],
  sectorLabels: [],
  dealTypeLabels: [],
  assetClassLabels: [],
  mustHaves: [],
  dealBreakers: [],
};

function emptySub(): SubSelections {
  return createEmptySubSelections();
}

describe("optionsForSection", () => {
  it("returns the category's options, matching case-insensitively", () => {
    expect(optionsForSection(CATEGORIES, "geoLabels")).toEqual([
      {
        id: "opt-c",
        option: "Canada",
        subOptions: [
          { id: "opt-c-bc", option: "British Columbia" },
          { id: "opt-c-on", option: "Ontario" },
        ],
      },
      { id: "opt-us", option: "United States" },
    ]);
  });

  it("returns null when the category is absent from the response", () => {
    expect(optionsForSection(CATEGORIES, "sectorLabels")).toBeNull();
  });
});

describe("subOptionLabelsForSection", () => {
  it("returns parent label -> child labels only for options with >=1 child", () => {
    expect(subOptionLabelsForSection(CATEGORIES, "geoLabels")).toEqual({
      Canada: ["British Columbia", "Ontario"],
    });
  });

  it("returns {} for a section whose options have no children", () => {
    expect(subOptionLabelsForSection(CATEGORIES, "investmentStages")).toEqual({});
  });

  it("returns {} when the category is absent from the response", () => {
    expect(subOptionLabelsForSection(CATEGORIES, "sectorLabels")).toEqual({});
  });
});

describe("categoryDisplayName", () => {
  it("returns the category's stored name when present (a platform-admin rename)", () => {
    expect(categoryDisplayName(CATEGORIES, "geoLabels")).toBe("geographies");
  });

  it("falls back to SECTION_CATEGORY_NAMES when the category is absent", () => {
    expect(categoryDisplayName(CATEGORIES, "sectorLabels")).toBe(SECTION_CATEGORY_NAMES.sectorLabels);
  });
});

describe("findCheckSizeCategoryId", () => {
  it("returns the Check Size Range category's id when present", () => {
    expect(findCheckSizeCategoryId(CATEGORIES)).toBe("cat-checksize");
  });

  it("returns null when the category doesn't exist yet", () => {
    expect(findCheckSizeCategoryId(CATEGORIES_NO_CHECK_SIZE)).toBeNull();
  });

  it("still resolves by slug even when the display name has been renamed away from CHECK_SIZE_CATEGORY_NAME", () => {
    const renamed: MandateCategory[] = [
      { id: "cat-checksize", slug: "check_size_range", category: "Ticket Size", options: [] },
    ];
    expect(findCheckSizeCategoryId(renamed)).toBe("cat-checksize");
  });
});

describe("category lookup — slug-first, name-fallback (a platform-admin rename must not orphan a section)", () => {
  it("resolves a category by slug even though its display name no longer matches SECTION_CATEGORY_NAMES", () => {
    const renamed: MandateCategory[] = [
      {
        id: "cat-stage",
        slug: "investment_stage",
        category: "Fund Stage", // renamed away from "Investment Stage" in the admin Taxonomy page
        options: [{ id: "opt-a", option: "Series A" }],
      },
    ];
    expect(categoryDisplayName(renamed, "investmentStages")).toBe("Fund Stage");
    expect(optionsForSection(renamed, "investmentStages")).toEqual([{ id: "opt-a", option: "Series A" }]);
  });

  it("falls back to name matching when slug is absent (pre-backfill or a backend that hasn't shipped slug yet)", () => {
    const noSlug: MandateCategory[] = [{ id: "cat-stage", category: "Investment Stage", options: [] }];
    expect(categoryDisplayName(noSlug, "investmentStages")).toBe("Investment Stage");
  });

  it("prefers slug over a coincidental name match", () => {
    const bothPresent: MandateCategory[] = [
      // Named correctly but wrong slug — must lose to the slug match below.
      { id: "cat-wrong", slug: "some_other_category", category: "Investment Stage", options: [] },
      { id: "cat-right", slug: "investment_stage", category: "Fund Stage", options: [] },
    ];
    expect(categoryDisplayName(bothPresent, "investmentStages")).toBe("Fund Stage");
  });
});

describe("toMandateItems / fromMandateItems round-trip", () => {
  it("round-trips selections and checkSize through the D2 (nested) payload shape", () => {
    const selections: Record<MandateSection, string[]> = {
      ...EMPTY_SELECTIONS,
      investmentStages: ["Series A", "Series B"],
      geoLabels: ["Canada"],
    };
    const checkSize = { min: 100, max: 1000 };

    const items = toMandateItems(selections, emptySub(), checkSize, CATEGORIES);
    expect(items).toEqual<MandateSelectionItem[]>([
      {
        category: "Investment Stage",
        category_id: "cat-stage",
        options: [
          { option: "Series A", option_id: "opt-a" },
          { option: "Series B", option_id: "opt-b" },
        ],
      },
      {
        category: "geographies",
        category_id: "cat-geo",
        options: [{ option: "Canada", option_id: "opt-c" }],
      },
      // Builder inputs are $K; the saved item stores full dollar amounts.
      { category: "Check Size Range", category_id: "cat-checksize", min: 100_000, max: 1_000_000 },
    ]);

    const result = fromMandateItems(items);
    expect(result.sections).toEqual(selections);
    expect(result.checkSize).toEqual(checkSize);
  });

  it("omits a category entirely when it has zero selections", () => {
    const items = toMandateItems(
      { ...EMPTY_SELECTIONS, investmentStages: ["Series A"] },
      emptySub(),
      { min: 0, max: 0 },
      CATEGORIES
    );
    expect(items.map((i) => i.category)).toEqual(["Investment Stage", "Check Size Range"]);
  });

  it("omits the Check Size Range entry when that category doesn't exist yet", () => {
    const items = toMandateItems(
      { ...EMPTY_SELECTIONS, investmentStages: ["Series A"] },
      emptySub(),
      { min: 100, max: 1000 },
      CATEGORIES_NO_CHECK_SIZE
    );
    expect(items.some((i) => i.category === CHECK_SIZE_CATEGORY_NAME)).toBe(false);

    const result = fromMandateItems(items);
    expect(result.checkSize).toBeNull();
  });

  it("drops items whose stored category doesn't match any known section on read", () => {
    const items: MandateSelectionItem[] = [
      {
        category: "Some Future Category",
        category_id: "cat-x",
        options: [{ option: "Whatever", option_id: "opt-x" }],
      },
      {
        category: "Investment Stage",
        category_id: "cat-stage",
        options: [{ option: "Series A", option_id: "opt-a" }],
      },
    ];
    const result = fromMandateItems(items);
    expect(result.sections.investmentStages).toEqual(["Series A"]);
    // No section anywhere in the result should contain the unknown-category value.
    expect(Object.values(result.sections).flat()).not.toContain("Whatever");
  });

  it("drops a selection whose category has no matching option on write", () => {
    const selections: Record<MandateSection, string[]> = {
      ...EMPTY_SELECTIONS,
      investmentStages: ["Series A", "Series Z (deleted)"],
    };
    const items = toMandateItems(selections, emptySub(), { min: 0, max: 0 }, CATEGORIES);
    const stageItem = items.find((i) => i.category === "Investment Stage");
    expect(stageItem && "options" in stageItem ? stageItem.options : []).toEqual([
      { option: "Series A", option_id: "opt-a" },
    ]);
  });

  it("covers all seven D1 sections", () => {
    expect(Object.keys(SECTION_CATEGORY_NAMES).sort()).toEqual(
      [
        "assetClassLabels",
        "dealBreakers",
        "dealTypeLabels",
        "geoLabels",
        "investmentStages",
        "mustHaves",
        "sectorLabels",
      ].sort()
    );
  });
});

describe("toMandateItems / fromMandateItems — sub-options", () => {
  it("round-trips a parent's selected children through the nested sub_options payload", () => {
    const selections: Record<MandateSection, string[]> = { ...EMPTY_SELECTIONS, geoLabels: ["Canada"] };
    const subSelections: SubSelections = {
      ...emptySub(),
      geoLabels: { Canada: ["British Columbia", "Ontario"] },
    };

    const items = toMandateItems(selections, subSelections, { min: 0, max: 0 }, CATEGORIES);
    const geoItem = items.find((i) => i.category === "geographies");
    expect(geoItem && "options" in geoItem ? geoItem.options : null).toEqual([
      {
        option: "Canada",
        option_id: "opt-c",
        sub_options: [
          { option: "British Columbia", option_id: "opt-c-bc" },
          { option: "Ontario", option_id: "opt-c-on" },
        ],
      },
    ]);

    const result = fromMandateItems(items);
    expect(result.sections).toEqual(selections);
    expect(result.subSelections.geoLabels).toEqual({ Canada: ["British Columbia", "Ontario"] });
  });

  it("omits the sub_options key when no children were selected", () => {
    const selections: Record<MandateSection, string[]> = { ...EMPTY_SELECTIONS, geoLabels: ["Canada"] };
    const items = toMandateItems(selections, emptySub(), { min: 0, max: 0 }, CATEGORIES);
    const geoItem = items.find((i) => i.category === "geographies");
    expect(geoItem && "options" in geoItem ? geoItem.options[0] : null).toEqual({
      option: "Canada",
      option_id: "opt-c",
    });
    expect(geoItem && "options" in geoItem ? "sub_options" in geoItem.options[0] : true).toBe(false);
  });

  it("drops a child label with no matching subOptions entry on write", () => {
    const selections: Record<MandateSection, string[]> = { ...EMPTY_SELECTIONS, geoLabels: ["Canada"] };
    const subSelections: SubSelections = {
      ...emptySub(),
      geoLabels: { Canada: ["British Columbia", "Quebec (deleted)"] },
    };
    const items = toMandateItems(selections, subSelections, { min: 0, max: 0 }, CATEGORIES);
    const geoItem = items.find((i) => i.category === "geographies");
    expect(geoItem && "options" in geoItem ? geoItem.options[0].sub_options : null).toEqual([
      { option: "British Columbia", option_id: "opt-c-bc" },
    ]);
  });

  it("never serializes a subSelections entry whose parent isn't itself selected", () => {
    const subSelections: SubSelections = {
      ...emptySub(),
      geoLabels: { Canada: ["British Columbia"] },
    };
    // Canada is not in geoLabels — the parent chip was never picked (or was
    // removed, which per D5 clears its subSelections entry at the call site;
    // this covers the underlying serialization guarantee either way).
    const items = toMandateItems(EMPTY_SELECTIONS, subSelections, { min: 0, max: 0 }, CATEGORIES);
    expect(items.some((i) => i.category === "geographies")).toBe(false);
  });

  it("a legacy item with no sub_options key parses to an empty subSelections entry", () => {
    const items: MandateSelectionItem[] = [
      {
        category: "geographies",
        category_id: "cat-geo",
        options: [{ option: "Canada", option_id: "opt-c" }],
      },
    ];
    const result = fromMandateItems(items);
    expect(result.sections.geoLabels).toEqual(["Canada"]);
    expect(result.subSelections.geoLabels).toEqual({});
  });
});
