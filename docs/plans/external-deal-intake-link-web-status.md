# External Deal Intake Link — Web (P4/P5) implementation status

Started: 2026-08-27
Implementing session: local Claude Code CLI, Simpero_AI_Gov_Web
Source spec: docs/plans/external-deal-intake-link-implementation-brief.md
Companion (Alpha): docs/plans/external-deal-intake-link-implementation-brief.md and its status file (Alpha repo)

## Tickets

| Ticket | Track | Status | Commit(s) | Verified against | Notes |
|---|---|---|---|---|---|
| P4-01 | mocked | done | a5541bd | unit test (Clerk-header leak assertion) | |
| P4-02 | build now | done | c168064 | route present, lazy-loaded | |
| P4-03 | build now | done | c168064 | import-graph walk test (no dep-cruiser installed; hand-rolled) | |
| P4-04 | mocked | done | c168064 | unit test: wrong-email vs expired render identical output | |
| P4-05 | mocked | done | c168064 | unit test: required-field block, no network call | |
| P4-06 | mocked | done | c168064 | unit tests: submit gated on completed upload, 21st file rejected | see flagged item below re: DuplicateUploadError |
| P4-07 | mocked | done | c168064 | unit test: sessionStorage flag keeps thank-you on refresh | see flagged item below |
| P5-00 | build now | done | 70dfc2a | CLAUDE.md "Second exception (2026-08-27)" paragraph present | **must be Vansh-approved before any ticket below** |
| P5-06 | build now | done | 22e616e | step2Label prop + WizardProgressBar.test.tsx | done (component); call site wired in P5-01 |
| P5-09 | mocked | done | b0be51f (test), c3a152b (fix) | RED at b0be51f on the assertion (toast.error "Attach a primary document first"), GREEN 6/6 at c3a152b; independently re-verified. | |
| P5-03 | mocked+real | done | db6a1ee (API clients) + c3a152b (gate) | real GET /deals/{id}/documents contract (P3-04); intake-link half mocked behind INTAKE_ENDPOINTS_MOCKED. | P3-04 half real, P3-02 half mocked |
| P5-01 | mocked | pending | | | |
| P5-02 | mocked | done | de57ab1 | unit tests in `NewDealWizard.test.tsx` (share-link describe block): token displayed on first arrival, not re-displayed after navigate-away-and-back (`queryByText`/DOM-innerHTML/`sessionStorage`/`localStorage` all checked empty of it), copy-success and copy-failure paths, progress-bar step-2 mapping unchanged for the three pre-existing steps. | |
| P5-04 | mocked | done | 32ca2eb | unit tests in `NewDealWizard.test.tsx` (P5-04 describe block): pending status hides the dropzone/disables Continue, null status renders the byte-identical (no `disabled`/`title`) non-intake DOM, two-click revoke calls `revokeIntakeLink` exactly once and the dropzone reappears once the mocked GET flips, `createdAt` absent/present render "—"/formatted, and a source-string assertion that `Step2WaitingPanel.tsx` names no TODO/"coming soon". | see flagged item below re: `dealId` prop |
| P5-05 | mocked+real | done | 311bf3c | unit tests in `Step3Confirm.test.tsx` (9 cases): 6 documents by filename not count, all 5 statuses render distinctly, unknown status falls back without crashing, submitted+all-quarantined and submitted+zero-documents both show the reissue panel and fire `onReissue`, submitted+one-verified shows no reissue panel, `answered: false` renders "Not answered", and the `intakeStatus: null` byte-identity case for the frozen non-intake row. | Document half real via P3-04 (`GET /deals/{id}/documents`); answers panel (P3-05) and the reissue trigger's "submitted" condition are exercised against mocked `intakeStatus`/`intakeResponse` pending P3-05/P3-02. |
| P5-07 | mocked | done | e8d8fb9 | unit tests in `DealsTable.test.tsx`: absent-field and `'none'` cases route to `/deals/{id}/analysis` (real, fully verifiable today, no P3-06 needed); `'pending'`→`/new-deal/upload-files?dealId=` and `'submitted'`→`/new-deal/confirm?dealId=` are mocked pending P3-06. | |
| P5-08 | real | pending | | | fully real via PR #108's branch |

## Flagged (deviations from this brief, or judgment calls made where the brief was ambiguous)

- Intake session token transport: section 3.1 doesn't name a header for
  the session token on `GET /api/public/intake/questions` and friends.
  Chose `Authorization: Bearer <token>` to match the rest of the app's
  existing convention (`apiFetch`) — no other header name is implied
  anywhere in the contract. Flag back if Alpha's actual implementation
  uses something else (e.g. a custom `X-Intake-Session` header).
- P4-07's refresh-after-submit ambiguity (section 4, P4-07) — resolved as:
  a `sessionStorage` flag `intake-submitted-{token}` set right before the
  successful-submit transition, keyed by the URL token (already visible in
  the address bar — not a secret). Read on mount to choose between the
  submitted and unavailable terminal screens. See IntakePage.tsx's comment.
- P4-06's DuplicateUploadError transfer to the public path (section 2.5) —
  resolved as: NOT special-cased. The public presigned-url/complete routes
  (P3-10/P3-11) don't exist yet, so their real 409 shape is unverifiable;
  `publicIntake.ts`'s `ok()` helper treats any non-ok response uniformly as
  `IntakeUnavailableError`, consistent with the public contract's
  already-undifferentiated-failure design. Revisit once P3-10/P3-11 ship —
  if the real 409 carries a reusable existing-upload id the way the
  authenticated route's does, `runPublicDocumentUpload` should short-circuit
  the same way `runDocumentUpload` does.
- Intake questions screen (P4-05): "match the copy, not just the fact of
  blocking" (brief's AC) can't be verified against real backend copy since
  P2-03's actual validation-error message isn't visible from this repo.
  Used a generic "This question is required." — revisit once P2-03's PR
  #110 diff is checked directly, or the endpoint is live.
- P5-09 TDD ordering deviation. The brief requires the test to fail before
  the fix. It was committed in three steps — API clients first (`db6a1ee`,
  behavior-neutral, nothing imported them), then the failing test
  (`b0be51f`), then the fix (`c3a152b`). Reason: `vi.mock`-ing an export
  that doesn't exist yet fails at module resolution, which proves nothing
  about the guard. The guard is what was pre-P5-03, so the AC's intent
  holds. Also note: only the single P5-09 regression case existed at RED;
  the other five cases in `NewDealWizard.test.tsx` were added alongside the
  fix and were never themselves red-tested.
- P5-03 fail-closed on intake-link query error. `fetchIntakeLink` returns
  `null` on a 404 (no link ever generated), but a transient 500 would also
  leave the status `null` — which would have let an org start analysis on a
  deal whose external party had uploaded but not yet submitted, defeating
  the feature's core property. Resolved by modelling each query as a
  discriminated union (`loading`/`error`/`ready`) in
  `src/pages/newDealWizard/confirmStepGate.ts`, so "errored" is not
  representable as "resolved to null". An intake-link error blocks with
  "Couldn't check external collection status" + a retry hint; the global
  react-query retry policy means a one-off blip resolves inside the
  loading window and never reaches that branch. Do NOT add `retry: false`
  to that query.
- `IntakeLink.createdAt` is optional-and-nullable (`createdAt?: string |
  null`). It is not in the brief's section 3.2 field list and P3-02 isn't
  built, so the contract does not guarantee it. P5-04's waiting panel must
  render "—" when absent, never a fabricated date. Revisit when P3-02
  ships.
- P5-04 `Step2WaitingPanel` props. The brief lists `{ link, onRevoked }` only,
  but the revoke mutation it also specifies (`useMutation({ mutationFn: () =>
  revokeIntakeLink(dealId) })`) needs a `dealId` — `IntakeLink` (§3.2) carries
  no `dealId` field of its own. Added `dealId: string` as a third required
  prop (the caller already holds `state.attachDealId`); kept `onRevoked` as a
  post-success hook the parent can use, in addition to the panel's own
  invalidation of `intakeLinkQueryKey(dealId)` (which is what actually makes
  the dropzone reappear). NewDealWizard.tsx's `onRevoked` is a no-op today —
  nothing else needed reacting to it.
- P5-05 scope: Option A, not the brief's literal AC. The brief's P5-05 AC
  reads as if the per-document list replaces "Documents attached"/"No
  documents attached" for any deal. It does not — CLAUDE.md's 2026-08-27
  exception narrows the New Deal freeze exemption to content "shown only on
  the external-intake branch," and states the pre-existing three-step path
  "is unaffected and keeps the obligation unchanged." Implemented as: the
  per-document list, statuses, and answers panel render only when
  `intakeStatus != null`; the non-intake path keeps the exact existing
  two-string summary row (same DOM structure, same strings, same classes,
  same position), with the one permitted change being that its value now
  reads from the real documents query (`documents.length > 0`) instead of
  `state.hasUploadedDocument` — the other half of the bug P5-03 fixed.
  Rendering the document list for all deals would require its own CLAUDE.md
  amendment; not made here.
- P5-05 reissue-button 409 risk. The reissue prompt's "Generate a new link"
  button calls the same `createIntakeLink` path as P5-01, which per brief
  §3.2 returns 409 if "a live link already exists." A `submitted` link is
  arguably still "live" until revoked/expired, so reissuing after a bad
  submission may 409 against the real P3-01 once it ships — untestable today
  since P3-01 doesn't exist and the mock store has no 409 branch. Must be
  confirmed against the real endpoint when P3-01 lands; if it does 409 on a
  submitted-but-not-revoked link, the reissue flow needs either an implicit
  revoke-then-create or a distinct backend affordance — flag back to Alpha
  rather than guessing.
- P5-02 share URL composition. The brief never specifies whether the share
  URL (`{origin}/intake/{token}`) is composed client-side or returned
  full-formed by `POST /api/deals/{dealId}/intake-link`. Chose client-side
  composition (`intakeLinkUrl()` in `src/api/intakeLink.ts`, already landed
  under P5-01) — the P3-01 response type only documents `{ token,
  expiresAt }` (brief §3.2), and composing from `window.location.origin`
  avoids needing a backend base-URL config. Revisit if Alpha's actual P3-01
  response returns a full URL instead of a bare token.

- P5-07 shared-type option not taken. Section 2.6 offers two options: add
  `intakeStatus` to `LivePipelineRow` in `src/shared/dealsListPipeline.ts`,
  or use the local overlay pattern already established by `confidential`.
  Used the overlay (`RowWithIntakeStatus` in `DealsTable.tsx`) instead,
  because CLAUDE.md's 2026-08-27 exception explicitly puts `src/shared/`
  "out of scope" of the intake exception, and the `confidential` precedent
  exists specifically to avoid editing that frozen contract ahead of the
  backend. Revisit once P3-06 ships and `intakeStatus` becomes a real field
  on `LivePipelineRow` — the overlay type can then be deleted in favor of
  the real one.

## Blocked on Alpha (do not attempt to fully close until the corresponding PR merges)

- P3-01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15 — none exist yet. Re-check
  `gh pr list` in Simpero_AI_Gov_Alpha before assuming this list is still accurate.
