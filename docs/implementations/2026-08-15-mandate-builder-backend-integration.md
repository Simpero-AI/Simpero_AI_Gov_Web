# Mandate Builder — Backend Integration — Implementation Summary (2026-08-14 → 2026-08-15)

**Status: committed and pushed.** `SIM-212` (`f32d26b`) — 25 files, includes
both plan docs referenced below. Not yet merged; no PR opened as of this
writing.

Session record of wiring the Mandate Builder tab to the `mandates` /
`mandate_categories` / `mandate_options` backend, adding a platform-admin
taxonomy management page, and fixing several bugs surfaced by manual
browser testing after the initial build. Written as a memory artifact —
read this before picking related work back up, and prefer it over the plan
docs below where they disagree (this doc reflects what actually shipped,
including several corrections made after the plans were written).

**Plan docs (this repo):** `docs/plans/2026-08-14-mandate-builder-backend-integration.md`
(the original build — D1–D9 decisions, phasing, later revised in place for
the nested-payload reshape and the fully-hidden-Financial-Thresholds
decision) and `docs/plans/2026-08-15-mandate-suboptions.md` (the
generalized parent/child option feature, e.g. Geographies → Canada →
provinces). Both are kept up to date with what was decided, not just what
was originally proposed.

**Cross-repo, backend-gated.** No backend code was touched from this
repo's sessions, per `CLAUDE.md`'s rule. Four addendum plan docs were
written into `Simpero_AI_Gov_Alpha/docs/plans/` for that repo's own
sessions to implement:

| Addendum | Purpose | Status as of this writing |
|---|---|---|
| `mandate-options-widen-option-column.md` | Widen `mandate_options.option` 50→255 chars (Must-Have/Deal-Breaker criteria don't fit in 50) | **Confirmed implemented** — `app/models/mandate.py` uses `String(255)` |
| `mandate-options-sub-options.md` | Self-referential `parent_option_id` on `mandate_options`, nested `sub_options` in both taxonomy responses, new admin sub-option endpoint | **Confirmed implemented** — `app/api/mandates.py`'s `_nest_options_by_category` and the sub-options admin route are live |
| `mandate-save-audit-log.md` | Write a `mandate_saved` audit row on every `PUT /mandate` | **Confirmed implemented** |
| `mandate-save-audit-detail.md` | Diff payload + expose `actorEmail`/`payload` on `GET /logs/recent-activity` | **Confirmed implemented** — `app/api/logs.py` returns both fields |

All four were verified by reading the actual backend code during this
session, not assumed from the plan docs' existence.

---

## 1. What was built

**Product-side API client** (`src/api/mandate.ts`, new) — `fetchMandateCategories`,
`fetchMandate`, `putMandate`, following the existing `investmentProfile.ts`
thin-`apiFetch` convention. `MandateSelectionItem` is a discriminated union:
category entries (`{category, category_id, options: [{option, option_id,
sub_options?}]}`) and one structurally different Check Size Range entry
(`{category, category_id, min, max}`, no `options`). Recursive
`MandateOptionNode` (`subOptions?`) mirrors the backend's nested taxonomy
shape.

**Selection mapping** (`src/lib/mandateSelection.ts`, new) — the single
place the save/load payload shape exists: `toMandateItems`/`fromMandateItems`
resolve the Builder's per-section label arrays and `SubSelections` (parent
label → child labels, one level deep) against the fetched categories,
dropping anything unresolvable rather than guessing. `categoryDisplayName`
makes every section heading read the real category name from the backend
(falls back to the expected name while loading or before an admin has
created it). `CHECK_SIZE_UNIT_K = 1000` is the exported single source of
truth for the $K↔dollar conversion (see §3).

**Mandate Builder rewire** (`src/components/mvp/mandate/EditableMandateBlock.tsx`)
— every category picker (Investment Stage, Geographies, Target Sectors,
Deal Types, Must Have, Deal Breaker) is dropdown-only and searchable via a
new `OptionPicker` (Popover + the existing `cmdk` `Command` primitive) — no
free-text fallback anywhere. An option with children (e.g. Canada) renders
an inline "Add under X" sub-picker; selected children show as smaller
indented chips. Hydration is two independent one-shot effects (legacy blob
for a handful of orphaned fields, `GET /mandate` for everything
category-backed) — see §5 for a hydration-timing bug found and fixed here.
Save is `putMandate(toMandateItems(...))` only (see §4 for why the legacy
blob write was dropped entirely, not just made best-effort).

**Admin Mandate Taxonomy page** (`src/admin/pages/MandateTaxonomy.tsx`,
new; `useMandateCategories.ts`, new hook; `adminClient.ts`/`types.ts`
extended) — platform-admin-only (gated in `AdminNav.tsx` same as
Organizations), category/option CRUD with one more level of nesting for
sub-options, delete confirmations that name the cascade count. Duplicates
the seven-name section↔category map locally rather than importing product
code, per the admin/product separation rule.

**Hidden sections** — Financial Thresholds, ESG & Values Criteria, Special
Considerations & Structural Notes, and Asset Classes are all commented out
of the JSX (not deleted): state, save-payload plumbing, and type-level
support all stay live, so restoring any of them is a one-line uncomment.
Applied incrementally over the session as the user called out each one; the
"Investment Parameters" summary badge no longer mentions asset classes
since there's no picker to add any.

**Mandate History drawer** (`MandateHistoryDrawer.tsx`) — was a hardcoded
"History isn't tracked yet" placeholder; now queries the existing
`GET /logs/recent-activity` (same endpoint the Deal Analysis workspace's
`ActivityPane` already used, just filtered client-side to `mandate_saved`
instead of by session), and renders who saved (`actorEmail`) and a
formatted diff (`payload`) — e.g. "Investment Stage: +Series A",
"Geographies: +Canada → +British Columbia", "Check Size Range: $30K–$100K
→ $30K–$120K". Degrades to just "Mandate saved" + timestamp for
entries/environments predating the audit-detail addendum.

**Check Size Range unit conversion** — the Builder's inputs are `$K`
(entering "30" means $30K); the saved mandate and its audit-diff payload
both store the full dollar amount (30 → 30000). Conversion lives once, at
the `toMandateItems`/`fromMandateItems` boundary in `mandateSelection.ts`
— neither the component's own state nor the backend needed to change.

---

## 2. Deviations from the plans, and why

- **D2's original flat, camelCase, one-row-per-option save shape was
  replaced mid-session** by the user's own spec: nested-by-category,
  snake_case (`category_id`/`option_id`), with Check Size Range promoted
  from "legacy-blob-only" into the new table as an eighth entry. Fully
  reflected in the plan doc's "Revision 2" section and in the shipped code
  — not a half-migration.
- **D3 (Financial Thresholds) was simplified from "relocate Hold
  Period/Target Return to a new Return Profile section" down to "just
  comment the whole card out."** The user chose the literal, simpler
  reading over the architect's added-surface option. Consequence, stated
  in code and here: Hold Period/Target Return currently have no editor
  anywhere in the product portal.
- **Sub-options generality**: the user asked for a reusable capability
  (any option, any category), not a Canada-specific hack — shipped as a
  self-referential `parent_option_id`, arbitrary depth in the schema, one
  level of UI depth by choice (documented ceiling, not a bug).

---

## 3. Bugs found and fixed during manual testing (post-build)

These surfaced after the initial implementation, once the user actually
exercised the feature in the browser — not caught by the test suite, since
several are integration/timing issues invisible to mocked unit tests.

1. **Dead legacy tRPC calls, three separate instances.** `EditableMandateBlock.doSave`,
   `MandateScorecard.handleResetToDefaults`, `FirmProfileBlock.doSave`, and
   `EditableFrameworkBlock.doSave` all called `trpc.investmentProfile.upsert`.
   That procedure has no live target: the dev proxy forwards all `/api/*`
   (including `/api/trpc/*`) to FastAPI only, no Express/tRPC server exists
   anymore, and no FastAPI write endpoint was ever ported for it. All four
   call sites were removed, not patched to be "best effort." Firm
   Profile/Scoring Framework have **no alternative persistence path at
   all** — their Save button is now honestly disabled with an explanatory
   title rather than silently failing (see §5's design note).
2. **Save/Reset fired across all three always-mounted sections
   unconditionally**, regardless of which tab was active — meaning saving
   from Mandate Builder also fired Firm Profile's (dead) save and
   Scoring Framework's weight-validity check, producing three simultaneous
   toasts for one click. Scoped to the active tab; the three sections stay
   always-mounted (preserves typed state across tab switches) but only the
   active tab's save/reset/dirty-status now drives the topbar.
3. **`isDirty` was a "was anything touched" flag, not a real comparison.**
   Adding then removing the same chip left Save permanently enabled.
   Replaced with a snapshot-comparison against a captured baseline. Found
   and fixed a second bug during that same fix: the baseline was captured
   using a stale (pre-hydration) snapshot because the capture effect
   checked *refs* (which flip synchronously mid-effect) instead of *state*
   (which only reflects a completed render) — an org loading a
   previously-saved mandate would show Save as permanently dirty on load.
   Fixed by introducing two state flags (`blobHydrated`/`mandateHydrated`)
   that the capture effect depends on instead.
4. **Check Size Range history-diff display bug**: the unit-conversion fix
   in item above (Builder is $K, storage is full dollars) was applied to
   the save/load path but missed the History drawer's diff formatter,
   which was still treating the raw (now full-dollar) numbers as already
   being in $K — showing "$30000K–$100000K" instead of "$30K–$100K". Fixed
   by exporting `CHECK_SIZE_UNIT_K` as the single source of truth and
   using it in both places.
5. **Two small polish items**: the Reset confirmation modal's buttons
   weren't text-centered (`flex-1` stretched them but neither had
   `text-center`); the same modal's copy claimed to also reset Scoring
   Framework, which never actually worked (the old combined reset call
   404'd unconditionally) — corrected once Reset became Mandate-Builder-only.

---

## 4. Known gaps / deliberately deferred

- **No persistence for Hold Period, Target Return, ESG Criteria, Special
  Notes, or the five Financial Thresholds numbers.** These only ever lived
  in the legacy `investment_profile.mandate` blob, whose write path is
  gone (§3.1). Restoring them needs either a new FastAPI write endpoint
  for investment-profile, or moving them into the `mandates` table
  (bigger scope, not decided).
- **Firm Profile and Scoring Framework tabs cannot save anything right
  now.** Both are pre-existing features, not something built or broken by
  this session's work, but this session is the first place their broken
  save path became visible/documented rather than silently 404ing.
- **A fresh environment has an empty taxonomy.** Nothing seeds
  `mandate_categories`; a platform admin must create all seven canonical
  categories (exact names — see `SECTION_CATEGORY_NAMES` in
  `mandateSelection.ts`) via the new admin page before the Builder shows
  any options. Category name mismatches (typos, punctuation) fail
  silently-but-honestly — the admin page labels them "Not used by the
  Mandate Builder" rather than guessing a fuzzy match.
- **No seed data, no stable join key** (backend addendum gap, not fixed —
  flagged in the original plan's §8, still open) and **duplicate-name
  writes on the admin taxonomy endpoints return 500, not 409** (missing
  `IntegrityError` handler, precedent exists in `app/api/deals.py`) — both
  explicitly out of scope for every addendum written so far.
- **`docs/split-implementation-status.md`** (the FE-0…FE-10 migration
  ledger) was not updated by this session — worth doing given how much of
  this work intersects the tRPC-removal (FE-7) migration without being
  that migration itself (see §3.1 — four call sites removed, dozens
  remain elsewhere per that doc's own count).
