# Mandate Builder — Nested Sub-Options

Builds on `docs/plans/2026-08-14-mandate-builder-backend-integration.md`'s D1–D7 — read those first; everything here assumes them. This is a distinct follow-up feature, not another revision of that doc.

Architect-authored, pre-implementation. Prefer the eventual `docs/implementations/` writeup where they disagree.

---

## 1. Problem

Some `mandate_options` rows need their own child options. Concretely: Geographies → "Canada" → provinces. Selecting Canada must still record Canada as an ordinary top-level Geographies selection; provinces, if picked, ride along nested inside that same entry.

Generality is a requirement, not a nice-to-have: **any** option in **any** category can have children, via a self-referential parent pointer in `mandate_options`. Nothing in the schema, endpoints, or frontend may name Geographies or Canada. Only the *UI depth* is capped at one level for now.

**This needs a backend schema change.** It is specified separately (see the Alpha addendum, `mandate-options-sub-options.md` in that repo) and must land first — but the frontend is written to degrade cleanly if it doesn't (see D4).

---

## 2. Decisions

### D1 — Taxonomy is nested in `GET /mandate-categories`, no second fetch

`MandateCategory.options[]` gains `subOptions: MandateOption[]` (recursive, camelCase over the wire). The Builder must know *which* options have children in order to decide whether to render a drill-down at all, so a second fetch would be a round trip for data the first response already has in hand. Backend nests recursively (arbitrary depth) — see the addendum.

### D2 — Taxonomy always sends `subOptions` (possibly `[]`); the **saved mandate** omits `sub_options` when empty

Deliberate asymmetry, do not "fix" it:
- `/mandate-categories` is a lookup — `subOptions: []` everywhere makes every consumer a plain `.length` check.
- `PUT /mandate` is a stored document — it already omits whole categories with zero selections (existing rule), so an empty `sub_options` key would be the odd one out.

### D3 — Saved shape: `sub_options` nested inside the parent's option entry

```json
{
  "category": "Geographies",
  "category_id": "…",
  "options": [
    { "option": "United States", "option_id": "…" },
    {
      "option": "Canada",
      "option_id": "…",
      "sub_options": [
        { "option": "British Columbia", "option_id": "…" },
        { "option": "Ontario", "option_id": "…" }
      ]
    }
  ]
}
```

snake_case, matching the surrounding `option_id`/`category_id` convention. Canada is a normal selection whether or not provinces are picked — a sub-option never implies, replaces, or substitutes for its parent. Old saved mandates (no `sub_options` key) parse unchanged; new ones read by older code degrade to "just Canada".

### D4 — Frontend tolerates a pre-migration backend

Type `subOptions` as **optional** on `MandateCategory`'s option shape and read it as `opt.subOptions ?? []`. Before the Alpha addendum lands, every option has zero children, no sub-picker renders anywhere, and the Builder behaves exactly as it does today. This is what lets the frontend ship independently of migration timing.

### D5 — Builder state: chips stay `string[]`, sub-selections live in one parallel record

Chip identity is the label (existing invariant, ids are re-resolved at save time). Restructuring the seven `string[]` states into objects would ripple through every `TagField`/`addToList`/`removeFromList` call site for one feature. Instead, one new state:

```ts
type SubSelections = Record<MandateSection, Record<string /* parent label */, string[] /* child labels */>>;
```

Removing a parent chip clears `subSelections[section][label]` — one line in the remove handler. No orphan-reaping logic elsewhere; `toMandateItems` iterates selected labels, so orphans could never serialize anyway.

### D6 — Sub-picker reuses `OptionPicker` verbatim, no new UI paradigm

A selected chip whose option has children renders a caret button that opens the same Popover + cmdk `Command` (searchable, dropdown-only, already-picked filtered out). Selected children render as smaller removable chips indented under the parent chip. Chips without children are visually and behaviorally unchanged — no caret, no extra row.

Wording must stay generic (no per-category noun): trigger reads **"Add under Canada"**, accessible name **"Select an option under Canada to add"**. `OptionPicker` gains one optional prop `commandLabel?: string` (defaults to today's `Select ${label} to add`) so the aria string can read naturally; nothing else about it changes.

### D7 — One level of drill-down in the UI; schema depth is not the UI's problem

`TagField` renders children of top-level options only. Grandchildren are ignored by the Builder (they still round-trip in the DB and admin page). `BulletList` (Must-Have / Deal-Breaker) gets **no** sub-picker — if someone gives a criterion children, they're silently ignored there. Both are known ceilings, documented, not defects to be "fixed" opportunistically.

### D8 — Sub-selections are **not** mirrored into the legacy `investment_profile.mandate` blob

The D4-of-the-original-plan blob mirror exists solely because `Deals.tsx`/`MandateBanner.tsx`/`FirmProfileBlock.tsx` still read `mandateGeoLabels` etc. out of it. Nothing reads sub-selections. Don't add a field nobody consumes to a store that's already scheduled for deletion.

### D9 — Admin page nests one more level, same expand pattern

Category row → expandable options list → each option expandable to its sub-options. Reuse the existing `expandedIds: Set<string>` for both levels (UUIDs, no collision). Per-option actions become: expand caret (with child count), "Add sub-option", rename, delete. Sub-option rows get rename + delete.

Delete confirmation for an option **with** children must name the cascade and the count, matching the category-delete copy: *"Deletes "Canada" and all 4 of its sub-options. This cannot be undone."* An option with no children keeps today's wording.

---

## 3. File-by-file (in order)

Order matters: types → client → hooks → page/component → tests.

### Phase A — types + client (both surfaces)

1. **EDIT `src/api/mandate.ts`**
   - Extract the option node into a named recursive type:
     `MandateOptionNode { id: string; option: string; subOptions?: MandateOptionNode[] }`; `MandateCategory.options: MandateOptionNode[]`.
   - `MandateCategorySelection.options` element becomes `{ option: string; option_id: string; sub_options?: { option: string; option_id: string }[] }`. `sub_options` optional (D2/D3). Nested one level in the type — the Builder writes one level; deeper data from elsewhere isn't this type's concern.
   - No function signature changes.

2. **EDIT `src/admin/types.ts`**
   - `AdminMandateOption` gains `parentOptionId: string | null` and `subOptions: AdminMandateOption[]` (recursive interface, always present on the admin wire).

3. **EDIT `src/admin/api/adminClient.ts`**
   - One new function, same style as the rest:
     `createMandateSubOption(parentOptionId: string, body: { option: string }): Promise<AdminMandateOption>` → `POST /api/admin/mandates/options/${parentOptionId}/suboptions`.
   - `updateMandateOption` / `deleteMandateOption` are **unchanged** — they work on any option row, parent or child.

4. **EDIT `src/admin/hooks/useMandateCategories.ts`**
   - `useCreateMandateSubOptionMutation()` mirroring `useCreateMandateOptionMutation` (invalidate `adminKeys.mandateCategories`, toast "Sub-option added"). No new query key.

### Phase B — selection mapping

5. **EDIT `src/lib/mandateSelection.ts`**
   - New exported type `SubSelections = Record<MandateSection, Record<string, string[]>>` and an `EMPTY_SUB_SELECTIONS`-style builder (all seven keys present, mirroring how `sections` is initialized).
   - New helper `subOptionLabelsForSection(categories, section): Record<string, string[]>` — parent label → child labels, **only entries with ≥1 child**. Derived generically from `subOptions ?? []`; no category names hardcoded.
   - `toMandateItems(selections, subSelections, checkSize, categories)` — `subSelections` inserted as the 2nd parameter. Per resolved option, resolve `subSelections[section][option.option] ?? []` against that option's `subOptions ?? []`, same drop-if-unresolvable rule as top level; attach `sub_options` **only if the resulting array is non-empty**. Check Size Range handling and the omit-empty-category rule are untouched.
   - `fromMandateItems(items)` returns `{ sections, subSelections, checkSize }`. For each option entry, push the label into `sections` as today; if `sub_options` is present and non-empty, set `subSelections[section][option] = labels` (dedupe, preserve order, same as top level). Unknown-category drop rule unchanged.

6. **EDIT `src/lib/mandateSelection.test.ts`**
   - Extend `CATEGORIES` so "Canada" has two children plus a sibling top-level option with none.
   - New cases: sub-option round-trip; `sub_options` key **absent** when no children selected; a child label with no matching `subOptions` entry is dropped; a `subSelections` entry whose parent isn't selected never appears in the output; a legacy item with no `sub_options` key parses to an empty `subSelections` entry.

### Phase C — Builder UI

7. **EDIT `src/components/mvp/mandate/EditableMandateBlock.tsx`**
   - New state `const [subSelections, setSubSelections] = useState<SubSelections>(…)`, plus `addSub(section, parent, value)` / `removeSub(section, parent, value)` (immutable nested update, `setIsDirty(true)`).
   - `removeFromList` for the five `TagField` sections also clears that label's sub-selections (D5). Pass the section through, or wrap at the call site — implementer's choice, but it must happen for all five, not just Geographies.
   - Hydration effect B additionally applies `fromMandateItems(...).subSelections`. Same one-shot ref, no second guard.
   - `doSave`: `putMandate(toMandateItems(selections, subSelections, { min: checkMin, max: checkMax }, categories))`. Blob payload unchanged (D8).
   - `OptionPicker`: add optional `commandLabel?: string`, defaulting to the current `Select ${label} to add`. Nothing else changes.
   - `TagField` gains four optional props: `subOptions?: Record<string,string[]>` (available children per parent label), `subItems?: Record<string,string[]>` (selected), `onAddSub?(parent, value)`, `onRemoveSub?(parent, value)`. When a chip's `subOptions[item]` is empty/absent, render exactly as today. Otherwise render the caret + `OptionPicker` (`label={\`under ${item}\`}`, `commandLabel={\`Select an option under ${item} to add\`}`, `used={subItems[item] ?? []}`) and the selected children as smaller removable chips indented beneath the parent chip.
   - All **five** `TagField` call sites pass these props (values derived generically) — not just Geographies. A future category with children then works with no code change.
   - `BulletList` untouched (D7).

8. **EDIT `src/components/mvp/mandate/EditableMandateBlock.test.tsx`**
   - Mocked categories: one option with children, others without. Assert: no caret/sub-picker on childless chips; picking a child then saving produces the nested `sub_options` payload; hydration from `GET /mandate` renders the child chips; removing the parent chip removes its children and drops `sub_options` from the next save.

### Phase D — admin taxonomy page

9. **EDIT `src/admin/pages/MandateTaxonomy.tsx`**
   - `OptionDialog` gains optional `parentOptionId?: string`; when set it calls the sub-option mutation and the dialog title/description read "Add sub-option" / "Adds a value nested under this option." Rename mode is shared, no branch needed.
   - Option `<li>` rows become expandable (reuse `expandedIds`), showing a child count when non-zero and rendering a nested indented `<ul>` of sub-options with rename/delete each.
   - Delete confirmation copy per D9.
   - Separation rule still holds: no imports from product code (`src/api/mandate.ts`, `src/lib/mandateSelection.ts`, `src/components/mvp/mandate/**`).

Close with `pnpm check` and `pnpm lint`.

---

## 4. Non-goals

No new npm dependency. No new primitive. No UI beyond one drill-down level. No sub-options in `BulletList`. No `src/shared/` change. No seed data. No backend edits from this repo's session.

---

## 5. Risks

1. **Ships before the backend.** Mitigated by D4 — `subOptions ?? []` means zero visible change until the migration lands. The admin "Add sub-option" button will 404 until then; sequence Phase D after the Alpha addendum, or expect that error.
2. **Sub-option name collisions across parents.** Resolved backend-side (see addendum §Uniqueness): two parents in one category may each have a child named "All". If the implementer sees a 500 on that, the migration hasn't landed correctly — stop, don't work around it in the UI.
3. **Label-keyed sub-selections.** `subSelections` is keyed by the parent's *label*, consistent with chips being label-keyed. If an admin renames Canada, stored `sub_options` still round-trip (they carry their own labels), but the next save re-resolves against the renamed option and drops them — same pre-existing rename behavior as top-level options, not a new failure mode.
4. **Deeper nesting has no UI.** Documented ceiling (D7), not a bug.

---

## 6. Handoff

Execute A → B → C → D. Every shape decision above is settled — implement as written; if reality contradicts one, stop and raise it. Do not touch `Simpero_AI_Gov_Alpha`. Before manual testing, a platform admin must add sub-options under Canada via the admin page (nothing seeds them).
