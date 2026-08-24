# Deal Analysis page — mockup alignment plan

**Status:** plan, nothing implemented yet.
**Trigger:** side-by-side comparison of `app-staging.simpero.com/deals/{id}/analysis`
against the `Meridian Diligence.dc.html` prototype (Project Beacon / Lumen
Health Systems fixture).

## 0. Important framing correction

The two screenshots being compared are **not the same sub-tab**:

- The staging screenshot is the **Summary** sub-tab, on a near-empty test
  deal ("Dccff" — no memo generated yet, hence all the `N/A`/`—`).
- The mockup screenshot is the **Diligence Workspace → Overview** sub-tab,
  on a fully-seeded fixture deal.

So this isn't "the whole page looks wrong" — most of Deal Analysis was
already redesigned and audited against this exact mockup on 2026-08-13
(`docs/implementations/2026-08-13-web-design-revamp.md` §6), including
`WorkspaceTab`/`OverviewPane` (diligence-progress ring, risk profile,
workstream progress) confirmed already matching. The real, verified gap is
narrower than the screenshots suggest: **one missing header component** and
**a handful of already-known, already-partially-prompted backend gaps**.
Below is what's actually left. (Interviews & Questions is out of scope for
this pass — see note at the end of §1.)

## 1. Gap inventory

| # | Gap | Mockup | Current | Backend status |
|---|-----|--------|---------|-----------------|
| 1 | **Body-level "hero" header card** — a second, separate element from the existing header, per the mockup's actual markup (see §2's correction) | Big white card below the breadcrumb strip: 56px avatar/initials, serif company name, deal-size/lead/opened/referred-by stat row, risk badge, 76px diligence-progress donut | **Does not exist.** `DealHeaderCard.tsx` only covers the mockup's thinner *topbar-strip* variant (name, stage pill, deal size, "Lead · —"), and stays as-is — the hero card is additive, a new sibling component, not a mode of `DealHeaderCard`. Its own comment already flagged the richer fields as left out for lack of backing data | Partially backed today (see §2) |
| 2 | **Tab/pane count badges** | `Findings 3`, `Data Room 5`, `Checklist 9` | `ANALYSIS_TABS` / `WORKSPACE_PANES` render plain labels, no counts | N/A — counts would be 0 for every one of these today, since findings/checklist have no backend record to count |
| 3 | Data Room: per-document category + review status (pending/reviewed/flagged) | Yes | `DataRoomPane.tsx` shows the deal's one tracked source file, no category/status | **Already prompted** (Prompt 6, 2026-08-12) — confirmed **not yet implemented**: `app/schemas/uploads.py` still has only `Presign`/`Complete` request/response, no category or status field |
| 4 | Diligence checklist (request/assignee/status) | Yes | `ChecklistPane.tsx` — real disabled "Add request" UI, explicit empty state | **Already prompted** (Prompt 6) — confirmed **not yet implemented**, no checklist model anywhere in Alpha |
| 5 | Confidential deal flag (lock badge) | Yes, on both header variants | `DealHeaderCard` accepts `confidential?: boolean`, defaults to `false`/hidden — no field to source it from | **Already prompted** (Prompt 3, framed as an authorization question) — confirmed **not yet implemented**, no `confidential` column on `deals` |
| 6 | Findings register (category/severity/status, resolve action) | Yes | `FindingsTab.tsx` — real disabled "Log a finding" UI, explicit empty state | **Deliberately never prompted** — tied to the larger "Alpha has no memo-synthesis engine yet" gap, an accepted deferred scope per prior direction |
| 7 | Analyst Notes / Agent-Drafted Questions (Notes & Transcripts) | Yes | `NotesTranscriptsPane.tsx` — real disabled UI, explicit empty state | Not backed, not prompted for this (Diligence Workspace) context — do not confuse with Prompt 5's "Analyst Notes," which is a *different*, platform-admin-only Institutional Memory feature with different fields (outcome/lesson-learned vs. call notes) |
| 8 | "Opened" date in header | Yes (`active.created`) | Not rendered anywhere on Deal Analysis | **Already backed, just unused** — `DealRowResponse.created_at` → frontend `Deal.createdAt` exists today, nothing needs to change on the backend |
| 9 | "Lead" / owner name in header | Yes (`active.lead`) | Hardcoded `"Lead · —"` | **Not backed** — no owner/lead field on `deals` at all (`deals.user_id` exists as creator metadata only, explicitly not meant for display per its own model comment) |
| 10 | "Referred by" in header | Yes (`active.referredByLabel`) | Not rendered | **Not backed** — no such column |

Out of scope for this pass, per direction: the mockup's separate
"Interviews & Questions" top-level tab (its content already exists, folded
into Diligence Workspace → Notes & Transcripts as an "Interview Log"
section — not being promoted or re-backed here).

## 2. What #1 (hero header card) actually needs

Good news: most of its fields are cheaper than they look.

- **Avatar/initials, name, sector, deal size** — trivial, same data
  `DealHeaderCard` already has.
- **Diligence progress ring + risk badge** — **no new backend work**. The
  exact math already exists client-side in `OverviewPane.tsx`
  (`progressPct` from `dueDiligenceSummary.categories`, `overallRiskLevel`/
  `overallRiskColor` from `riskRegister`). Extract those two calcs into a
  shared helper (e.g. `dealAnalysisUtils.ts`) so the new header component and
  `OverviewPane` both call it instead of duplicating the logic.
- **"Opened"** — no new backend work, wire `deal.createdAt` (already on the
  wire, just unused).
- **"Lead" / "Referred by"** — genuinely unbacked, needs #9/#10 above from
  a new backend prompt (§3). **Decision (confirmed with Vansh 2026-08-23):
  wait for these backend fields before building the hero card at all** —
  do not ship it with placeholder dashes in the meantime. See §4.
- **Confidential lock badge** — reuse the existing `confidential` prop once
  Prompt 3 lands; until then, keep it hidden (current default).

**Frontend shape — corrected 2026-08-23.** The original plan here ("extend
`DealHeaderCard` with an optional richer mode") was based on a wrong
premise: reading the mockup's actual markup (not just the screenshot) shows
it has **two separate header elements that always render together**, not
one element with two modes —
- a thin strip (`‹ All deals | name | stage badge | confidential toggle` …
  `size / Lead · lead`) that lives in the mockup's **persistent app
  topbar** (a `<header>` rendered on every screen), and
- a separate, second **hero card** in the page body below it (avatar,
  stat row, risk badge, progress ring) — some fields (deal size, lead)
  are genuinely shown in both.

Two decisions confirmed with Vansh once this was surfaced:
1. **Match the mockup's actual two-element structure** — do not merge into
   one component. Build the hero card as a **new, separate component**,
   composed alongside the existing `DealHeaderCard`, not a mode of it.
2. **Leave `DealHeaderCard` where it is today (the page body)** — do not
   move its content into the real persistent topbar (`MvpTopbar`) to
   literally match the mockup's topbar placement. `MvpTopbar` is shared
   shell chrome used across the whole product; restructuring it is a
   bigger, separate change and out of scope here.

So the net shape: `DealHeaderCard` (body, unchanged) + new hero-card
component (body, new) rendered directly below it. The new component takes
`memoTyped` so it can call the shared progress/risk helper (below) —
mirrors how `AnalysisTabs` already threads `memoTyped` into every sub-tab.

**Shared calc (confirmed with Vansh 2026-08-23):** extract
`progressPct`/`overallRiskLevel`/`overallRiskColor` out of
`OverviewPane.tsx` into a shared helper (e.g. `dealAnalysisUtils.ts`), have
both `OverviewPane` and the new hero-card mode call it — do not duplicate
the calc in the header.

## 3. New backend ask (not covered by the six 2026-08-12 prompts)

Two decisions confirmed with Vansh on 2026-08-23, checked against the
mockup's actual New Deal form markup (not guessed):

- **"Lead" is a structured reference to an internal user**, not free text —
  the mockup's New Deal form (`Meridian Diligence.dc.html` line 4866) renders
  it as a `<select name="lead">` populated from an `assignees` list, i.e. a
  team-member picker, not a name string like "Referred by".
- **Both Lead and Referred-by are captured on deal creation**, in
  `NewDealWizard.tsx` — confirmed as a deliberate, explicit exception to that
  flow's pixel-identical carve-out (CLAUDE.md), the same pattern as the
  2026-08-12 redesign exception. This is a separate frontend change from the
  hero-card work in §2/§4 and needs its own explicit go-ahead before touching
  `NewDealWizard.tsx` — recorded here as confirmed scope, not yet started.

One consequence worth flagging in the prompt itself: a Lead *picker* needs a
list of eligible users to pick from, and there is currently no product-side
(non-admin) endpoint that lists an org's members — confirmed by scanning
`app/api/*.py`. `GET /api/admin/*` member-listing endpoints exist but are
admin-portal-only and must not be reused by the product surface (CLAUDE.md's
admin/product separation rule) — so this likely needs a new, narrower
product-scoped endpoint, not a shared one.

Copy-pasteable prompt for a `Simpero_AI_Gov_Alpha` session:

---

I'm extending the frontend's Deal Analysis header and New Deal creation
flow and need backend support for two new fields on deals.

First, a "lead" — the internal team member who owns the deal, picked from a
dropdown at deal-creation time (not free text). I need this to reference a
real user, e.g. a `lead_user_id` column on `deals` referencing `users.id`
(let me know if you'd rather model it differently). This also means I need
a new endpoint to populate that dropdown: the options should be every user
who shares the same `org_id` as the currently logged-in user — i.e. an
org-scoped member list, filtered server-side off the caller's own
`org_id`, not something the frontend filters after the fact. I checked and
there's no product-facing (not `/api/admin/*`) endpoint that lists an
org's members today — please add a new one for this rather than reusing or
extending anything under `/api/admin/*`, since the product and admin
portals are deliberately kept separate on the frontend and I'd like the
backend to match. It should return at minimum each member's id and display
name. `DealRowResponse` should return enough to render the picked lead's
name without an extra round trip (either a nested `{id, name}` or a
`leadUserId` + `leadName` pair — your call).

Second, a "referred by" free-text field on `deals` (the outside source who
brought the deal in — a broker name, a firm, "proprietary outreach", etc.),
no structure needed, just a string.

Both fields should be settable in `CreateDealRequest` (deal creation) and
editable afterward via the existing `PATCH /deals/{deal_id}` endpoint
(`UpdateDealRequest` in `app/schemas/deals.py`), and returned on
`DealRowResponse`.

---

## 4. Phasing (confirmed with Vansh 2026-08-23)

1. **Send §3's prompt** to the Alpha repo session first; also worth pinging
   on Prompts 3 and 6 from 2026-08-12, which are still unimplemented three
   weeks later — data room categories/status and the checklist model in
   particular block real content in two Diligence Workspace panes.
2. **Do not start building the hero card yet.** Wait until Lead/Referred-by
   actually exist on the wire (§3) before writing any frontend code for it,
   as a new component alongside `DealHeaderCard.tsx` (per §2) — do not ship
   an interim version with placeholder dashes for those two fields.
3. Once §3's fields (and the eligible-members endpoint) land: two separate
   frontend changes, not one —
   a. Build the hero card — avatar, name/sector, deal size, "Opened"
      (`createdAt`, already available today), diligence ring + risk badge
      (shared helper extracted from `OverviewPane`), Lead/Referred-by wired
      for real.
   b. Add a Lead picker (dropdown, sourced from the new members-listing
      endpoint) and a Referred-by text field to `NewDealWizard.tsx` — the
      confirmed, explicit exception to that flow's pixel-identical
      carve-out (§3). Re-confirm scope/exact placement in the wizard with
      Vansh before starting this specific change, same as any other
      NewDealWizard touch.
   Add the `{{ count }}` badges to tabs/panes once findings/checklist have
   real backends to count from (separately gated on Prompt 6, not on §3).
4. Findings register (#6) and the Analyst-Notes/Agent-Drafted-Questions
   half of Notes & Transcripts (#7) stay deferred — no new information
   here changes the prior explicit decision to hold those for later.

**Before any of the above frontend work actually starts, re-confirm scope
with Vansh** — this phasing assumes the hero card is still wanted once §3
lands; don't treat this doc as standing authorization to begin coding.
