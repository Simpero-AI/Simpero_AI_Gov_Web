# Web Design Revamp — Implementation Plan

Source design: `Meridian Diligence.dc.html` (a static HTML mockup, not code to
port — rendered via a proprietary mockup DSL/runtime that is irrelevant to
this React codebase). Goal: bring this app's IA and visual design in line
with that mockup. **Out of scope: the New Deal flow** (`NewDealWizard.tsx`,
`src/pages/newDealWizard/**`, route `/new-deal/:step?`) stays exactly as it
is today.

This plan is architect-authored, pre-implementation, per this repo's
`docs/plans/` convention. See `docs/implementations/` for what actually ships
once phases land — prefer that doc over this one if they disagree later.

## 0. Overrides a standing CLAUDE.md rule

CLAUDE.md's **Provenance & the faithful-copy rule** currently says UI/UX must
stay pixel-identical to the monorepo until cutover, no redesigns. This
redesign is a deliberate, explicit exception to that rule, carved out by the
user — not an oversight to "fix" later. Consequences:

- The monorepo drift audit (`git diff <split-sha>..HEAD -- client/ shared/`)
  stops being meaningful for `src/components/**`/`src/pages/**`; still
  meaningful for `src/shared/`.
- Playbook step FE-8 (dual-applying monorepo bugfixes) narrows to
  `src/shared/` + `src/api/` only for redesigned surfaces.
- **The New Deal flow keeps its faithful-copy obligation** — it is the one
  carve-out inside the carve-out.
- CLAUDE.md itself should be amended in Phase 0 to record this exception.

## 1. Screen inventory

Legend: (a) visual revamp of an existing page · (b) net-new · (c) explicitly
out of scope.

### Global chrome
- Sidebar (dark, 3 nav groups: Family Office / Deal Flow (collapsible) /
  Intelligence with nested Institutional Memory sub-nav + count badges, user
  footer card) — (a), but the nav data model changes shape.
- Topbar — 6 per-view variants (Deals, New Deal, Deal, Mandate, Memory,
  Anti-Portfolio/Consolidation) — (a).
- Source Inspector drawer (Full Page / Verbatim Quote toggle) — (a), extends
  `CitationSidebar`.
- External Corroboration panel (Verified/Partial/Unverified counts) — (b),
  one component, 7 mount points across Deal Analysis tabs.
- 9 modals (reject deal, add document, add checklist request, log finding,
  add note, add interview, add entity, add vault doc, corroboration detail).
- Mandate History drawer.

### Family Office → Data Consolidation — all net-new (b), 8 sub-tabs
Overview, Entities & Ownership, Document Vault, Liquidity & Diagnostics,
Attribution Analysis, Reporting, Lab Analysis, Compliance. ~35% of the
mockup's surface, ~25 tables, entirely new backend domain (custodians,
entities, estate planning, Brinson attribution, IPS/KYC compliance). **No
overlap with the diligence product — recommend a separate epic.**

### Deal Flow
- **Deals** (a) — Fund Performance card (net-new within a revamped page: MOIC/IRR/NAV
  chart), 4 KPI tiles, mandate banner, sortable table with confidential lock.
- **New Deal** — (c), excluded entirely.
- **Initial Screening** (b) — verdict/fit %, extracted-field grid with
  per-field citation, agent highlights, risk flags, mandate-fit panel,
  must-have gate, advance/reject decision + reopen.
- **Deal Analysis** (a), 9 sub-tabs: Summary, Scorecard, Company (b),
  Market (b), Financials (a, +Financial Model & Valuation Cross-Check),
  Founders (b), Cap Table (b, +Exit Waterfall), Findings (b), Diligence
  Workspace (b, 6 panes: Overview/Data Room/Checklist/Activity/Notes/Draft
  Memo).
- **Mandate & Scorecard** (a) — 4 tabs, adds a net-new Deal Scorecard tab
  (manual per-criterion scoring) + History drawer.
- **Anti-Portfolio** (b) — tracked declines, pattern recognition, thesis
  drift.

### Intelligence → Institutional Memory — 6 sub-tabs, all (b)
Memory Search, Analyst Notes, Pattern Engine, Playbooks, Sector Intel,
Decision Log. `AskMe.tsx`/`DecisionFeed.tsx`/`InstitutionalMemory.tsx` are
confirmed thin `ComingSoonPage` stubs with zero data layer today — treat all
six as net-new builds, folding the two stubs in.

## 2. Mapping — screen → files

See full file-by-file mapping (shell, primitives, per-tab pages/components,
routing table) in the plan transcript / PR description for Phase 1+. Summary
of routing changes:

```
/                             → Deals            (was Dashboard)
/deals/:dealId/screening      → DealDetail tab=screening      NEW
/deals/:dealId/analysis/:sub? → DealDetail tab=analysis       (replaces /analysis/:dealId)
/anti-portfolio                → AntiPortfolio                 NEW
/consolidation/:tab?           → DataConsolidation              NEW
/intelligence/memory/:sub?     → InstitutionalMemory            NEW (replaces 3 routes)
/mandate-scorecard/:section    → + "scorecard" section
/new-deal/:step?               → UNCHANGED
```
Keep `/analysis/:dealId` as a permanent redirect so existing links don't break.

## 3. Phased build order

0. Decisions, tokens, fonts (no UI) — resolve open questions below, amend
   CLAUDE.md, load IBM Plex, map palette/typography into `index.css` vars,
   settle icon strategy.
1. Shell & nav restructure — nav groups change shape; blocks everything.
2. Shared primitives — KPI tile variant, radial progress ring, labeled-bar
   row, `CorroborationPanel`, `SourceInspector`, dense table convention,
   scenario toggle wrapper, inline row-form. Extract once; ~7-15 reuse sites
   each.
3. Deals screen — highest traffic, exercises 0-2 end to end, has real data
   already.
4. Deal detail shell + Initial Screening — settles citation/provenance
   pattern reused by all of phase 5.
5. Deal Analysis read-only tabs, in order: Summary → Scorecard → Company →
   Market → Financials → Founders → Cap Table → Findings.
6. Diligence Workspace — most write-heavy CRUD (5 of 9 modals); after the
   read-only tabs so patterns are settled first.
7. Mandate & Scorecard — after phase 5's Scorecard tab (they deep-link into
   each other).
8. Institutional Memory — low primitive risk, 100% backend-gated; ship
   against fixtures behind `ComingSoonPage` so frontend isn't blocked.
9. Anti-Portfolio — small, self-contained, backend-gated; same fixture
   approach.
10. Data Consolidation — last, recommend as its own epic (see §1).

Rationale: shell → shared primitives → surfaces with real data already →
surfaces that are pure backend gaps, so frontend progress never stalls
waiting on a backend prompt.

## 4. Dependency gaps

### 4a. Frontend npm packages: none required
Verified against the mockup's actual visual vocabulary (div-based bars,
CSS-grid tables, `conic-gradient` rings, one hand-computed SVG area chart —
grepped for chart primitives, 5 hits total, no radar/scatter/treemap/etc.).
`recharts`, `framer-motion`, full Radix set, `vaul` (drawer) are all already
installed and sufficient. `@tanstack/react-table` not needed — every table
is static or single-key-sorted, and `MvpDataTable.tsx`/`DataTableShell.tsx`
already exist. Fonts: use an `index.html` Google Fonts `<link>` for IBM
Plex, not a new `@fontsource/*` package.

### 4b. Frontend infra / primitives gaps
- **IBM Plex fonts are not actually loaded.** `index.html` loads Inter +
  JetBrains Mono only; `IBM Plex Sans`/`Mono` appear in `index.css` only as
  unreachable fallback names, and `IBM Plex Serif` (used for every heading
  and large numeral in the mockup) appears nowhere in the repo.
- **New design tokens needed**: full chrome/text/primary/semantic/tinted-surface
  palette (sidebar `#101A2E`, canvas `#F4F5F7`, primary `#2F5FEA`, etc.) — none
  of this exists in the current Inter/slate theme.
- **Three-font-role typography convention** (serif headings/numerals, mono
  eyebrows/labels/numbers, sans body) needs codifying once, or it gets
  hand-applied inconsistently across ~30 files.
- **Missing primitives**: radial progress ring (none exists — `progress.tsx`
  is linear only), labeled-bar row, dual-bar comparison row,
  `CorroborationPanel`, two-mode Source Inspector, field/value spec table,
  inline row-form, collapsible sidebar group with count badges + nested
  sub-nav. Existing-but-needs-extension: `tiles/StatTile.tsx`, `MetricVerificationChip.tsx`,
  `ProvenanceBadge.tsx`, `CitationSidebar.tsx`, `common/StatusChip.tsx`,
  `toggle-group.tsx`, `common/EmptyState.tsx`.
- **Icon set — largest hidden cost.** ~40 bespoke inline SVGs in the mockup
  with no close `lucide-react` equivalents (hexagon logo, network glyph,
  mandate diamond glyph, etc.). Recommend a hybrid: extract the ~10
  identity-critical glyphs into `src/components/mvp/icons/`, use lucide for
  the rest. Decide in Phase 0, not discovered mid-build.
- Dense tables should stay real `<table>` markup (accessibility), not
  replicate the mockup's `grid-template-columns` rows — that's a mockup-tool
  artifact, not a design requirement.
- Mockup data is display-string-shaped (`"$85M"`, `"+12%"`) — convert at the
  render boundary through `dealMetricsFormat.ts`; never let pre-formatted
  strings leak into the data/type layer.
- eslint's Carbon swap boundary applies unchanged: import shadcn primitives
  and `sonner` via `@/components/mvp/primitives` only.

### 4c. Backend / data gaps (flagged only — no backend contracts designed here)

**Correction (post-verification):** the paragraph below the architect
agent originally wrote assumed Deal Analysis's tab content was already
backed by an existing `ICMemoDeliverable` shape in Alpha. That was wrong —
verified 2026-08-12 by reading Alpha's actual code (`app/api/deals.py`,
`app/schemas/deals.py`, `app/jobs/tasks/start_deal_analysis.py`), not the
frontend's assumptions about it. Alpha today only has: deal CRUD, pipeline
listing, dashboard stats (several fields hardcoded null/0, "no scoring
writer until the real pipeline"), a document parse/verify pipeline that
stops at extraction (no synthesis), a single opaque `mandate`/`weights` JSON
blob for investment profile, basic presign/complete uploads, admin/auth,
and a basic per-action activity log. **There is no memo-generation or
analysis-synthesis engine in Alpha at all** — nothing produces company
overview, market/competitive analysis, financials, founders detail, cap
table, or scoring content. The `memo_json` field in
`DealWithLatestMemoResponse` exists in the schema but nothing writes to it.

**Decision:** this is an accepted, known gap, not something currently
sourced from anywhere else. Per direction, we do **not** write a backend
prompt for it now. The frontend builds all Deal Analysis tab-content UI
(Company, Market, Financials, Founders, Cap Table, Scorecard, Screening,
Corroboration) against fixtures/empty states, same fixture-then-wire
approach as Institutional Memory/Anti-Portfolio, and this gap gets called
out again explicitly in the `docs/implementations/` writeup once this
redesign ships — it's deferred to a future effort once the
memo-synthesis/analysis-content engine gets scoped, not silently dropped.

**Backend prompts already sent** (2026-08-12, six independent clusters that
don't depend on the missing engine — see `tmp/backend-prompts.md`,
gitignored, for the full text of each): the `isPlatformAdmin` flag on
`GET /auth/me`; the Fund Performance card (realized portfolio MOIC/IRR/NAV —
dashboard stats today only cover pipeline, not realized performance); the
confidential deal flag, framed as an authorization design question rather
than a display column; Anti-Portfolio (tracked declines, pattern
aggregation, mandate-drift calc — also flags that mandate history/versioning
doesn't exist yet if drift-vs-current-mandate is wanted); all 6
Institutional Memory sub-tabs, explicitly shipping hidden-except-platform-
admins, with Memory Search flagged as needing real retrieval-architecture
scoping rather than an assumed reuse of anything existing; and the
Diligence Workspace's data room (per-document review status) + checklist,
extending the existing but much thinner uploads model.

**Still not prompted, deliberately held:** all Deal Analysis tab content
(per the decision above), Data Consolidation — entirely new domain, by
far the largest backend ask, recommended as a separate epic with its own
backend prompt later (§1, §5 Q4) — and, discovered while building Phase 7,
the Mandate & Scorecard's new "Deal Scorecard" tab: manual per-criterion
1-5 scoring input with no persistence endpoint, and mandate version
history (the History drawer) with no versioning on `investmentProfile`
today. Built as visible-but-disabled UI (same pattern as Findings/Diligence
Workspace's write-gated panes) rather than fake local-only state.

## 5. Open questions (need a decision before the affected phase)

1. **Which nav layout is right?** Some of the reference screenshots
   (`captable.png`, `01-aiscore.png`) show an older sidebar with a
   "currently active deal" section — shortcuts to that deal's
   Screening/Analysis/Workspace. The actual HTML file doesn't have that
   section. Go with what's in the HTML (no shortcuts), or bring that
   "active deal" shortcut section back?
   **Decision: HTML as-is** — no contextual active-deal shortcut section.
2. **What happens if you click "Initial Screening" or "Deal Analysis" with
   no deal open?** In the mockup, clicking those does nothing if no deal is
   selected — a silent dead click. Recommend jumping to the most recent deal
   instead, or showing a friendly empty screen, rather than copying the
   silent no-op.
   **Decision: disable the nav item** with a tooltip reading "Create a deal
   first" whenever no deal context exists.
3. **Where does "New Deal" send you afterward?** In the mockup, finishing
   the New Deal form takes you straight to that deal's Initial Screening
   page. This only touches where it *redirects to* after finishing — not the
   form itself, which stays frozen. OK to make that one small change?
   **Decision: keep the existing immediate redirect** to the deal's
   processing/status page (today: `navigate(\`/analysis/${dealId}\`)` in
   `NewDealWizard.tsx:308`, which renders `AnalysisProgressView`/
   `AgentStatusStepList` while backend analysis runs — this part is
   unchanged). What changes is what happens **once processing completes**:
   instead of auto-revealing the Deal Analysis tabs in place, show an
   enabled button on the status page; clicking it navigates to that deal's
   Initial Screening page (`/deals/:dealId/screening`). This becomes part of
   Phase 4 (Deal detail shell + Initial Screening) — the status page itself
   isn't part of the frozen New Deal form/wizard steps, so this is a small
   in-scope tweak, not a wizard change.
4. **Should "Data Consolidation" be its own separate project?** This is the
   family-office net-worth/entities/compliance section — roughly a third of
   the whole design, and none of it exists today (frontend or backend).
   Unrelated to the deal-review side of the app. Recommend treating it as a
   separate effort rather than bundling it into this redesign.
5. **Two old tabs don't fit anywhere anymore** — "Risks" and "Parser
   Verification" on the current deal analysis page. The new design folds
   risk info into other tabs and drops parser verification entirely. Delete
   these, leave them accessible but unlinked, or merge their content
   elsewhere?
6. **Some current pages aren't in the new design at all**: Memo History,
   the memo viewer pages, Verify, Methodology, Product Usage. Keep them
   around (just not linked from the new menu), merge into a page that does
   exist, or remove entirely?
7. **Should the admin-only menu section stay?** Admins currently see extra
   menu items (Methodology, Product Usage) not part of the new design. Keep
   them tacked on, or should admin stuff live only in the separate admin
   portal instead?
8. **Is this a rebrand, too?** The new design's logo area says "Simpero —
   Family Office OS," different framing from how this product is described
   today (an AI due-diligence / IC-memo tool for deals). Intentional new
   positioning, or placeholder text in the mockup to ignore?
9. **Are "Memory Search" and "Decision Log" replacements for existing
   features, or brand new ones?** There's already an AI chat feature and an
   activity/audit log elsewhere in the app that look similar but aren't
   quite the same thing. Should Memory Search reuse/build on the existing
   chat feature, and is Decision Log meant to replace the existing
   "Decision Feed" page under a new name?
   **Decision: ship hidden-except-platform-admins.** Every section in this
   redesign with zero decided backend contract today — all 6 Institutional
   Memory sub-tabs (Memory Search, Analyst Notes, Pattern Engine, Playbooks,
   Sector Intel, Decision Log) **and** Anti-Portfolio — gets built as real
   UI (against fixtures, per the existing Phase 8/9 plan) but hidden from
   normal users, visible only to platform admins (internal Simpero staff),
   until each feature's scope and backend contract are actually decided.
   This intentionally punts the `ai.chat`/`DecisionFeed.tsx` reuse question
   — evaluate it once each feature's contract is decided, not now.
   **Mechanism:** the backend adds one boolean field (e.g.
   `isPlatformAdmin`) to the product `GET /auth/me` response, computed
   server-side from `clerk_admin_users` — the frontend just reads a flag to
   decide nav/route visibility. This is additive to the auth response the
   product app already calls; it does **not** import admin code, bridge
   admin auth, or give the product app any other access to admin data, so
   it doesn't violate the product/admin separation rule. This becomes one
   line item in the backend-gap prompts for the `Simpero_AI_Gov_Alpha`
   session. Frontend-side, gate at the nav-model layer (`buildMvpNav`) and
   with a route guard on the corresponding pages, mirroring how
   `role === "admin"` already gates the existing Admin nav divider.
10. **Should tables look and behave like real tables?** The mockup builds
    its tables in an unusual way (styled boxes, not actual HTML tables),
    which is worse for accessibility (screen readers, keyboard navigation).
    Recommend building them as real tables with the same look. OK with that?
    **Decision: yes** — real `<table>`/`<thead>`/`<tbody>` markup, styled to
    match the mockup's visual look exactly, across all ~25 tables.

All 10 questions above are now resolved.

**Icon strategy (§4b) — decided: hybrid.** Extract only the ~10
identity-critical glyphs (the Simpero hexagon logo mark, and the icons for
the 3 top-level nav groups — Family Office, Deal Flow, Intelligence — plus a
few other high-visibility ones) as custom SVGs into
`src/components/mvp/icons/`. Use `lucide-react`'s closest available icon
for the remaining ~30 (table row icons, small inline glyphs, etc.), even
where it's not a pixel-perfect match against the mockup.

## 6. Recommended immediate next step

All Phase-0 decisions are now resolved (10 open questions + icon strategy).
Phase 1 (shell & nav restructure) and Phase 2 (shared primitives) can be
specced for an implementer without further architectural judgment calls.
