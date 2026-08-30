# External Deal Intake Link — Implementation Brief (Phases P4 + P5, Web repo)

**Audience: a Claude Code CLI session running locally against a checkout of `Simpero_AI_Gov_Web`, with normal git/network/file access.**
**Author: a Cowork planning/review session. This is the frontend counterpart to `docs/plans/external-deal-intake-link-implementation-brief.md` in the Alpha repo — that brief covered P1 (RLS foundation) and has been implemented (as open PRs #114–123 in `Simpero_AI_Gov_Alpha`). P2 (question CRUD, PRs #107/#108/#110) and P3-04 (document listing, PR #109) are also implemented, as open PRs, not yet merged to staging.**

Read this whole document before writing any code. Section 0 below is not boilerplate — it contains the single most important fact governing how to sequence this work: **most of the Alpha backend routes this frontend needs to call do not exist yet.** Read it before picking a ticket.

---

## 0. Operating rules — read this first

### 0.1 The real blocker: most of P3 (Alpha) hasn't been built yet

I checked the actual state of `Simpero_AI_Gov_Alpha` directly before writing this brief, not just the plan. As of this writing, only these Alpha tickets exist as code (all as **open, unmerged PRs** — nothing described here is on `staging` yet):

| Ticket | What it is | PR | Status |
|---|---|---|---|
| P1-00 … P1-09 | `dd_public` role, RLS foundation, both public dependency functions | #114–123 | Open, unmerged |
| P2-01 | `deal_intake_questions` migration | #107 | Open, unmerged |
| P2-02 | Admin CRUD for questions | #108 | Open, unmerged |
| P2-03 | `GET /api/intake-questions` (product-side read) | #110 | Open, unmerged |
| P3-04 | `GET /api/deals/{deal_id}/documents` | #109 | Open, unmerged |

**Everything else in P3 — P3-01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15 — does not exist in any form.** That means: no link-generation endpoint, no link-status endpoint, no revoke endpoint, no intake-response read endpoint, no `intakeStatus` field on the pipeline row, and **none of the public `/api/public/intake/*` routes** (session issuance, questions, answers, uploads, submit) exist yet. Nothing to call. Nothing to integration-test against.

This is not a reason to stop — most of P4 and P5 can and should be built now, against the **exact, decided contract** in section 3 below (which is frozen — it went through two rounds of product review and is quoted directly from the same plan the Alpha implementation followed). But it changes how you sequence and verify each ticket. Every ticket in section 6 is tagged:

- **[BUILD NOW — no backend dependency]**: implement and fully test today, no blocker.
- **[BUILD NOW — mock the contract]**: implement fully against the frozen contract in section 3, with the network call mocked (MSW or your existing test-mocking convention — check `src/api/deals.test.ts` / `src/api/documents.test.ts` for how this repo already does it). Write it so that swapping the mock for the real endpoint later is a one-line change, not a rewrite.
- **[BUILD NOW — real backend exists]**: an Alpha PR for this already exists (even if unmerged) — you can point a local dev backend at that branch and integration-test for real. Check out the corresponding Alpha branch locally if you want to run this end-to-end rather than mocked.
- **[BLOCKED — wait for Alpha]**: genuinely cannot be usefully built without a decision that's still pending on the Alpha side, or without a running instance of a specific unmerged route. Flag it, don't guess at it.

Nothing here should be "implemented against a guess." If section 3 doesn't specify a field or behavior you need, stop and flag it — don't invent a shape and hope it matches what Alpha ships.

### 0.2 The other governing rule: `CLAUDE.md`'s New Deal freeze

This repo has a standing rule (`CLAUDE.md`, quoted exactly in section 4.0 below) that the New Deal wizard (`src/pages/NewDealWizard.tsx`, `src/pages/newDealWizard/**`, route `/new-deal/:step?`) must stay **pixel-identical** to the pre-redesign monorepo — "the one carve-out inside the carve-out." **P5-00 amends this rule and must land, reviewed and approved by Vansh, before any other P5 ticket touches those files.** Do not edit the wizard files under the existing freeze text; get the amendment merged first.

### 0.3 Process rules (same as the Alpha brief)

1. **Implement one ticket at a time**, in the order given in section 6.
2. **Update `docs/plans/external-deal-intake-link-web-status.md`** (template in section 7) after every ticket — this is Vansh's single source of truth for what's done. Don't create a separate tracker.
3. **Do not deviate from the documented contract (section 3) without flagging it back.** If something about the actual Alpha PRs (#107–110, #114–123) turns out to differ from what's quoted here — a field name, a status code, a response shape — stop, note the discrepancy in the status file, and flag it rather than silently adapting. Check the actual PR diffs directly (`gh pr diff <number>` or the branch) rather than assuming section 3 is still accurate if something looks off — section 3 reflects the *plan*, and the *implementation* is the ground truth if they ever disagree, exactly the same trust rule `CLAUDE.md` already states for `docs/plans/` vs `docs/implementations/`.
4. **Commit per ticket**, referencing the ticket ID.
5. **This feature's core property** (same as the Alpha brief, restated because it constrains frontend choices too): an external, unauthenticated party interacts with this product. `src/api/publicHttp.ts` (P4-01) is explicitly called out in its own ticket as "the one frontend change that is a security control, not a convenience" — it must never touch `window.Clerk` or send credentials. Get that one exactly right; everything else in P4 depends on it staying that way.

---

## 1. Feature summary (context)

The org user's Step 1 gains a checkbox: collect diligence materials directly, or generate a link an external party (no login) uses to answer a fixed question set and upload documents themselves. The deal only becomes analysis-ready once the external party explicitly submits. This repo's job is two things: (P4) a standalone, unauthenticated public surface at `/intake/:token` for the external party, structurally isolated from the product shell the same way the admin portal already is; and (P5) the wizard-side changes — the checkbox, a new share-link step, a conditional waiting-panel Step 2, a real document/answers Step 3, and the dashboard's conditional row routing.

Full architecture (RLS, roles, the public API's design rationale) lives in the Alpha repo's brief — you don't need to re-derive any of it, only consume the contract in section 3.

---

## 2. Current codebase — read before touching anything

I read the actual files, not just the ticket descriptions. These facts matter for getting P4/P5 right on the first pass.

### 2.1 The wizard is one file, not one-component-per-step

`src/pages/NewDealWizard.tsx` (432 lines) is the *entire* wizard — Step 1 (`Step1Details.tsx`) and Step 3 (`Step3Confirm.tsx`) are separate components, but **Step 2 ("upload-files") is inlined directly in `NewDealWizard.tsx`** as a JSX block, not its own file. Steps are driven by a route param normalized against a fixed set:

```typescript
const VALID_STEPS = new Set(["details", "upload-files", "confirm"]);
type StepName = "details" | "upload-files" | "confirm";
```

`P5-02` (the new share-link step) needs a new entry here — `"share-link"` — and `P5-04` (the conditional waiting panel) needs to branch *inside* the existing `stepName === "upload-files"` block (or extract it to its own component first, your call, but the routing/step-name plumbing above is the seam to work through either way).

**The exact bug P5-03 fixes** is this guard, verbatim from the current file:
```typescript
} else if (stepName === "confirm") {
  if (state.attachDealId == null) {
    toast.error("Create the deal first");
    navigate("/new-deal");
  } else if (!state.hasUploadedDocument) {
    toast.error("Attach a primary document first");
    navigate("/new-deal/upload-files");
  }
}
```
`state.hasUploadedDocument` is reducer-local state (`newDealWizardReducer.ts`), set only by the `"document_uploaded"` action, which only fires on a fresh in-session upload. Opening `/new-deal/confirm?dealId=<uuid>` for a deal that already has verified documents (attach mode) never fires that action, so this guard bounces the user back to Step 2 even though the deal is actually ready — **this bug is not specific to the external-intake feature**, it affects every attach-mode deal today. P5-03 replaces this with a query against `GET /deals/{deal_id}/documents` (P3-04, **already built**, PR #109) plus the intake-link's effective status (P3-02, not yet built).

**The Step 1 → Step 2 branch point** P5-01 needs to extend, verbatim:
```typescript
const handleCreateDeal = async () => {
  if (state.attachDealId != null) {
    navigate("/new-deal/upload-files");
    return;
  }
  // ... creates the deal via createDeal() ...
  dispatch({ type: "deal_created", dealId: created.id });
  navigate("/new-deal/upload-files");
};
```
P5-01 adds the branch: if the collection checkbox is checked, call `POST /deals/{deal_id}/intake-link` (P3-01, not yet built) instead of navigating straight to `/new-deal/upload-files`, then navigate to `/new-deal/share-link` (P5-02) instead.

### 2.2 Reducer state (`src/pages/newDealWizard/newDealWizardReducer.ts`)

Relevant existing shape:
```typescript
export type WizardState = {
  // ...
  hasUploadedDocument: boolean;  // P5-03 replaces reliance on this for the Step 3 guard
  attachDealId: string | null;
  // ...
};
```
P5-01 will need new state for the checkbox and recipient email (e.g. `collectExternally: boolean`, `recipientEmail: string`), and P5-02/P5-04 will need somewhere to hold the generated link/status once fetched — decide whether that's reducer state or a React Query cache entry (the codebase already uses `@tanstack/react-query` elsewhere in this file for `dealQuery`, which is the more idiomatic fit for anything read from the server rather than user input).

### 2.3 `WizardProgressBar.tsx` — label variants (P5-06)

Currently hardcoded:
```typescript
const STEPS = [
  { num: 1 as const, label: "Deal Details" },
  { num: 2 as const, label: "Upload Materials" },
  { num: 3 as const, label: "Confirm & Start" },
];
```
P5-06 needs step 2's label to read "Upload Materials" on the normal path and something like "External Collection" on the intake-link path — thread a prop through rather than hardcoding a second array.

### 2.4 `src/api/http.ts` — what `publicHttp.ts` must NOT look like

```typescript
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null;
  try {
    token = (await window.Clerk?.session?.getToken()) ?? null;
  } catch {
    token = null;
  }
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
}
```
`publicHttp.ts` (P4-01) is a sibling with the same `API_BASE_URL` prefixing, but: no `window.Clerk` reference at all, no `credentials: "include"`, and it carries the intake session token (from `POST /session`, held in memory only — never `localStorage`, never a cookie) as its own header instead of a Clerk bearer token. Suggested shape: an explicit token parameter or a small module-scoped setter (`setIntakeSessionToken(token)`), not a global reach into Clerk state, since there is no Clerk state to reach into on this surface.

### 2.5 The upload pipeline needs a refactor to be shared, not copied (P4-06)

`src/lib/documentUploadPipeline.ts`'s `runDocumentUpload(dealId, file, opts)` sequences validate → hash → presign → PUT → complete, but its presign/complete calls (`requestPresignedUpload`, `completeUpload` from `src/api/documents.ts`) go through `apiFetch` — Clerk-authenticated. The public upload flow needs the *same sequence* against different endpoints (`POST /api/public/intake/uploads/presigned-url`, `POST /api/public/intake/uploads/{id}/complete`) authenticated by the intake session token via `publicHttp`, not `apiFetch`.

**Do not copy-paste `runDocumentUpload`.** Refactor it to accept the presign/complete functions as parameters (or extract the shared validate→hash→PUT sequence into a helper that both `runDocumentUpload` and a new `runPublicDocumentUpload` call), so the hashing and validation logic — the part that actually matters for correctness — lives in exactly one place. `DuplicateUploadError`'s 409 handling is also relevant to the public path (a second attempt at the same file) — check whether the public endpoint's 409 shape matches (see section 3) before assuming this error class transfers unchanged; the public routes may need their own error type if the response shape differs (they're on `publicHttp`, not `apiFetch`, and the 404-only failure contract in P3-13 may mean 409 doesn't even apply the same way to the public side — verify against the real Alpha implementation before assuming).

### 2.6 `DealsTable.tsx` — the routing change is one `<Link>` (P5-07)

Currently a single unconditional destination:
```tsx
<Link to={`/deals/${row.dealId}/analysis`} className="...">
```
`row` is typed `LivePipelineRow` (`src/shared/dealsListPipeline.ts`) — **no `intakeStatus` field exists on it yet**; P3-06 (not built) is what adds it on the backend. Add the field to the shared type once P3-06 ships (or add it now as an optional field the way `DealsTable.tsx` already does for `confidential` — see the existing `RowWithConfidential` additive-overlay pattern in that same file, a precedent for exactly this situation: a field the frontend wants to render before the backend contract is finalized). Branch the `<Link to>` destination on `row.intakeStatus`: `'pending'` → `/new-deal/upload-files?dealId=`, `'submitted'` → `/new-deal/confirm?dealId=`, `'none'` or absent → today's unchanged `/deals/{id}/analysis`.

### 2.7 Route registration precedent (P4-02)

`src/routes.tsx` registers `/shared/:token` as a **top-level sibling**, before the `AuthGateLayout`-wrapped block:
```tsx
children: [
  { path: "/landing", element: <StealthLanding /> },
  { path: "/shared/:token", element: <SharedMemo /> },
  // ...
  { path: "/admin/*", element: (...) },  // also outside AuthGateLayout, guarded internally
  {
    element: <AuthGateLayout />,
    children: [ /* everything requiring product auth */ ],
  },
],
```
`/intake/:token` goes in the same top-level list as `/shared/:token`, **not** inside the `AuthGateLayout` children. This is a routing-registration precedent only — `SharedMemo`'s actual data-fetching implementation is unrelated and not something to imitate (per the ticket's own note: "precedent from SharedMemo's route registration, not its trpc implementation").

### 2.8 Admin CRUD precedent for P5-08

`src/admin/pages/MandateTaxonomy.tsx` (614 lines) is the structural template: `react-hook-form` + `zod` resolvers, shadcn-derived primitives from `@/components/mvp/primitives` (`Dialog`, `Form`, `Table`, etc.), wrapped in `AdminLayout`, with `ConfirmDialog` for destructive actions and `DataState` for loading/error/empty rendering. Mutations go through dedicated hooks (`useCreateMandateCategoryMutation` and siblings) — check `src/admin/hooks/` for that file's exact location and naming convention, and mirror it for `useCreateIntakeQuestionMutation` etc.

Routing: `src/admin/AdminApp.tsx` registers pages as nested routes (`<Route path="mandate-taxonomy" element={<MandateTaxonomy />} />`), guarded by `AdminGuard` (`src/admin/components/AdminGuard.tsx`), which reads `isPlatformAdmin`/`isOrgAdmin` from `useAdminContext()`. **Verify directly** whether `AdminGuard` already distinguishes platform-only routes from org-admin-accessible ones, or whether platform-only pages currently gate themselves internally by checking `isPlatformAdmin` — I did not find a page that needs platform-only access during this read, so don't assume either pattern; check what's actually there and follow it. The backend (P2-02, **already built**, PR #108) already 403s a non-platform-admin caller regardless, so the frontend gate is a UX nicety, not the security boundary — but it should still exist and match however this repo already does it elsewhere, don't invent a third pattern.

### 2.9 `CLAUDE.md`'s exact freeze text (quote this precisely in the P5-00 amendment)

```
- **Exception (2026-08-12):** a deliberate, explicit, user-approved visual/IA
  redesign, covering `src/components/**` and `src/pages/**` — plan:
  `docs/plans/2026-08-12-web-design-revamp.md` (full scope, phasing, every
  open decision); what actually shipped:
  `docs/implementations/2026-08-13-web-design-revamp.md` (Phases 0–9 done as
  of that date; Phase 10, Data Consolidation, deliberately cut, recommended
  as a separate future epic — trust the implementation doc over the plan if
  they ever disagree). This does **not** relax the rule above for
  `src/shared/` (still the faithful rendering contract) or for the New Deal
  flow (`src/pages/NewDealWizard.tsx`, `src/pages/newDealWizard/**`, route
  `/new-deal/:step?`), which keeps its pixel-identical obligation even while
  the redesign landed around it — the one carve-out inside the carve-out.
```
P5-00's job is to narrow *only* the New Deal clause — the existing three-step path (`details` / `upload-files` / `confirm`) keeps its pixel-identical obligation; the new external-intake branch (the checkbox, `share-link` step, conditional Step 2/3 content) is explicitly exempted, dated, with a pointer at the Alpha+Web plans. Do not touch the `src/shared/` clause or anything else in this paragraph.

---

## 3. The backend contract — frozen, build against this exactly

This is quoted directly from the plan both repos are implementing against. Where an Alpha PR already exists for a route, that PR's actual code (not this section) is ground truth if they disagree — check per rule 0.3.3.

### 3.1 Public routes — `app/api/public_intake.py` (none built yet)

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/public/intake/{token}/session` | token in path | Body `{email}`. Case-insensitive match against the link's recipient. Returns a short-lived (30 min) intake session token scoped to `{link_id, deal_id, email}`. **The raw link token is never sent again after this call.** |
| `GET /api/public/intake/questions` | intake session | Returns `questions_snapshot` from the link row, plus the org's display name. Nothing else — no deal name, no deal size, no GP/source, no other party's answers. |
| `POST /api/public/intake/answers` | intake session | Writes/overwrites the in-progress answer set. Required-question validation server-side; a `question_key` outside the snapshot is a 422, not silently dropped. Repeatable before Submit. |
| `POST /api/public/intake/uploads/presigned-url` | intake session | Same shape as the existing `POST /api/uploads/presigned-url`, but `dealId` is derived server-side from the session, never from the request body. |
| `POST /api/public/intake/uploads/{id}/complete` | intake session | Same shape as `POST /api/uploads/{id}/complete`. |
| `POST /api/public/intake/submit` | intake session | The explicit finish. Flips the link to `submitted`, writes the response row, unrepeatable — a second call fails closed (404, not a duplicate). Requires ≥1 uploaded document. |

**Every failure mode on every one of these routes returns the identical 404** — bad token, expired, revoked, already-submitted, wrong email. No 403, no distinguishing message. This is load-bearing for P4-04/P4-07 ("a wrong email and an expired link render pixel-identical error states" is P4-04's literal acceptance criterion) — do not build a frontend that tries to show a different message for different failure reasons, because the backend contract deliberately gives you nothing to distinguish them with.

Request/response field casing: camelCase on the wire everywhere (matches the rest of this app's `CamelModel` convention) — `questionKey`, `helpText`, `displayOrder`, etc., same as the already-built `GET /api/intake-questions` response you can see directly in PR #110's `app/schemas/intake_question.py`.

### 3.2 Org-side routes — `app/api/deals.py`

| Route | Purpose | Status |
|---|---|---|
| `POST /api/deals/{deal_id}/intake-link` | Generate. Returns the raw token exactly once. 409 if analysis already started, or if a live link already exists. | Not built (P3-01) |
| `GET /api/deals/{deal_id}/intake-link` | Status, recipient, expiry, submitted-at. **Never the token.** Returns *effective* status (a stored `pending` row past its `expires_at` reads as `expired` here even before any write has run). | Not built (P3-02) |
| `DELETE /api/deals/{deal_id}/intake-link` | Revoke. | Not built (P3-03) |
| `GET /api/deals/{deal_id}/documents` | `{id, filename, status, createdAt}[]`, no field distinguishing org vs. external origin. | **Built — PR #109** |
| `GET /api/deals/{deal_id}/intake-response` | `{id, dealId, respondentEmail, submittedAt, answers: [{questionKey, prompt, answer, answered}]}`. 404 if nothing submitted yet. | Not built (P3-05) |
| `GET /api/deals/pipeline` | Gains `intakeStatus: 'none' | 'pending' | 'submitted'` per row, derived from effective status, `'none'` if no link was ever generated OR the link is revoked/expired (the grid does not need a fourth state for a functionally-dead link). | Not built (P3-06) |

### 3.3 Admin routes — `app/api/admin/intake_questions.py`

**Already built — PR #108.** `GET/POST/PATCH /admin/intake-questions`, `PUT /admin/intake-questions/reorder`, `PATCH /admin/intake-questions/{id}/activate|deactivate`. Response shape: `{id, questionKey, prompt, helpText, inputType, required, displayOrder, isActive}`. This is the one Alpha surface P5-08 can build and integration-test against for real today — check out PR #108's branch locally if you want a live backend to point at.

### 3.4 Status semantics that matter for P5-03/P5-04/P5-05/P5-07

- `deal_intake_link.status` stored values: `pending`, `submitted`, `revoked`, `expired`. **Every read path uses "effective status,"** not the raw column — a `pending` row past `expires_at` reads as `expired` on every GET even before any write has flipped it (there is no cron; the flip happens lazily, only at the next link-generation call). Frontend code must never assume "if status field says `pending`, the link is definitely still live" — treat `expires_at` as authoritative alongside status if you ever need to reason about it client-side, though in practice you should just trust whatever `GET /intake-link` and `GET /pipeline` return, since they already apply this computation server-side.
- `data_source.status` values (for P5-05's per-document list): `pending`, `verified`, `quarantined`, `ocr_needed`, `mismatch`. Show all of them distinctly — do not collapse to a binary attached/not-attached the way today's Step 3 does.

---

## 4. Ticket breakdown — build in this order

Each entry: **[track tag]**, dependencies, what to build, acceptance criteria (from the ticket backlog).

### Phase P4 — Public surface

**P4-02 — Route: `/intake/:token` outside `AuthGateLayout`** `[BUILD NOW — no backend dependency]`
Register in `src/routes.tsx` next to `/shared/:token` (section 2.7). *AC: visiting the route signed out, or signed in as an unrelated user, renders the intake flow, not a sign-in redirect.*

**P4-03 — Minimal public shell** `[BUILD NOW — no backend dependency]` (depends: P4-02)
No `MvpAppShell`, no `MvpSidebar`, no `useAuth` import from `@/_core/hooks/useAuth`. *AC: the intake page's bundle imports nothing from `src/components/mvp/shell/**` or the product auth hooks — check this with a bundle/import-graph assertion, not just eyeballing, the same way the admin/product boundary is presumably already enforced (check for an existing lint rule or test doing this for the admin surface and mirror it).*

**P4-01 — `src/api/publicHttp.ts`** `[BUILD NOW — mock the contract]` (no hard code dependency, but functionally needed by P4-04 onward)
See section 2.4 for the exact shape to avoid. *AC: a browser with an active Simpero session open sends no Clerk cookie or bearer token on any call through this module — confirmed by inspecting request headers in a test, not just reading the source.*

**P4-04 — Email screen** `[BUILD NOW — mock the contract]` (depends: P4-01, P4-03)
Single email input, calls `POST /session` through `publicHttp`. On success, stores the intake session token in memory (module-scoped state or a context provider — not `localStorage`, not a cookie) and advances. On any failure, the generic "this link is no longer available" state — never a message distinguishing why (section 3.1). *AC: a wrong email and an expired link render pixel-identical error states — write this as an actual test asserting identical rendered output for both mocked failure cases, not just identical-looking code paths.*

**P4-05 — Questions screen** `[BUILD NOW — mock the contract]` (depends: P4-04)
Renders `questions_snapshot` in order, free-text inputs, required-field validation mirroring the server's (section 3.1 — no `question_key` outside the snapshot, 4000-char cap per answer, non-blank for required). Back-navigation to the email step's state is preserved locally until Submit. *AC: leaving a required question blank blocks Continue with the same message the backend would give (i.e., match the copy, not just the fact of blocking).*

**P4-06 — Upload + Submit screen** `[BUILD NOW — mock the contract]` (depends: P4-05; real integration blocked on Alpha P3-10/P3-11)
Multi-file variant of the existing upload pattern — see section 2.5 for the required refactor of `runDocumentUpload` before this can share code cleanly. Enforce the 20-file cap and ≥1-required rule client-side ahead of the server check. Submit button disabled until at least one upload has completed. *AC: Submit is unreachable with zero completed uploads. A 21st file is rejected in the dropzone before any network call.*

**P4-07 — Terminal states: submitted / link unavailable** `[BUILD NOW — mock the contract]` (depends: P4-06)
A clean "thank you, submitted" screen after a successful submit, and the generic unavailable-link screen reachable from any point in the flow (e.g. the link expires mid-session). *AC: refreshing the tab after a successful submit shows the same thank-you state, not an error — the link is legitimately gone under the keyhole policy by then, and the frontend needs to treat that specific 404 as "already done," not "broken." This needs either a client-side "I already submitted" flag held past the token's usefulness, or accepting that a refresh after submit shows the generic unavailable screen instead of a tailored thank-you — decide which and document it, since the ticket's AC as written implies the former but the backend contract as specified doesn't obviously distinguish the two 404 cases for you. Flag this back if it's ambiguous rather than guessing.*

### Phase P5 — Wizard branch

**P5-00 — `CLAUDE.md`: scope the New Deal freeze** `[BUILD NOW — no backend dependency]` **— must land, reviewed and approved by Vansh, before any other P5 ticket.**
See section 2.9 for the exact paragraph and what to change. *AC: diff reviewed and approved by Vansh before any other P5 ticket is merged — this is a hard gate, not a suggestion; don't merge P5-01 behind it "to save time."*

**P5-06 — `WizardProgressBar` label variants** `[BUILD NOW — no backend dependency]` (depends: P5-00, and logically P5-01 for the trigger condition, but the component change itself has no backend dependency)
Thread a variant prop through per section 2.3. *AC: visual regression check on both branches.*

**P5-09 — Regression test: attach-mode Step 3 guard** `[BUILD NOW — mock the contract]` (depends: P5-00, P5-03)
Covers the F2 bug (section 2.1) independent of the external-intake feature. *AC: test fails against the pre-P5-03 code, passes after — write this test FIRST, confirm it fails, then implement P5-03, confirm it passes. This is the one ticket in this brief where TDD ordering is explicitly the point.*

**P5-03 — Server-driven step gating** `[BUILD NOW — mock the contract, P3-04 half is real]` (depends: P5-00; needs P3-02 [not built] and P3-04 [**built, PR #109**])
Replace the `state.hasUploadedDocument` guard (section 2.1) with a query against `GET .../documents` (real today) and the intake-link's effective status (mocked until P3-02 ships). *AC: opening `/new-deal/confirm?dealId=<uuid>` for a deal with existing verified documents lands on Step 3 directly, with no in-session upload having occurred — this AC is fully testable today against the real P3-04 endpoint even before P3-02 exists, since a non-intake deal's gating only ever needed the documents check.*

**P5-01 — Step 1: collection checkbox + recipient email field** `[BUILD NOW — mock the contract]` (depends: P5-00; needs P3-01 [not built])
See section 2.1 for the exact `handleCreateDeal` branch point. *AC: the unchecked path is byte-for-byte the existing behavior — the regression test for this should already exist for Step 1; extend it to also cover "checkbox present, unchecked, behavior unchanged" explicitly rather than trusting that by inspection.*

**P5-02 — New wizard step: share-link** `[BUILD NOW — mock the contract]` (depends: P5-01)
Shows the generated URL exactly once with copy-to-clipboard and a note it won't be shown again. *AC: navigating away and back does not re-display the raw token — it must never be persisted anywhere client-side beyond this screen's local render state (not reducer state that outlives the screen, not `sessionStorage`).*

**P5-04 — Step 2: conditional waiting panel** `[BUILD NOW — mock the contract]` (depends: P5-03; needs P3-02/P3-03 [not built])
Replaces the dropzone with a panel naming the recipient and send date, a Revoke action, and a status indicator. No org-side upload affordance in v1 — deliberately deferred, backend already permits it, this is UI-only (do not add a feature-flag or TODO comment implying it's coming soon in this same PR; it's a separate, undecided-timing future ticket). *AC: the dropzone never renders for a deal whose intakeStatus is 'pending'.*

**P5-05 — Step 3: answers panel + per-document status + reissue prompt** `[BUILD NOW — mock the contract, P3-04 half is real]` (depends: P5-03; needs P3-04 [**built**] and P3-05 [not built])
Replace "Documents attached" / "No documents attached" with the real per-document list (section 3.4's five statuses, not a binary). Add an answers panel rendering `answers[]` in order once P3-05 exists. If the link is submitted and none of the deal's documents are `verified`, show a reissue prompt inline — this is the F10 fix, and it's the ticket most worth getting right: a silent empty state here is exactly the failure mode this whole ticket exists to close. *AC: a deal with 6 uploaded documents shows all 6 by filename AND status, not a count (testable today against real P3-04 data). A submitted link whose documents are all quarantined/mismatch shows the reissue prompt, not a bare document list (needs P3-05/P3-02 for the "submitted" half — build the document-status half now, add the reissue-prompt trigger once those exist, don't skip the ticket entirely for lack of the second half).*

**P5-07 — `DealsTable`: conditional grid routing** `[BUILD NOW — mock the contract]` (depends: none within Web; needs P3-06 [not built])
See section 2.6 — add `intakeStatus` to `LivePipelineRow` as an additive-optional field first (matching the existing `confidential` precedent), branch the `<Link to>` destination. *AC: a deal with `intakeStatus: 'none'` (or the field absent) routes identically to current production behavior — this is the one you can fully verify today without P3-06, by testing the "field absent" and "field = 'none'" cases; the 'pending'/'submitted' branches need a mocked row until P3-06 ships.*

**P5-08 — Admin portal: Intake Questions page** `[BUILD NOW — real backend exists via PR #108]` (depends: none within Web; needs P2-02 [**built, PR #108**])
New page under `src/admin/pages/`, structurally mirroring `MandateTaxonomy.tsx` (section 2.8): list, create, edit, reorder, activate/deactivate. Platform-admin only. **This is the one ticket in P5 you can build and integration-test for real today** — check out PR #108's branch in a local Alpha checkout, run it, point this page at it. *AC: an org-admin-only session gets no nav entry and a 403 if it hits the route directly.*

**P5-10 — Deferred, not v1.** Do not build. Recorded in the ticket backlog only so "later" has a target. Skip entirely for this pass.

---

## 5. Status tracking file — create in `docs/plans/external-deal-intake-link-web-status.md`

```markdown
# External Deal Intake Link — Web (P4/P5) implementation status

Started: <date>
Implementing session: local Claude Code CLI, Simpero_AI_Gov_Web
Source spec: docs/plans/external-deal-intake-link-web-implementation-brief.md
Companion (Alpha): docs/plans/external-deal-intake-link-implementation-brief.md and its status file

## Tickets

| Ticket | Track | Status | Commit(s) | Verified against | Notes |
|---|---|---|---|---|---|
| P4-02 | build now | | | | |
| P4-03 | build now | | | | |
| P4-01 | mocked | | | | |
| P4-04 | mocked | | | | |
| P4-05 | mocked | | | | |
| P4-06 | mocked | | | | |
| P4-07 | mocked | | | | |
| P5-00 | build now | | | | **must be Vansh-approved before any ticket below** |
| P5-06 | build now | | | | |
| P5-09 | mocked | | | | |
| P5-03 | mocked+real | | | | P3-04 half real, P3-02 half mocked |
| P5-01 | mocked | | | | |
| P5-02 | mocked | | | | |
| P5-04 | mocked | | | | |
| P5-05 | mocked+real | | | | P3-04 half real, P3-05 half mocked |
| P5-07 | mocked | | | | |
| P5-08 | real | | | | fully real via PR #108's branch |

## Flagged (deviations from this brief, or judgment calls made where the brief was ambiguous)

- P4-07's refresh-after-submit ambiguity (section 4, P4-07) — resolved as: <...>
- P4-06's DuplicateUploadError transfer to the public path (section 2.5) — resolved as: <...>
- <anything else>

## Blocked on Alpha (do not attempt to fully close until the corresponding PR merges)

- P3-01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15 — none exist yet. Re-check
  `gh pr list` in Simpero_AI_Gov_Alpha before assuming this list is still accurate.
```

---

## 6. First prompt to paste into your local Claude Code CLI session

> Read `docs/plans/external-deal-intake-link-web-implementation-brief.md` in full before doing anything else. It's a complete spec for the frontend half (P4 public surface, P5 wizard branch) of the External Deal Intake Link feature — the backend counterpart in `Simpero_AI_Gov_Alpha` has P1 done (PRs #114–123), P2 done (#107/#108/#110), and P3-04 done (#109), all as open unmerged PRs; nothing else in P3 exists yet. Section 0 explains why that matters: most tickets here have to be built against the frozen contract in section 3 with the network layer mocked, not against a real running backend — each ticket in section 4 is tagged with which track it's on. Start with P4-02 and P4-03 (no backend dependency at all), then P4-01, then work down section 4 in order. P5-00 (the CLAUDE.md amendment) needs my explicit sign-off before any other P5 ticket — stop and show me that diff separately, don't bundle it into a later PR. Update `docs/plans/external-deal-intake-link-web-status.md` after every ticket. Flag anything ambiguous (P4-07 and P4-06 both have a flagged open question in section 4 already) rather than guessing at a shape the backend hasn't committed to yet.

---

## 7. Where this brief's content came from

Sections 1 and 3 are drawn from the same reviewed plan the Alpha implementation followed — nothing new invented for this handoff. Section 2 is from a direct read of the actual `Simpero_AI_Gov_Web` repository (not assumed from the ticket descriptions) done immediately before writing this brief, specifically to catch drift between the plan's frontend section and what the codebase actually looks like today — e.g. the wizard being one file rather than one-component-per-step, and the exact current guard clause P5-03 replaces, are both facts I confirmed by reading the files, not facts restated from the plan. Section 0.1's PR-status table is live as of this writing — re-check `gh pr list` in Alpha before trusting it if time has passed since this brief was written.