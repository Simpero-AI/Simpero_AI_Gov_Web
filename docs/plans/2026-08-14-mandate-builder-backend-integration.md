# Mandate Builder — Backend Integration Plan

Wires the Mandate Builder tab (`/mandate-scorecard/mandate`) to the new `mandates` / `mandate_categories` / `mandate_options` backend, and adds a platform-admin CRUD surface for the category/option taxonomy.

**The backend already exists.** `Simpero_AI_Gov_Alpha` has the models, both routers, both schema modules, all four repos, and the migration — built directly by the user on 2026-08-14, currently uncommitted. Verified by reading that repo (read-only). **This plan is frontend-only. No backend implementation is required to execute it**, with the exception of the three gaps in §8, which are deliberately *not* part of this work.

This plan is architect-authored, pre-implementation, per this repo's `docs/plans/` convention. Prefer the eventual `docs/implementations/` writeup over this doc where they disagree.

**Revision (2026-08-15)**: three open items from §7/§8 resolved by the user —
(1) the seven category names in D1 are confirmed correct for now, with more
categories addable later (already supported — unmapped categories just don't
render in the Builder, see D1); (2) D3 is **withdrawn** — no "Return Profile"
relocation; the whole Financial Thresholds card, Hold Period and Target
Return included, is commented out with the rest, full stop (see revised D3
below); (3) the `mandate_options.option` String(50) gap (§8 gap 1) is being
addressed directly — addendum plan written to
`Simpero_AI_Gov_Alpha/docs/plans/mandate-options-widen-option-column.md`
(widen to String(255)), for that repo's own session to implement.

**Revision (2026-08-15, cont'd)**: §7 Q2 resolved — yes, demote the
fabricated `holdPeriod`/`targetReturn` defaults. Folded into Phase 3 below.

---

## 1. Verified backend contract

Read from Alpha, not assumed. All wire payloads are camelCase (`CamelModel`); all paths below are under `API_PREFIX = "/api"`.

### Product portal (`app/api/mandates.py`, registered in `main.py`) — auth via `get_db` → `get_claims`

| Endpoint | Shape |
|---|---|
| `GET /api/mandate-categories` | `[{ id: string, category: string, options: [{ id: string, option: string }] }]` — note: **no `categoryId` on the product-side option**, unlike the admin shape. Categories sorted by `category`, options by `option`, server-side. |
| `GET /api/mandate` | `{ mandate: unknown[], updatedAt: string } | null` — `null` (200, not 404) when the org has never saved. |
| `PUT /api/mandate` | body `{ mandate: unknown[] }` → returns the `MandateResponse`. Create-or-replace on `org_id`, **not** a patch. |

### Admin portal (`app/api/admin/mandates.py`, prefix `/api/admin/mandates`) — `require_platform_admin`

| Endpoint | Shape |
|---|---|
| `GET /categories` | `[{ id, category, options: [{ id, categoryId, option }] }]` |
| `POST /categories` | `{ category }` → 201, category with `options: []` |
| `PATCH /categories/{id}` | `{ category }` → category incl. options; 404 if missing |
| `DELETE /categories/{id}` | → `{ success: true }`; **cascades all options** (FK `ON DELETE CASCADE`) |
| `POST /categories/{id}/options` | `{ option }` → 201 option; 404 if category missing |
| `PATCH /options/{id}` | `{ option }` → option; 404 if missing |
| `DELETE /options/{id}` | → `{ success: true }` |

Every admin write appends a `HumanAuditRepo` row. Column limits: `category` ≤ 150 chars (unique), `option` ≤ 50 chars (unique per category).

Migration `a1c3e7f2b4d9_mandates.py` exists and is coherent: `mandates` gets RLS + `org_isolation` policy for `dd_app`; `mandate_categories`/`mandate_options` deliberately get none (global reference data, no `org_id`). DML grants come from the `bootstrap_dd_app_privliges` `ALTER DEFAULT PRIVILEGES`. **Not verified as applied** — the implementer should assume a local DB may need `alembic upgrade head` in the Alpha repo's own session, and must not run or edit migrations from this repo.

---

## 2. Decisions

### D1 — Join key: category **name**, with an admin-side safety net

The seven UI sections join to categories by name, case-insensitive and trimmed:

```
investmentStages  → "Investment Stage"
geoLabels         → "Geographies"
sectorLabels      → "Target Sectors"
dealTypeLabels    → "Deal Types"
assetClassLabels  → "Asset Classes"
mustHaves         → "Must Have"
dealBreakers      → "Deal Breaker"
```

An id-based join is *not* safer here: ids are `gen_random_uuid()` per environment and nothing seeds them, so hardcoded ids would be wrong in every environment including the user's local DB. Name is the only key that is stable across environments. The fragility (an admin typo silently empties a Builder section) is handled in the UI, not by guessing: the admin page labels every category row with either the Builder section it feeds or "Not used by the Mandate Builder", and the Builder renders an explicit "no options configured" state rather than a blank field. The proper fix is a backend `key`/`slug` column — §8, gap 2.

The **stored** payload carries both id and name (D2), so the join key being a name costs nothing at read time.

### D2 — `PUT /mandate` body shape (superseded 2026-08-15 — user's follow-up spec)

The originally-implemented flat, camelCase, one-row-per-option shape is
**replaced** by the user's own spec: one entry per category (options
nested inside it), snake_case keys, plus a `"Check Size Range"` entry that
is structurally different from the other seven (no `options` array — `min`
and `max` numbers instead):

```json
{ "mandate": [
  {
    "category": "Investment Stage",
    "category_id": "b2e1c8a4-9f3d-4a71-8c2e-1f6d9a0b3e77",
    "options": [
      { "option": "Seed", "option_id": "d1f2e3c4-5b6a-7d8e-9f0a-1b2c3d4e5f6g" },
      { "option": "Series A", "option_id": "e2f3g4h5-6i7j-8k9l-0m1n-2o3p4q5r6s7t" }
    ]
  },
  {
    "category": "Check Size Range",
    "category_id": "c3d4e5f6-7g8h-9i0j-1k2l-3m4n5o6p7q8r",
    "min": 100000,
    "max": 1000000
  }
]}
```

`MandateSelectionItem` in `src/api/mandate.ts` becomes a discriminated
union of `MandateCategorySelection` (`category`, `category_id`,
`options: {option, option_id}[]`) and `MandateCheckSizeSelection`
(`category`, `category_id`, `min`, `max`), discriminated on `"options" in
item`. A category with zero selections is simply omitted from the array
(no empty-`options` entries) — nothing to round-trip, smaller payload.

**Check Size Range gets a real `MandateCategory` row** — confirmed by the
user (2026-08-15): a platform admin creates an 8th category named "Check
Size Range" via the same Mandate Taxonomy admin page as the other seven,
with zero options under it, purely so it has a stable `category_id`. No
backend change needed for this — the existing admin CRUD already supports
a category with an empty options list. `SECTION_CATEGORY_NAMES` in
`mandateSelection.ts` is joined by a sibling constant/lookup for this
8th name, kept separate from the `MandateSection` union (the other seven)
since Check Size Range has no `OptionPicker`/dropdown — it's the two
existing plain number inputs, unaffected by category-options at all except
for needing the category's `id` to save.

**Consequence for D4** (below): Check Size Range moves from
"legacy-blob-only" to being **authoritative in the new `mandates` table**
too, same as the other seven fields — see D4's revision.

**If the "Check Size Range" category doesn't exist yet** (fresh
environment, admin hasn't created it): the two number inputs still work
normally (they don't depend on the category to function), but `doSave`
cannot fabricate a `category_id`, so the Check Size Range entry is simply
**omitted** from the `PUT /mandate` array until the category exists —
consistent with `toMandateItems` already dropping any selection whose
category can't be resolved. The value still round-trips through the
legacy-blob mirror in the meantime (see D4).

### D3 — Financial Thresholds, Hold Period, and Target Return: comment out together, no relocation (revised 2026-08-15)

The whole `SectionCard id="financial"` — thresholds, Hold Period, and Target
Return alike — is wrapped in `{/* … */}` and stops rendering. State, the
`thresholdFields` array, `holdPeriod`/`targetReturn` state, and the save
payload are all left untouched — a one-line-uncomment revert. No new
"Return Profile" section is created; an earlier draft of this plan proposed
relocating Hold Period/Target Return elsewhere so they'd keep an editor, but
the user opted for the simpler, literal reading of the original request
(comment the whole box out) over that added surface.

Consequence, stated plainly rather than left implicit: once this ships,
`holdPeriod`/`targetReturn` have **no edit UI anywhere in the product
portal** — they're still read (from whatever was last saved to the legacy
blob) by `FirmProfileBlock.tsx`'s Firm Summary card, `Deals.tsx`
(`buildMandateBannerFields`), and `MandateBanner.tsx`, just not editable
from the Mandate Builder tab. Restoring an editor for them, if wanted later,
is exactly the one-line JSX uncomment.

### D4 — Field split: category picks + Check Size Range → new table; everything else stays in the legacy blob (dual-write) (revised 2026-08-15)

- **`mandates` table (`PUT /mandate`) is authoritative** for the seven category-backed fields **and now Check Size Range** (D2 revision) — eight fields total.
- **`investment_profile.mandate` blob (legacy tRPC `investmentProfile.upsert`) remains the store** for `holdPeriod`, `targetReturn`, `esgCriteria`, `specialNotes`, and the five (now hidden) threshold numbers. There is no backend endpoint for these on the new table and inventing one is out of scope. `checkMin`/`checkMax` **move out of this list** per D2's revision — see below.
- All eight fields (the seven category arrays plus `checkMin`/`checkMax`) keep being **mirrored** into the blob on save, write-only. Not because we want two sources of truth, but because `Deals.tsx`/`MandateBanner.tsx`/`FirmProfileBlock.tsx` read `mandateSectorLabels`/`checkMinK`/`checkMaxK` out of the blob today, and rewiring those readers is a larger, riskier diff than an eight-field mirror. Verified in Alpha: **nothing server-side reads the blob's internals** (`app/api/investment_profile.py` returns it opaquely), so the mirror is purely a frontend-compat artifact.
- **The Builder never hydrates the eight new-table fields from the blob.** Hydration for those (including Check Size Range's `checkMin`/`checkMax` inputs) comes from `GET /mandate` only, same rule now extended from seven fields to eight. The mirror is write-only and gets deleted when `Deals.tsx`/`MandateBanner.tsx`/`FirmProfileBlock.tsx` migrate to reading `GET /mandate` directly — call that out in the implementation doc as a follow-up, not this plan's job.
- Check Size Range's `min`/`max` in the `PUT /mandate` payload are the same numbers as `checkMin`/`checkMax` state — just also written to the new table when the "Check Size Range" category exists (see D2's fallback when it doesn't yet).

### D5 — One Save button, two writes, one dirty/saving state

`doSave` becomes `async`: `await Promise.all([trpcUpsert.mutateAsync(blob), putMandate.mutateAsync(items)])`. `setIsDirty(false)` and a single `toast.success("Mandate saved.")` fire only after both resolve; any rejection leaves `isDirty` true and toasts the error once. `onStateChange` reports `saving: trpcUpsert.isPending || putMandate.isPending`. `MandateScorecard.handleSaveConfiguration` is unchanged — it calls the ref and ignores the promise, which is fine; `doSave` no-ops if a save is already in flight.

### D6 — Dropdown-only everywhere, one picker component

`TagField`'s Radix `Select` + `"+ Custom…"` free-text escape hatch is removed entirely. A single `OptionPicker` (Popover + cmdk `Command`, both already in `@/components/mvp/primitives`) is defined once inside `EditableMandateBlock.tsx` and used by both `TagField` (chips: Stage/Geo/Sector/Deal Type/Asset Class) and `BulletList` (rows: Must-Have/Deal-Breaker). No new dependency; nothing is re-implemented.

`BulletList` keeps its bullet-row rendering for Must-Have/Deal-Breaker — the mockup's structure for those sections is rows, not chips, and CLAUDE.md's design-compliance rule is about structure, not just tokens. It gains one optional `options?: string[]` prop: when present it renders the picker instead of the free-text input. ESG & Values keeps the existing free-text mode (it is not a `MandateOptions` category and gets no dropdown).

### D7 — Honest empty states, not blank fields

Per CLAUDE.md's "visible, disabled, explained": while `/mandate-categories` is loading, every add-trigger is disabled. If a section's category is absent from the response, or present with zero options, the trigger renders **disabled** with the note *"No options configured — ask a platform admin."* Never a free-text fallback, never a silent no-op.

---

## 3. Phasing

Admin page first: it is the only way to create the taxonomy the Builder consumes, and it is the lower-risk surface.

| Phase | Scope |
|---|---|
| **0** | Product API client + selection mapping module + its test. No UI. |
| **1** | Admin taxonomy page (types, client fns, hooks, page, route, nav). Shippable alone. |
| **2** | Mandate Builder rewire (picker, hydration, dual-write save, Financial Thresholds comment-out + Return Profile relocation). |
| **3** | Dead-code removal (`MANDATE_DEFAULTS` fields, five `*_PRESETS`) + reset-to-defaults reconciliation. |
| **4** | Test fallout + `pnpm check` + `pnpm lint`. |

---

## 4. File-by-file

### Phase 0

**NEW `src/api/mandate.ts`** — mirrors `src/api/investmentProfile.ts` exactly (thin `apiFetch`, throw on `!res.ok`, cast). Exports:
- `MANDATE_CATEGORIES_QUERY_KEY = ["mandateCategories"] as const`, `MANDATE_QUERY_KEY = ["mandate"] as const`
- types `MandateCategory { id, category, options: { id, option }[] }`, `MandateSelectionItem` (D2), `MandateResponse { mandate: MandateSelectionItem[]; updatedAt: string }`
- `fetchMandateCategories(): Promise<MandateCategory[]>` → `GET /api/mandate-categories`
- `fetchMandate(): Promise<MandateResponse | null>` → `GET /api/mandate`
- `putMandate(items: MandateSelectionItem[]): Promise<MandateResponse>` → `PUT /api/mandate`, body `{ mandate: items }`

Do not construct URLs anywhere else; `@/api/http` stays the single fetch boundary.

**NEW `src/lib/mandateSelection.ts`** — the only place D2's shape exists:
- `SECTION_CATEGORY_NAMES: Record<MandateSection, string>` (D1's seven pairs)
- `optionsForSection(categories, section): { id, option }[] | null` — `null` = category absent
- `toMandateItems(selections: Record<MandateSection, string[]>, categories): MandateSelectionItem[]`
- `fromMandateItems(items): Record<MandateSection, string[]>` — group by normalized `category`, drop unknown categories, preserve order, dedupe

**NEW `src/lib/mandateSelection.test.ts`** — round-trip assertion (`fromMandateItems(toMandateItems(x)) === x`), unknown-category items dropped on read, case-insensitive name match, missing category → `null`. This is the one runnable check that fails if the payload contract breaks.

### Phase 1 — admin taxonomy page

Order matters: types → client → keys → hooks → page → route → nav.

1. **EDIT `src/admin/types.ts`** — append `AdminMandateOption { id: string; categoryId: string; option: string }` and `AdminMandateCategory { id: string; category: string; options: AdminMandateOption[] }`. Note the admin option shape carries `categoryId`; the product one does not — keep them as separate types, do not share across the admin/product boundary.
2. **EDIT `src/admin/api/adminClient.ts`** — seven functions in the existing style: `listMandateCategories`, `createMandateCategory({ category })`, `updateMandateCategory(id, { category })`, `deleteMandateCategory(id)`, `createMandateOption(categoryId, { option })`, `updateMandateOption(id, { option })`, `deleteMandateOption(id)`. Paths under `/api/admin/mandates/...`.
3. **EDIT `src/admin/hooks/queryKeys.ts`** — `mandateCategories: ["admin", "mandateCategories"] as const`.
4. **NEW `src/admin/hooks/useMandateCategories.ts`** — modelled on `useOrganizations.ts`: one `useQuery` gated `enabled: isPlatformAdmin`; six mutations, each invalidating `adminKeys.mandateCategories` and toasting success/error. No optimistic updates.
5. **NEW `src/admin/pages/MandateTaxonomy.tsx`** — `AdminLayout title="Mandate Taxonomy"`, `DataState` for loading/error/empty, a `Table` of categories (`Name`, `Builder section`, `Options`, actions). Expansion via a local `useState<Set<string>>` of expanded category ids rendering a nested options row — no new primitive. Actions: "New category" dialog, per-row rename dialog, per-row delete (`ConfirmDialog`, description **must** name the cascade and the option count, e.g. *"Deletes “Geographies” and all 20 of its options. This cannot be undone."*), per-category "Add option", per-option rename/delete (`ConfirmDialog`). Forms use `react-hook-form` + `zod` like `Organizations.tsx`; `zod` max lengths **150 (category) / 255 (option)**, matching the DB columns once the §8 gap 1 addendum (widening `option` from 50 to 255) has landed in Alpha — if implementing before that migration ships, use 50 for `option` and revisit once it does. The "Builder section" column derives from `SECTION_CATEGORY_NAMES`; unmatched categories show a muted *"Not used by the Mandate Builder"*.
6. **EDIT `src/admin/AdminApp.tsx`** — `<Route path="/mandate-taxonomy" component={MandateTaxonomy} />` before the catch-all.
7. **EDIT `src/admin/components/AdminNav.tsx`** — inside the existing `if (isPlatformAdmin)` block, `{ href: "/mandate-taxonomy", label: "Mandate Taxonomy", icon: ListChecks }`.

Separation rule: this page imports only `@/components/mvp/primitives`, `@/lib/*`, and `../` admin modules. It must **not** import `src/api/mandate.ts` or anything under `src/components/mvp/mandate/**` — including `SECTION_CATEGORY_NAMES`. Duplicate the seven-name map into the admin page (a seven-line const) rather than bridging the surfaces; per CLAUDE.md, that is the correct trade.

### Phase 2 — Mandate Builder rewire

**EDIT `src/components/mvp/mandate/EditableMandateBlock.tsx`** (all changes in one file):

- **Imports**: drop the five `*_PRESETS` and the `Select` family; add `Popover`/`Command` from `@/components/mvp/primitives`, `useQuery`/`useMutation`, and the Phase-0 modules.
- **Queries**: `useQuery(MANDATE_CATEGORIES_QUERY_KEY, fetchMandateCategories)` and `useQuery(MANDATE_QUERY_KEY, fetchMandate)`.
- **Hydration — two independent one-shot effects, two separate refs.** Effect A (the existing one) keeps hydrating only the non-category fields from `profile`; the seven `getStringArray(...)` lines are removed from it and from the `useState` initializers (all seven initialize to `[]`). Effect B fires once when the mandate query has settled (`isSuccess`, including a `null` result) and applies `fromMandateItems(data?.mandate ?? [])`. Never re-hydrate after a background refetch — same guard semantics as today.
- **`OptionPicker`** (new local component): `Popover` + `Command`/`CommandInput`/`CommandList`/`CommandEmpty`/`CommandItem`. Props `{ label, options, used, disabled, disabledReason, onSelect }`. Filters out already-selected values case-insensitively; cmdk owns search filtering. Keep `aria-label`s stable and descriptive (`Select sector to add`) so tests and screen readers have a handle.
- **`TagField`**: `presets: readonly string[]` → `options: string[] | null`; delete `CUSTOM_OPTION`, `mode === "custom"`, `commitCustom`, and the free-text input; render `OptionPicker`. `options === null` or `[]` → disabled trigger + explanatory note (D7).
- **`BulletList`**: add optional `options?: string[] | null`; when present render `OptionPicker` in place of the input/Add button. ESG keeps the free-text path unchanged.
- **Call sites**: five `TagField`s and the two `BulletList`s (Must-Have, Deal-Breaker) get `options={optionsForSection(categories, "…")}`. `newMustHave`/`newDealBreaker` state and their handlers are deleted; `newEsg` stays.
- **Financial Thresholds**: wrap the whole `SectionCard id="financial"` JSX — thresholds rows, Hold Period row, Target Return row — in `{/* … */}` with a comment stating it is a deliberate, reversible hide (not dead code) and that `thresholdFields`/state/save payload are intentionally live. Do not touch `openSections`. No replacement section is added (D3, revised).
- **`doSave`**: D5. Blob payload keeps every field it has today, including the seven category arrays (D4 mirror) — add a comment marking the mirror write-only and naming its removal condition (`Deals.tsx`/`MandateBanner.tsx` migrating to `GET /mandate`). New second write: `putMandate(toMandateItems(selections, categories))`. On success invalidate `MANDATE_QUERY_KEY` alongside the two existing invalidations.

### Phase 3 — dead code + reset

**EDIT `src/data/mandateDefaults.ts`** — delete `STAGE_PRESETS`, `GEOGRAPHY_PRESETS`, `SECTOR_PRESETS`, `DEALTYPE_PRESETS`, `ASSETCLASS_PRESETS`, and from `MANDATE_DEFAULTS`: `mandateSectorLabels`, `mandateGeoLabels`, `investmentStages`, `mustHaves`, `dealBreakers` (required by decision 2), `esgCriteria` and `specialNotes` (both fabricated demo content — the Vistara blurb especially — CLAUDE.md forbids fabricated defaults; ESG/Notes start empty), and now also `holdPeriod`/`targetReturn` (§7 Q2, resolved: both fabricated, demoted to empty). **Keep** `checkMinK`/`checkMaxK` and the five threshold numbers (still feeding the hidden card's save payload). `FRAMEWORK_DEFAULTS` and `InvestmentProfile` are untouched.

**EDIT `src/pages/MandateScorecard.tsx`** — `handleResetToDefaults` drops every removed key from its blob payload, and **must also clear the new table**: fire `putMandate([])` alongside the tRPC reset, awaiting both before the success toast, then invalidate `MANDATE_QUERY_KEY`. Without this, "Reset to Defaults" leaves every chip in place, which is a lie. The `EditableMandateBlock` hydration guard means a reset does not repopulate the mounted form — acceptable and pre-existing; the page already relies on the user seeing the toast. Do not add a remount hack.

**EDIT `src/components/mvp/mandate/FirmProfileBlock.tsx`** — it reads `checkMinK`/`checkMaxK` (retained, no change) and `targetReturn`/`holdPeriod` (now defaulting to `""` instead of fabricated text). Find the Firm Summary card's rendering of these two fields and render `—` (or whatever this file's existing empty-value convention is — check `getString`/similar helpers and other fields in the same card first, match it rather than inventing a new one) when the value is empty, instead of showing blank text. Verify `Deals.tsx`/`MandateBanner.tsx` don't have their own hardcoded fallback to the old fabricated strings (`"4–6 years"` / `"3–5× MoIC / 25%+ IRR"`) — if they do, apply the same empty-value treatment there.

`src/pages/Deals.tsx` and `MandateBanner.tsx` are untouched (D4 mirror keeps them fed).

### Phase 4 — tests

- **`src/components/mvp/mandate/EditableMandateBlock.test.tsx`** — the entire first `describe` (preset/custom flow) is obsolete. Rewrite: mock `@/api/mandate`'s three functions; assert (a) options come from the mocked categories response and are filterable by typing, (b) no "+ Custom…" option and no free-text input exist anywhere, (c) a category with no options renders a disabled trigger with the explanation, (d) chips hydrate from `GET /mandate` not from the profile blob, (e) save calls **both** `putMandate` (with the D2 shape) and the tRPC mutate. The Check Size Range describe survives with its default-fallback expectations intact; the Deal Types / Asset Classes describe is rewritten to hydrate from `GET /mandate` rather than the blob. Keep the existing `beforeAll` pointer-capture stubs (Popover needs them too).
- **`src/__tests__/mandateDefaults.test.ts`** — delete the whole `MANDATE_DEFAULTS` describe (all three assertions cover deleted arrays). `FRAMEWORK_DEFAULTS` describe unchanged.
- **`MandateHistoryDrawer.tsx`** — audited: pure empty-state, reads no mandate fields. No change, and no test fallout.
- New: `src/lib/mandateSelection.test.ts` (Phase 0). An admin-page test is optional — the existing admin pages set no such precedent; skip unless the implementer finds a cheap smoke test.
- Close with `pnpm check` and `pnpm lint`.

---

## 5. Non-goals

No `src/shared/` changes. No new npm dependency. No OpenAPI generation (FE-6/7 still pending; hand-written types per the existing convention). No mandate versioning/history. No change to the Firm Profile, Scoring Framework, or Deal Scorecard tabs. No backend edits from this repo's session, per CLAUDE.md.

---

## 6. Risks

1. **A fresh environment has an empty taxonomy.** Nothing seeds `mandate_categories`; until a platform admin creates all seven categories by exact name, every Builder section renders its disabled empty state. This is correct behavior but will read as "broken" on first run — the implementer should create the seven categories via the Phase-1 admin page before testing Phase 2. §8 gap 2.
2. **Must-Have / Deal-Breaker options do not fit in the DB column — until the §8 gap 1 addendum ships.** The admin page will reject at 50 chars, which is shorter than every realistic criterion. Sequence implementation so the Alpha-side widening migration lands before anyone tries to populate real Must-Have/Deal-Breaker options through the Phase 1 admin page.
3. **Dual-write partial failure.** If the blob write succeeds and `PUT /mandate` fails (or vice versa), the two stores diverge until the next successful save. Accepted: the form stays dirty and the error is toasted, so the user's next Save reconciles. Not worth a transaction-coordination scheme across two unrelated endpoints.
4. **`hasHydrated` + reset interaction** is pre-existing and unchanged; noted so it isn't mistaken for a new bug.
5. **The D2 payload shape is provisional** — isolated to `mandateSelection.ts` precisely so a follow-up spec is a one-file change plus a test update.

---

## 7. Open questions

**Q1 — Category names — resolved 2026-08-15.** D1's seven strings are confirmed correct. More categories can be added later; nothing in this plan assumes exactly seven — the admin page supports arbitrary categories, and any category whose name doesn't match `SECTION_CATEGORY_NAMES` simply renders in the admin list as "Not used by the Mandate Builder" rather than breaking anything. No plan change needed for this beyond what D1 already specifies.

**Q2 — `holdPeriod` / `targetReturn` defaults — RESOLVED 2026-08-15: demote to empty.** `"4–6 years"` and `"3–5× MoIC / 25%+ IRR"` were fabricated firm-specific values in `MANDATE_DEFAULTS`, rendered by `FirmProfileBlock`'s Firm Summary for orgs that never set them. Per the user's confirmation, both are deleted from `MANDATE_DEFAULTS` (Phase 3) so they default to empty (`""`) rather than fabricated text. `FirmProfileBlock.tsx`'s Firm Summary card must render an em dash (`—`) — its existing convention for other unset fields, verify against the file rather than assume — instead of an empty string when either is unset. `Deals.tsx`/`MandateBanner.tsx` read these opaquely from the blob same as before; verify neither has a hardcoded fallback to the old fabricated strings.

**Q3 — ESG & Special Notes defaults — settled as part of decision 2.** Phase 3 deletes them (fabricated demo content, same class as the arrays decision 2 covers). Trivial to reinstate if that reads wrong once implemented.

---

## 8. Backend gaps found

**For a future addendum plan in `Simpero_AI_Gov_Alpha/docs/plans/` — not to be built now, and not from this repo's session.** Flagged only; no frontend work below depends on them, and the frontend is specified to behave correctly without them.

1. **RESOLVED (addendum written 2026-08-15).** `mandate_options.option` was `String(50)`, too short for Must-Have / Deal-Breaker criteria — several deleted-in-Phase-3 sample values exceed 50 characters (e.g. `"Founder/CEO with demonstrated execution and scaling experience"`, 62 chars). Addendum plan `Simpero_AI_Gov_Alpha/docs/plans/mandate-options-widen-option-column.md` specifies widening it to `String(255)` (model edit + migration), for that repo's own session to implement. Not yet implemented as of this writing — the Phase 1 admin page will still reject long option values until that lands.
2. **No seed data and no stable join key.** The frontend joins sections to categories by display name (D1) because no seed exists and ids are per-environment. Recommend either a seed migration creating the seven canonical categories — the deleted `STAGE_PRESETS`/`GEOGRAPHY_PRESETS`/`SECTOR_PRESETS`/`DEALTYPE_PRESETS`/`ASSETCLASS_PRESETS` arrays in `src/data/mandateDefaults.ts` are the natural seed content, worth lifting before Phase 3 deletes them — or a `key`/`slug` column so the join stops depending on an admin-editable display string.
3. **Duplicate-name writes return 500, not 409.** `POST /admin/mandates/categories` with an existing `category`, and `POST /categories/{id}/options` with a duplicate `option` in that category, both hit unique constraints with no `IntegrityError` handler in `app/api/admin/mandates.py`. `app/api/deals.py:423` already has the precedent handler to copy. Until then the admin page surfaces a generic error string — acceptable, but poor.

Not defects, noted for completeness: `PUT /mandate` accepts any JSON list by design (documented in the model docstring); `mandates`' `FOR ALL … USING` policy correctly covers INSERT since Postgres reuses `USING` as `WITH CHECK` when the latter is omitted; ordering is already alphabetical server-side in both repos, so the frontend does no client-side sorting.

---

## 9. Handoff summary

Execute Phase 0 → 1 → 2 → 3 → 4 in order. Every architectural choice above (payload shape, join key, field split, dual-write orchestration, relocation of Hold Period / Target Return, empty-state behavior) is settled — implement as written. If reality contradicts one of them, stop and raise it rather than improvising a variant. Do not touch `Simpero_AI_Gov_Alpha`.

Relevant paths, all absolute:
- `/Users/vanshkhanna/Documents/Simpero/Simpero_AI_Gov_Web/src/api/mandate.ts` (new)
- `/Users/vanshkhanna/Documents/Simpero/Simpero_AI_Gov_Web/src/lib/mandateSelection.ts` (+ `.test.ts`, new)
- `/Users/vanshkhanna/Documents/Simpero/Simpero_AI_Gov_Web/src/components/mvp/mandate/EditableMandateBlock.tsx` (+ `.test.tsx`)
- `/Users/vanshkhanna/Documents/Simpero/Simpero_AI_Gov_Web/src/pages/MandateScorecard.tsx`
- `/Users/vanshkhanna/Documents/Simpero/Simpero_AI_Gov_Web/src/data/mandateDefaults.ts`, `/Users/vanshkhanna/Documents/Simpero/Simpero_AI_Gov_Web/src/__tests__/mandateDefaults.test.ts`
- `/Users/vanshkhanna/Documents/Simpero/Simpero_AI_Gov_Web/src/admin/{types.ts,api/adminClient.ts,hooks/queryKeys.ts,hooks/useMandateCategories.ts,pages/MandateTaxonomy.tsx,AdminApp.tsx,components/AdminNav.tsx}`

---

## 10. Revision 2 — reshape `PUT /mandate` to nested-by-category + Check Size Range (2026-08-15)

**Phases 0–4 above were already fully implemented** against the original D2 shape (flat, camelCase, one row per selected option, Check Size Range excluded from the new table). This section is a follow-up implementation pass, not a restart — it edits the already-built files to match the user's revised D2/D4 (see those sections above for the full rationale; this section is just the mechanical checklist).

**`src/api/mandate.ts`** — replace `MandateSelectionItem` with the discriminated union from D2 (`MandateCategorySelection | MandateCheckSizeSelection`, discriminated on `"options" in item`). `putMandate`/`fetchMandate`/`MandateResponse` signatures are unchanged (still `MandateSelectionItem[]`), only the item shape changes.

**`src/lib/mandateSelection.ts`** — this is where nearly all the logic changes:
- Add a `CHECK_SIZE_CATEGORY_NAME = "Check Size Range"` constant and a `findCheckSizeCategoryId(categories): string | null` helper (reuse the existing `findCategory`-style name match, case-insensitive/trimmed).
- `toMandateItems` signature grows a `checkSize: { min: number; max: number }` parameter: `toMandateItems(selections, checkSize, categories): MandateSelectionItem[]`. For the seven option-backed sections, group each section's selected labels into one `MandateCategorySelection` entry (resolving each label to its `option`/`option_id` via the category's options, same drop-if-unresolvable rule as before) — **omit the category entirely if it has zero selections**. Then, if the Check Size Range category exists in `categories`, append one `MandateCheckSizeSelection` entry; if it doesn't exist, omit it (D2's fallback).
- `fromMandateItems` return type changes to `{ sections: Record<MandateSection, string[]>; checkSize: { min: number; max: number } | null }`. Walk the array once: entries with `options` populate `sections` by matching `category` against `SECTION_CATEGORY_NAMES` (same drop-unknown/dedupe/preserve-order rule as before, just reading from the nested `options` array instead of one item per option); the one entry (if any) matching `CHECK_SIZE_CATEGORY_NAME` populates `checkSize`.
- `optionsForSection` is unchanged (it reads `/mandate-categories`, unrelated to this saved-selection shape).

**`src/lib/mandateSelection.test.ts`** — rewrite the round-trip/drop/case-insensitivity assertions against the new nested shape and the `{sections, checkSize}` return shape; add a case for the Check Size Range category being absent (dropped from `toMandateItems`'s output, `checkSize: null` from `fromMandateItems`).

**`src/components/mvp/mandate/EditableMandateBlock.tsx`**:
- Hydration effect B (the one driven by `GET /mandate`) now also sets `checkMin`/`checkMax` from `fromMandateItems(...).checkSize` when non-null, instead of leaving those two fields sourced only from the legacy blob's Effect A. If `checkSize` is null (category not yet created, or org never saved), Effect A's blob-sourced value stands — Check Size Range still needs *some* source until the category exists everywhere.
- `doSave`'s `putMandate` call becomes `putMandate(toMandateItems(selections, { min: checkMin, max: checkMax }, categories))`.
- The blob-write payload in `doSave` gains `checkMin`/`checkMax` alongside the seven category arrays it already mirrors (D4 revision — same write-only mirror pattern, one more field).

**`src/components/mvp/mandate/EditableMandateBlock.test.tsx`** — update the save-assertion tests to check the new nested payload shape (grouped-by-category, snake_case keys, Check Size Range entry present/absent per category existence) instead of the flat shape; update the hydration test to seed `GET /mandate` with the nested shape.

**`src/admin/pages/MandateTaxonomy.tsx`** — the "Builder section" column's local seven-name map (duplicated from `SECTION_CATEGORY_NAMES` per the admin/product separation rule) gains an eighth pair, `"Check Size Range" → "Check Size Range (numeric — no options needed)"` or similar, so a platform admin creating this category sees it correctly labeled as used by the Builder rather than the default "Not used by the Mandate Builder" — and so they understand not to bother adding options under it.

No other files from Phases 0–4 need touching. `pnpm check` and `pnpm lint` still close the pass.
