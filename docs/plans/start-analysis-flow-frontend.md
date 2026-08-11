# Start Analysis → Parse Fan-Out — Frontend Design (Simpero_AI_Gov_Web)

> Companion docs: `start-analysis-flow-alpha.md` (backend implementation, all of it — build that
> first or in parallel) and `start-analysis-flow-services.md` (confirms no changes needed there).
> This doc covers this repo's half only. Design-only — not yet implemented.

## Problem restatement

Step 3 of the New Deal wizard ("Start Analysis") currently POSTs multipart form data to
`/api/simpero/analyse`, which does not exist on the FastAPI backend. Once
`start-analysis-flow-alpha.md`'s `POST /api/deals/{dealId}/analysis` lands, this repo needs to
call it instead — and fix a live bug this repo's own earlier changes this session introduced:
**Step 3 is currently permanently unreachable.**

## Verified findings (file:line)

- `src/pages/NewDealWizard.tsx:250-296` — the dead multipart POST to
  `/api/simpero/analyse?async=1`, sending `document`, `financialModel`, `selectedFrameworks`,
  `dealId`, `conferenceMode`, `fixtureId`.
- **`NewDealWizard.tsx:176-179` — live bug.** The step guard redirects Step 3 back to Step 2
  whenever `state.primaryFile == null`. `set_primary_file` is only ever dispatched from
  `Step2Materials.tsx:173` and `:249` — and Step 2 no longer renders `Step2Materials` at all
  (replaced by `DealDocumentUpload` earlier this session, per the "full replace" decision).
  `primaryFile` is therefore permanently `null` and Step 3 can never be reached today.
- `src/components/deals/DealDocumentUpload.tsx:31,46` — it already has an `onUploaded?: (upload:
  CompletedUpload) => void` prop, **not currently passed** at its mount site
  (`NewDealWizard.tsx:348`ish, the "Upload Files" card on the `upload-files` step).
- `src/pages/newDealWizard/Step2Materials.tsx` — now orphaned. Grep for `Step2Materials` turns up
  only its own file and its (unused) import removal — nothing else references it.
- `src/pages/newDealWizard/Step3Confirm.tsx:14` — `fileCount` is derived from
  `primaryFile`/`financialModelFile`, both permanently `null` now, so the deal summary on Step 3
  currently always reads "0 files uploaded" (moot today since Step 3 is unreachable, but wrong the
  moment the guard is fixed, unless addressed together).
- `src/pages/DealAnalysis.tsx:1127-1136` — the existing polling idiom:
  `useQuery({ queryKey, queryFn, refetchInterval: (q) => terminal ? false : 2000 })`.
  `:1170-1187` — critically, if `jobStatus === "complete"` arrives with no memo session yet, this
  code spins for ~2 minutes waiting for one, then falls through to an empty tab view. This is why
  the backend design (`start-analysis-flow-alpha.md` D14) deliberately never reports a fake
  `"complete"` — this repo's polling code is what would misbehave if it did.
- `src/api/deals.ts:79-96` (`fetchDeal`) and `:11-15`-style thin functions — the house pattern for
  a new API function: `apiFetch`-based, throws `Error` on `!res.ok`, hand-written types.
- `src/shared/dealsStatus.ts:10-18` — `DealStatusPayload`. The backend design maps its new
  `analysis_run` states onto this exact shape without widening the `jobStatus` union — so **this
  file needs no change**.
- `src/pages/newDealWizard/newDealWizardReducer.ts` and `newDealWizardReducer.test.ts:58-70` —
  where `primaryFile`/`financialModelFile` state and their setter actions live, if the deletion
  path (see Open Question below) is taken.

## What changes here, once `POST /api/deals/{dealId}/analysis` exists

1. **`src/api/deals.ts`** — add `startDealAnalysis(dealId: string, body: { selectedFrameworks:
   string[] }): Promise<DealStatusPayload>`, POSTing to `/api/deals/${dealId}/analysis` via
   `apiFetch`, JSON body, same throw-on-`!res.ok` convention as `fetchDeal`. Must let the caller
   distinguish the two 409 cases and the 422 case from the backend contract (either by inspecting
   `res.status` before throwing, or a small typed error like `documents.ts`'s
   `DuplicateUploadError` — match whichever idiom reads better once the exact error-body shape is
   confirmed against the real endpoint).

2. **`src/pages/NewDealWizard.tsx:250-296`** — delete the `FormData` construction (`:251-261`)
   entirely and call `startDealAnalysis(dealId, { selectedFrameworks: state.selectedFrameworks })`
   in its place. Keep the existing 401 branch and the `clearDraft` + `navigate('/analysis/' +
   dealId)` tail unchanged. On the "already running" 409, navigate to `/analysis/${dealId}`
   anyway rather than showing an error — the user's intent (see the analysis) is already
   satisfied by the existing run.

3. **Fix the Step 3 unreachability bug (`NewDealWizard.tsx:176-179`).** Cheapest correct fix:
   thread `DealDocumentUpload`'s already-existing `onUploaded` callback (currently unused) into a
   new, minimal reducer action that tracks "at least one document has been uploaded this session"
   (a count or a boolean — a boolean is enough, nothing here needs the count), and change the
   guard to check that instead of the dead `primaryFile`. The backend's own 422 ("upload at least
   one document") remains the real enforcement; this guard is UX-only, same as it was before.

4. **`Step3Confirm.tsx:14`** — feed `fileCount` from the same new state as (3), instead of the
   dead `primaryFile`/`financialModelFile` reads.

5. **`conferenceMode`/`fixtureId`** — still live in `Step3Confirm.tsx`'s UI and still sent by the
   dead endpoint call being deleted in (2). Whether these survive at all depends on
   `start-analysis-flow-alpha.md`'s Open Question 2 — don't resolve this independently here, wait
   for that answer since it determines whether this is a deletion or a persist-and-send change.

## Open question, deliberately not decided here

**Delete `Step2Materials.tsx`, `DealMaterialsDropzone.tsx`, and the orphaned
`primaryFile`/`financialModelFile` reducer state/actions/tests, or leave them as dead code?**
They're fully orphaned once (3) above lands (nothing will dispatch `set_primary_file`/
`set_financial_model_file` again). This repo's `CLAUDE.md` has a "faithful copy, pixel-identical
until cutover" rule for exactly this kind of surface — deleting a previously Figma-matched
component is a product call, not an engineering one, same reasoning as the earlier "full replace"
decision this session. Flag for Vansh at implementation time rather than defaulting either way.

## Explicitly not in scope for this frontend change

- No polling-loop changes — `DealAnalysis.tsx`'s existing `refetchInterval` idiom already handles
  whatever `jobStatus`/`currentPhase` the new backend states map to (see Verified Findings above).
- No new UI for parse-level detail (per-document status, `ocr_needed` messaging beyond what
  `DealDocumentUpload`/`useUploadDocument` already render) — that's the upload-time status this
  repo already built this session, separate from the analysis-run status this doc covers.
- No changes to `src/shared/dealsStatus.ts` or the shared rendering contract it feeds.
