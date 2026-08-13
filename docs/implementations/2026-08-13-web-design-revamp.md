# Web Design Revamp — Implementation Summary (2026-08-12 → 2026-08-13)

Session record of implementing Phases 0–9 of the frontend visual/IA redesign
end-to-end, orchestrated as architect (planning) → a sequence of
implementer/tester subagent tasks per phase, each reviewed against the real
codebase before moving to the next. Written as a memory artifact — read this
before picking related work back up.

**Architecture source of truth:** `docs/plans/2026-08-12-web-design-revamp.md`.
That doc was kept up to date throughout — every open question got a recorded
decision, and every backend-gap correction found during implementation was
folded back into its §4c — so it should still be accurate as of this
writing. This doc records what actually got built against it, including
several places reality differed from the plan's original file-mapping
guesses.

**Nothing in this session is committed.** All 105 changed files (34
modified, 9 deleted, 62 new) are sitting uncommitted in the working tree.

**Not a cross-repo feature (yet).** Unlike the Admin Portal, no backend code
was touched — CLAUDE.md's "backend changes belong in the backend repo's own
session" rule was followed throughout. Six backend-prompt clusters were
drafted and handed to the user for a separate `Simpero_AI_Gov_Alpha` session
(see `tmp/backend-prompts.md`, gitignored — not part of this repo's history,
summarized in §4 below so the ask isn't lost). None of those prompts are
confirmed implemented as of this writing; every "backend-gated" feature
below was built defensively against that.

---

## 1. What was built (Phases 0–9 of the plan)

**Phase 0 — tokens, fonts, icons.** `index.html` gained IBM Plex Sans/Mono/Serif
via Google Fonts `<link>` (no new npm package, per the plan's explicit
ruling). `src/index.css` gained a new `--rev-*` token namespace (canvas,
surface, borders, a 7-step text scale, primary/accent, semantic
success/warn/danger, tinted surfaces, the mandate-banner gradient) — kept
separate from the pre-existing generic tokens (`--surface`, `--text-primary`,
etc.) since those still govern every not-yet-redesigned page and the frozen
New Deal wizard. `src/components/mvp/icons/index.tsx` (new) holds 4
hand-extracted glyphs (Simpero hexagon logo, and the sole/primary icon for
each of the 3 top-level nav groups) — the other ~36 of the mockup's bespoke
icons were never needed; `lucide-react` covered everything else. `CLAUDE.md`
gained the redesign-exception note (see below).

**Phase 1 — shell & nav restructure.** `src/components/mvp/nav/mvpNav.ts`
rewritten: `MvpNavLeaf` gained `count`/`disabled`/`disabledReason`, new
`MvpNavSubNav`/`MvpNavSubNavItem` kinds for a nested, expandable sub-nav,
`MvpNavDivider` gained `collapsible`. `buildMvpNav` now returns Family
Office (1 disabled placeholder) / Deal Flow (collapsible, 6 leaves) /
Intelligence (1 subnav → Institutional Memory's 6 items, all disabled
placeholders at this point) / Admin (unchanged). All `src/components/mvp/shell/**`
components restyled to the mockup's dark sidebar + new topbar. `MvpFundSelector.tsx`
became an intentional no-op (`return null`) rather than being deleted —
it was never a real selector, and 9+ pages (including the frozen
`NewDealWizard.tsx`) still render it; neutering avoided touching any of them.

**Phase 2 — shared primitives.** 11 new components, all additive (no
existing file modified): `KpiTile` (sibling to the older `StatTile`, not an
extension — different shape, `StatTile` still serves not-yet-redesigned
pages), `RadialProgress`, `LabeledBarRow`/`DualBarRow`, `CorroborationPanel`,
`SourceInspector` (new sibling to `CitationSidebar`, not an in-place
extension — that component is tightly coupled to the current memo viewer),
`DenseTable`/`DenseTableRow`/etc. (the real-`<table>` convention, per the
plan's decided answer to keeping accessibility over the mockup's CSS-grid
row markup), `FieldValueList`, `ScenarioToggle`, `InlineRowForm`,
`VerificationPill`. 18 accompanying tests.

**Phase 3 — Deals page.** `src/pages/Dashboard.tsx` → `src/pages/Deals.tsx`
(rename + rewrite), `src/App.tsx` repointed at `/`. New
`src/components/mvp/deals/{FundPerformanceCard,DealsTable,MandateBanner,AiScoreTile}.tsx`.
`FundPerformanceCard` ships behind an honest empty state — no realized
portfolio MOIC/IRR/NAV data exists in the API. `DealsTable` (built on
`DenseTable`) reads real `LivePipelineRow` data; a `confidential` field
doesn't exist on the backend yet, so it's read via a local additive overlay
type rather than editing the frozen `src/shared/` contract early.
`src/components/mvp/dashboard/` (old `LivePipelineTable`/`AgentStatusCell`)
retired — confirmed `Dashboard.tsx` was their only consumer.

**Phase 4 — Deal detail shell + Initial Screening.** `src/pages/DealAnalysis.tsx`
(1902 lines) → `src/pages/DealDetail.tsx`: owns a top-level Screening/Analysis
tab switch; the existing job-status polling (queued/processing/error/no_job)
kept byte-for-byte identical. **Deliberate behavior change** (plan §5 Q3):
on the processing→complete transition, instead of auto-revealing the
analysis tabs, a one-time `CompletionInterstitial` shows a "View Initial
Screening" button; revisiting an already-complete deal later shows the tab
shell directly. New routes `/deals/:dealId/screening`,
`/deals/:dealId/analysis/:sub?`; `/analysis/:dealId` is now a permanent
redirect (load-bearing — the frozen `NewDealWizard.tsx` still navigates
there on success). New `src/pages/ScreeningRedirect.tsx` (mirrors
`AnalysisRedirect.tsx`, shares a new `pickMostRecentCompleteDeal` helper in
`src/api/deals.ts`). New `src/pages/dealDetail/ScreeningTab.tsx` +
`src/components/mvp/screening/*` — only `MaterialsCard` has real data (the
deal's one known filename); everything else (verdict, extracted fields,
mandate fit, decision) is empty-stated, since none of it has a backend yet.
**Real bug caught and fixed during review**: `DealDetailInner` wasn't keyed
by `dealId`, so navigating directly between two different deals' detail
pages (no intervening unmount) could leak stale completion-interstitial
state from one deal into another. Fixed with `key={dealId}`; the tester
verified the regression test is load-bearing by temporarily removing the
fix and confirming the test failed.

**Phase 5 — Deal Analysis's 8 read-only tabs**, built in the plan's stated
order (Summary establishes the pattern every later tab reuses):
- **Summary** — rewritten; absorbed `RisksTab.tsx`'s governance-flags content
  into a new Risk Assessment table. **`RisksTab.tsx` and `ParserVerificationTab.tsx`
  deleted entirely** (plan §5 Q5, decided). IC Sign-off rendered as a
  real-looking but `disabled` control with an explanatory note (no backend
  persistence) — this "visible, disabled, explained" pattern became the
  template every later backend-gated write action followed.
- **Scorecard** — restyled only; the real `trpc.memo.rescore` mutation and
  `DealScorecardPanel`/compliance-summary logic untouched. Added an
  "Edit scores" link, initially pointing at a placeholder, repointed in
  Phase 7 once the real destination existed.
- **Company** (new) — real: `companyOverview` (founded/HQ/employees,
  products, revenue mix). Empty-stated: Co-Investors, Key Customers,
  Funding History, Geographic Presence beyond HQ, Tech & Ops (confirmed,
  not assumed, against the full `ICMemoDeliverable` type). "IP & Compliance"
  repurposes the real `ofac_screening` field, explicitly labeled as
  sanctions-only, not patent/licensing data.
- **Market** (new) — real: `marketCompetitive` (TAM/SAM/SOM/CAGR,
  competitors, competitive advantage). The mockup's Advantage/Partial/
  Disadvantage Competitive Positioning Matrix was **not** built — the real
  data (`competitors[].weakness`, a free-text string) can't honestly support
  that structured per-dimension shape without inventing dimensions.
- **Financials** — restyled the real headline-metrics/financial-grid/unit-
  economics sections; added a Financial Model card backed by real
  `exitStrategy.scenarios` (scenario labels rendered as-found, not forced
  into Downside/Base/Upside naming the data doesn't have); Valuation
  Cross-Check (DCF/precedents/comps) confirmed 100% unbacked per plan §4c,
  built as an honest empty state.
- **Founders** (new) — real: `managementTeam` (bio, one pull-quote per
  founder from `keyAchievement` — deliberately not duplicated into a
  fabricated "Track Record" list). Compare toggle (≥2 founders) shows a
  real, minimal field-by-field comparison. Kept the old inline tab's real
  `board` data rather than dropping it (not explicitly in scope, flagged as
  a judgment call). Background Checks/Employment History built as real,
  typed, currently-empty component shapes ready to wire once backend exists.
- **Cap Table** (new) — real: `investmentStructure` (deal terms) +
  `capTable` (flat holder/shares/%/investment). Share Class and Pro Forma
  columns omitted (no backing field). **Exit Waterfall deliberately not
  computed** — a `capTable.ownershipPct × exitStrategy.scenarios.exitValueUsd`
  pro-rata derivation was considered and rejected in a code comment: it
  ignores liquidation-preference seniority and could misrepresent real
  payout order for any cap table with preferred stock.
- **Findings** (new, last tab) — fully unbacked findings register; "Log a
  finding" disabled with explanation, same pattern as Summary's IC Sign-off.
  Also removed a stale, previously-unnoticed standalone `"valuation"`
  placeholder tab that would otherwise have produced a 9th tab contradicting
  the plan's stated 8.

Two real drift bugs were caught mid-phase and fixed: a stale, out-of-sync
duplicate `ANALYSIS_TABS` array hardcoded inside `DealDetail.tsx` itself
(separate from the real one in `dealAnalysisUtils.ts`), and `"market"` being
positioned wrong in that tab-order list.

**Phase 6 — Diligence Workspace** (the 9th, last Deal Analysis sub-tab).
New `src/pages/dealAnalysis/WorkspaceTab.tsx` (a local-state 6-pill pane
switcher, not URL-driven) + `src/pages/dealAnalysis/workspace/*`:
`OverviewPane` (real: diligence-progress ring + workstream bars from
`dueDiligenceSummary.categories`, a possibly-partial array over a fixed
6-category universe — "not started" is the real complement; Risk Profile
from `riskRegister` severities); `ActivityPane` (real, but scoped — filters
the existing org-wide `fetchRecentActivity` feed client-side by
`sessionId === this deal's session`, since the raw feed isn't deal-scoped
and rendering it unfiltered would show unrelated deals' activity);
`DraftMemoPane` (real: `icRecommendation.prose` for Recommendation,
condensed `investmentThesisCards`/`riskRegister` for Merits/Risks — `prose`
alone, deliberately not `highlightBullets`, which is already reused twice
elsewhere and would read confusingly reused a third time); `DataRoomPane`,
`ChecklistPane`, `NotesTranscriptsPane` (all backend-gated, "visible,
disabled, explained"). One background-agent task in this phase was
interrupted by a session restart mid-flight — its work survived on disk
(files already written, wiring already done), confirmed via `git status`
and a clean `pnpm check`, then resumed to finish the remaining lint cleanup
rather than restarted from scratch.

**Phase 7 — Mandate & Scorecard.** `src/pages/MandateScorecard.tsx`
restyled: left-nav → top tabs, **the always-mounted (CSS `display:none`,
not conditional render) mechanism for the 3 original sections and the
save-all button preserved exactly** — this was real, working, tRPC-backed
functionality and needed to survive the restyle untouched. New 4th "Deal
Scorecard" tab (`src/components/mvp/mandate/DealScorecardTab.tsx`): real
criteria from the live scoring framework, a real deal picker, but manual
per-criterion 1-5 score inputs are disabled — **no persistence endpoint
exists for manual scores, discovered during this phase, not previously
flagged** (now recorded in the plan's §4c). New `MandateHistoryDrawer.tsx`
— mandate version history also doesn't exist, same honest-empty pattern.
New Mandate topbar variant (save-status indicator + History button) — the
3 real mandate-block components (`FirmProfileBlock`/`EditableMandateBlock`/
`EditableFrameworkBlock`) each gained an `onStateChange` prop for real
dirty-tracking, feeding that indicator; internals of those 3 components were
deliberately left unrestyled (real validation logic, checked first whether
touching them was necessary — it wasn't). **Real bug caught and fixed**:
`MvpAppShell` only renders children matching its 3 named slots
(`Sidebar`/`Topbar`/`Main`) — a reset-confirmation modal had been nested as
a plain child, which the shell was silently dropping. Moved it (and the new
history drawer) to siblings after `</MvpAppShell>`, matching `DealDetail.tsx`'s
existing pattern.

**Phase 8 — Institutional Memory.** Per plan §5 Q9's decision, all 6
sub-tabs ship as real UI, **hidden from normal users, visible only to
platform admins**. `AuthUser` (`useAuth.ts`) gained `is_platform_admin?: boolean`
(optional — the backend prompt for this may not be deployed yet).
`MvpUser`/`buildMvpNav` gained a distinct `isPlatformAdmin` flag (**not**
the same as the existing `role === "admin"` product-admin concept). First
pass wired this as dynamic disable/enable (items always rendered, just
toggling `disabled`/`href`), which a screenshot from live testing caught as
wrong — a disabled-but-visible item still tells a non-platform-admin the
feature exists, contradicting "hidden from normal users." Corrected same-day:
the Institutional Memory subnav (and, since it was the "Intelligence"
divider's only content, the whole divider) is now omitted from the nav tree
entirely for non-platform-admins, matching how the Admin divider was already
conditionally pushed. At the same time, **Methodology/Product Usage were
changed to also require `isPlatformAdmin`** (previously gated on
`role === "admin"` alone, pre-dating this redesign) — per explicit
direction, since they're internal Simpero tooling a client firm's own
org-admin shouldn't see just by being an org-admin; the Admin divider now
needs `role === "admin" && isPlatformAdmin` together. 12 of 13
non-frozen `buildMvpNav` call sites updated to pass it through (the 13th,
`NewDealWizard.tsx`, is frozen and left untouched — an accepted, minor
inconsistency: a platform admin won't see Institutional Memory unlocked
specifically while inside the wizard). New `src/pages/intelligence/InstitutionalMemory.tsx`
(rewritten as a route-guarded pill-tab host at `/intelligence/memory/:sub?`
— non-platform-admins see the existing `ComingSoonPage`, reused as-is).
`AskMe.tsx`/`DecisionFeed.tsx` deleted, folded into the new Memory Search /
Decision Log panes; their old routes now permanently redirect. All 6 panes
(`src/pages/intelligence/memory/*`) are 100% empty-state/disabled — nothing
here has any backend today, confirmed against the real types, not assumed.

**Phase 9 — Anti-Portfolio** (last phase in scope). Same platform-admin
gating pattern as Phase 8 (and same same-day hide-entirely correction —
the Anti-Portfolio leaf is now omitted from Deal Flow's children for
non-platform-admins rather than shown disabled). New
`src/pages/AntiPortfolio.tsx` (route-guarded like Institutional Memory, no
internal pill-switcher — one page) + `src/components/mvp/antiPortfolio/{DeclineCard,PatternRecognitionCard,ThesisDriftCard}.tsx`.
4 KPI tiles all honest zero/dash states; category tabs + a sector chip are
real filter logic operating over a genuinely empty `DECLINES: DeclineRecord[] = []`
array (not fake — the filtering code runs, there's just nothing to filter
yet). `ThesisDriftCard`'s copy explicitly notes the compounding gap: no
decline data *and* no mandate version history (the Phase 7 finding) to
compute real drift.

**Phase 10 (Data Consolidation) was explicitly cut** per the plan's §5 Q4
decision — nothing built for it. Recommended as a separate future epic.

---

## 2. Test coverage

351 tests across 88 files (up from 293 at the start of this session, all
pre-existing tests still passing). Coverage was added in a dedicated pass
after each phase (or batch of phases) rather than file-by-file during
implementation, following the pattern: implementer builds, orchestrator
reviews the diff, tester adds regression coverage, orchestrator verifies
`pnpm check`/`pnpm lint` independently before moving on. `pnpm check`
(tsc --noEmit + full vitest run) and `pnpm lint` (`eslint src --max-warnings=0`)
are both clean as of this writing.

One pre-existing, unrelated flaky test was observed once
(`src/admin/__tests__/OrgDetail.test.tsx`, a 5000ms timeout) — confirmed via
`git log`/`git status` to predate this session and be untouched by it; it
passed cleanly on a later run. Not this session's concern.

---

## 3. Amendments / judgment calls made during implementation

Several places where an implementer resolved an underspecified or
incorrect part of the plan, each already folded into the summary above but
worth a consolidated list for anyone auditing later:

1. `MvpFundSelector.tsx` neutered to a no-op rather than deleted (§1 Phase 1).
2. `SourceInspector` built as a new component, not an in-place `CitationSidebar`
   extension (§1 Phase 2).
3. Competitive Positioning Matrix (Market tab) and Exit Waterfall (Cap Table
   tab) deliberately **not** built as computed/derived views — both would
   have required inventing structure the real data doesn't have.
4. `FoundersTab`'s Board Members section kept (real data the old inline tab
   had) rather than dropped for not being explicitly in the new tab's scope.
5. Two real app-code bugs found and fixed mid-review, not just flagged:
   the `DealDetailInner` stale-completion-state bug (Phase 4, `key={dealId}`
   fix, regression-tested) and the `MvpAppShell` slot-only-rendering bug
   (Phase 7, modal/drawer moved outside the shell).
6. Two real drift bugs found and fixed: a stale duplicate `ANALYSIS_TABS`
   array (Phase 5, Cap Table task) and a leftover 9th `"valuation"` tab
   (Phase 5, Findings task) that would have contradicted the plan's stated
   8-tab total.
7. The Mandate Scorecard manual-persistence + mandate-version-history gap
   (Phase 7) was discovered during implementation, not anticipated by the
   original plan — added to the plan's §4c as it was found.
8. **Post-ship correction, caught via a live-testing screenshot**: Phase
   8/9's platform-admin gating initially rendered Institutional Memory and
   Anti-Portfolio as visible-but-disabled, not hidden — contradicting the
   "hidden from normal users" framing. Fixed to omit them (and the
   Intelligence divider, and — per explicit direction — the Admin divider,
   now additionally requiring `isPlatformAdmin`) from the nav tree entirely
   for non-platform-admins. See `mvpNav.ts`/`mvpNav.test.ts`.

---

## 4. Backend gaps (frontend built defensively against all of these)

Six backend-prompt clusters were drafted for a separate `Simpero_AI_Gov_Alpha`
session (full text in `tmp/backend-prompts.md`, gitignored, not part of this
repo's history — summarized here so the ask survives):

1. **`isPlatformAdmin` flag** on `GET /auth/me`, sourced from `clerk_admin_users`.
2. **Fund Performance card** — realized portfolio MOIC/IRR/NAV, a new data
   domain (no "closed investment" concept exists in the deals model today).
3. **Confidential deal flag** — framed as an authorization design question,
   not just a display column (needs real query-level enforcement).
4. **Anti-Portfolio** — tracked declines, pattern aggregation, mandate-drift
   calc (which itself needs mandate version history — see #7 below).
5. **Institutional Memory** — all 6 sub-tabs' data (notes, patterns,
   playbooks, sector rollups, decision log, and retrieval infra for Memory
   Search — flagged as needing real scoping, not an assumed `ai.chat` reuse).
6. **Diligence Workspace** — data room per-document review status + a
   checklist model, extending the existing but much thinner uploads model.

**Not yet turned into a formal prompt** (discovered after the 6 above were
sent, during Phase 7): Mandate & Scorecard's manual per-criterion Deal
Scorecard persistence, and mandate version history for the History drawer.

**Deliberately never prompted at all**: all Deal Analysis tab content
(Company/Market/Financials/Founders/Cap Table detail beyond what's already
listed as "real" above) — Alpha has no memo-generation/analysis-synthesis
engine at all yet (confirmed by reading its actual code, not assumed); this
is an accepted, deferred gap per explicit direction, not an oversight. And
Data Consolidation — entirely new domain, recommended as a separate epic.

---

## 5. What's NOT done / stale docs

- **Phase 10 (Data Consolidation)** — not started, not scoped further than
  the plan doc's §1 screen inventory. ~35% of the source mockup's surface.
- **No backend prompt sent yet** for the Mandate Scorecard gap found in
  Phase 7 (§4 above).
- **This session is entirely uncommitted.** Nothing has been pushed,
  nothing has a commit message yet.
- `docs/plans/2026-08-12-web-design-revamp.md` was kept current throughout
  (every decision recorded, §4c corrected as gaps were found) — it should
  **not** be stale relative to this doc, unlike the Admin Portal plan/impl
  pair. If a future session finds them disagreeing anyway, trust this doc.
