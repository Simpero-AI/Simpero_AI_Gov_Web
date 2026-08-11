# Deal Document Upload — Frontend Implementation Plan

> Plan for the presigned-URL direct-to-DigitalOcean-Spaces document upload flow.
> Backend contract (already finalized, not re-derived here): `POST /api/uploads/presigned-url`,
> raw `PUT <presigned_url>`, `POST /api/uploads/{upload_id}/complete`. This is a **new**
> upload surface, separate from the existing wizard multipart upload
> (`Step2Materials.tsx` → `POST /api/simpero/analyse`), which is untouched by this plan.

## Problem restatement

Build the frontend half of a three-call upload flow (presign → direct PUT to object storage →
complete) for attaching a document to an existing deal, with client-side size/type validation
and a client-computed SHA-256 (for server-side dedupe) both happening before any network call,
and a bounded decision on how the UI reflects the backend's async post-upload verification status.

## Verified findings (file:line)

- **Fetch boundary**: `src/api/http.ts:21-33` — `apiFetch(path, init)` prefixes `API_BASE_URL`,
  attaches the Clerk bearer token, `credentials: "include"`. All new calls go through this,
  mirroring `src/api/deals.ts:11-15` (thin async function, throws `Error` on `!res.ok`).
- **Polling idiom already established**: `src/pages/DealAnalysis.tsx:1127-1136` —
  `useQuery({ queryKey, queryFn, refetchInterval: (q) => <terminal ? false : 2000> })`, stopping
  immediately on terminal states, plus a `useRef`-tracked prev-status effect (`:1144-1149`) that
  invalidates a *different* query when a terminal transition is observed. This is the exact
  shape to reuse **if/when** a status-polling endpoint exists (it doesn't yet — see Open Questions).
- **Mutation + toast idiom**: `src/admin/hooks/useInvitations.ts:19-32` — `useMutation` owns
  `onSuccess` (invalidate + `toast.success`) and `onError` (`toast.error(error.message)`). New
  hooks follow this, not ad-hoc toasting in components.
- **Existing upload UI is a different flow**: `src/components/mvp/wizard/DealMaterialsDropzone.tsx`
  (react-dropzone, 100MB ceiling, PDF/DOCX/PPTX/XLSX) feeds `Step2Materials.tsx`, which holds
  `File` objects in wizard state until final multipart submit in `NewDealWizard.tsx:222` (`fd.append`).
  That endpoint (`/api/simpero/analyse`) is what kicks off the analysis pipeline and is **not**
  being replaced or touched here. `react-dropzone@15` is already a dependency — reusable for the
  new dropzone without adding anything.
- **No existing per-deal document list/tab**: `DealAnalysis.tsx:1214-1230` (no-job empty state)
  and `:1231-1249` (error state) both link to `/upload?dealId=` (the wizard) — there's no
  "Documents" tab or list view today. `ANALYSIS_TABS` (`DealAnalysis.tsx:418-428`) is an
  explicitly "Figma-matched 9-tab view" (Summary/Scorecard/Company/Financials/Founders/Cap
  Table/Market/Risks/Valuation) — adding a 10th tab is a product/design decision, not an
  architecture one. **Mount point is an open question (see below), not a locked decision.**
- **Test environment**: `vitest.config.ts:22-26` — `src/shared/**` tests run in `node`, everything
  else under `src/` runs in `jsdom` (jsdom 29, `package.json:94`). Needs verification (see Risks):
  jsdom's global `crypto` does not reliably implement `SubtleCrypto.digest` in all versions —
  the SHA-256 util's test may need to force the `node` environment via a per-file
  `// @vitest-environment node` docblock rather than relying on the default jsdom glob.

## Architectural decisions

1. **Hashing runs on the main thread, not a Web Worker.** `crypto.subtle.digest` is itself
   asynchronous and does not block the JS event loop; the only main-thread cost is
   `file.arrayBuffer()`, which is I/O-bound and, at a 10MB ceiling, sub-100ms in practice. A
   Web Worker adds a new file, message-passing/error-marshalling across the worker boundary, and
   a build-config concern, for no measurable UX win at this size. `# ponytail: main-thread hash,
   fine up to ~10MB — if the size ceiling grows an order of magnitude or hashing visibly jank the
   UI, move sha256Hex() into a Web Worker without changing its call signature.`
2. **No upload progress bar in v1.** `fetch()` has no upload-progress event; getting one requires
   `XMLHttpRequest` instead. Nobody asked for a progress bar and a 10MB PUT over any reasonable
   connection completes in a few seconds — an indeterminate "Uploading…" state is enough.
   `# ponytail: skipped XHR-based progress, add if product wants a determinate bar for larger
   ceilings later.`
3. **Single `useMutation` orchestrates all four steps** (validate → hash → presign → PUT →
   complete) inside one pure, non-React pipeline function, not a hand-rolled state machine/reducer.
   The pipeline throws a small discriminated error type so the UI can distinguish the 409 dedupe
   case from other failures without a bespoke phase-tracking abstraction. No per-phase UI text
   ("Hashing…", "Requesting URL…") — not requested, and `mutation.isPending` alone is enough for
   a fire-and-forget button/dropzone.
4. **No automatic retry on PUT failure (including presigned-URL expiry).** If the PUT fails —
   expired signature, network blip — surface an error toast and let the user re-invoke the upload,
   which naturally re-runs the whole pipeline (fresh presigned URL, same deterministic hash, so
   dedupe still works correctly on retry). Silent auto-retry would add complexity and a real risk
   of duplicate in-flight requests for one edge case that self-heals via a manual retry anyway.
5. **Client-side allowlist mirrors the wizard's existing document types** (PDF/DOC/DOCX/PPT/PPTX/
   XLS/XLS) as a starting default, not a new list invented from scratch — but this needs explicit
   product confirmation since the backend's own server-side allowlist is the actual source of
   truth and any drift between the two defeats the whole point of the fast-fail client check
   (accepted-by-FE-then-rejected-by-BE = the wasted round trip this feature exists to avoid). Flagged
   in Open Questions, not assumed silently.
6. **v1 async-status handling: no client polling loop.** The `/complete` response's `status:
   "pending"` is shown once (toast/badge) and the UI does not invent a polling target, because no
   `GET` endpoint for a single upload/document currently exists in the contract. See Open
   Questions for the concrete, minimal backend ask to unlock real-time status later, modeled
   directly on the `dealStatusQueryKey`/`refetchInterval` idiom already proven in this repo.
7. **Mount point (which page/tab hosts the upload control) is intentionally left open** — the
   hook and component are built to be mountable anywhere a `dealId` is available (button, dropzone,
   modal), so building them isn't blocked on a product decision about `ANALYSIS_TABS`.

## API contract (verbatim, do not re-derive)

- `POST /api/uploads/presigned-url` — body `{ deal_id, filename, size, declared_sha256 }`.
  - `200` → `{ upload_id, presigned_url, storage_key }`
  - `409` → dedupe: this exact file (by hash) already uploaded for this deal — show a distinct message
  - other `4xx` → rejection reason (type/size) — show the server's message
- `PUT <presigned_url>` — raw file bytes, direct to object storage, **no** `apiFetch`, **no** auth
  header. Must happen immediately after presign — **the URL expires in 10 minutes.**
- `POST /api/uploads/{upload_id}/complete` — body `{ deal_id, filename, declared_sha256 }`
  (identical values already used in step 1). Response: `{ id, status }`, `status` starts `"pending"`.

> Field names are snake_case as given (`deal_id`, `declared_sha256`, `upload_id`, `storage_key`),
> unlike this repo's other endpoints which use camelCase (backend `CamelModel` — see `deals.ts`,
> admin plan). Treated as correct/final per instruction, not normalized — flagged once in Open
> Questions in case it's an oversight on the backend side, not enforced or "fixed" here.
> Path prefix assumed to be `/api/uploads/...` (matching this repo's `/api/deals/...`,
> `/api/admin/...` convention) — **verify against the actual backend router mount** before wiring;
> the backend contract as given omits the `/api` prefix.

## File-level plan (build in this order)

1. **`src/lib/fileValidation.ts`** — pure function, no deps.
   `validateUploadFile(file: File, opts?: { maxBytes?: number; allowedExtensions?: string[] })
   → { ok: true } | { ok: false; reason: string }`. Default `maxBytes = 10 * 1024 * 1024`,
   default extension list per decision 5. No React, no fetch — trivially unit-testable.
2. **`src/lib/sha256.ts`** — pure function, no deps.
   `sha256Hex(file: File): Promise<string>` — `await file.arrayBuffer()` →
   `crypto.subtle.digest("SHA-256", buf)` → hex-encode. One `# ponytail:` comment per decision 1.
3. **`src/api/documents.ts`** — mirrors `src/api/deals.ts` exactly: hand-written types
   (`PresignedUploadRequest`, `PresignedUploadResponse`, `CompleteUploadRequest`,
   `CompletedUpload`) + two thin `apiFetch`-based functions (`requestPresignedUpload`,
   `completeUpload`), each throwing a typed error distinguishing the 409 case (e.g. throw a
   `DuplicateUploadError` subclass on 409, `Error` otherwise) so the pipeline doesn't need to
   inspect status codes itself.
4. **`src/lib/documentUploadPipeline.ts`** — the only file that sequences steps 1-3.
   `runDocumentUpload(dealId: string, file: File): Promise<CompletedUpload>`:
   validate → throw on failure → hash → `requestPresignedUpload` → raw `fetch(presigned_url,
   { method: "PUT", body: file })` (not `apiFetch` — no base URL prefix, no auth header) → throw
   a plain `Error` on non-2xx → `completeUpload`. Pure/testable with mocked `documents.ts` fns
   and a mocked global `fetch` for the PUT.
5. **`src/hooks/useUploadDocument.ts`** — `useMutation<CompletedUpload, Error, File>` wrapping
   `runDocumentUpload(dealId, file)`, following `useInvitations.ts`'s convention:
   `onSuccess` → `toast.success("Document uploaded — verification pending")` (+ invalidate
   whatever query lists deal documents, once one exists); `onError` → branch on
   `error instanceof DuplicateUploadError` for a distinct "already uploaded" toast, else
   `toast.error(error.message)`.
6. **UI component** (name/location depends on the mount-point decision — see Open Questions):
   a small dropzone or button using `useUploadDocument`, following `DealMaterialsDropzone.tsx`'s
   visual idiom (react-dropzone, primitives, `toast` from `@/components/mvp/primitives/sonner`)
   but single-file, not the wizard's dual-slot primary/financial-model layout.
7. **Mount into the chosen location** — last, and only once Open Question 1 is answered.

## Risks and open questions

1. **Mount point is undecided** (see decision 7 / verified findings). Recommend either (a) a new
   "Documents" tab appended to `ANALYSIS_TABS` in `DealAnalysis.tsx`, or (b) a separate
   `/deals/:dealId/documents` route/page, kept off the Figma-matched tab bar entirely. This is a
   product call for Vansh, not an engineering one — don't let the implementer default-decide it.
2. **Client allowlist vs. backend allowlist drift** (decision 5) — needs the exact accepted MIME/
   extension list confirmed against what the backend actually enforces server-side, or the
   fast-fail client check will sometimes accept what the backend rejects (defeats the feature's
   purpose). Same class of problem as this repo's own `claims.schema.json` dual-copy risk noted
   in the backend `CLAUDE.md` — no shared source of truth today.
3. **No status-polling endpoint exists yet.** Minimal backend ask to unlock it later (draft to
   hand to a `Simpero_AI_Gov_Alpha` session, per this repo's CLAUDE.md cross-repo rule): add
   `GET /api/uploads/{upload_id}` returning `{ id, status, filename, ... }`, mirroring the
   existing `GET /api/deals/{dealId}/status` shape/idiom exactly, so the frontend can reuse the
   proven `refetchInterval` pattern (`DealAnalysis.tsx:1127-1136`) — poll every ~2s while
   `status === "pending"`, stop on `verified`/`quarantined`/`mismatch`. Not required to ship v1.
4. **jsdom + `crypto.subtle` needs a quick spike.** `sha256.ts`'s test may not get real
   `SubtleCrypto` under jsdom 29's default glob; if not, force `// @vitest-environment node` on
   that one test file (Node's own `globalThis.crypto.subtle` is real) rather than reaching for a
   polyfill dependency.
5. **snake_case field names** in this contract are inconsistent with the rest of the app's
   camelCase wire format — flagged once above, treated as authoritative per instruction, not
   "corrected."
6. **Path prefix** (`/api/uploads/...` assumed) needs a one-line confirmation against the actual
   backend router before wiring `src/api/documents.ts`.

## Handoff instructions for implementer

- Build strictly in the file order above; steps 1-5 have zero UI dependency and can be fully unit
  tested (mock `fetch`/`documents.ts`) before any component exists.
- Do not touch `Step2Materials.tsx`, `DealMaterialsDropzone.tsx`, `NewDealWizard.tsx`, or
  `/api/simpero/analyse` — that flow is unrelated and unaffected.
- Do not add a Web Worker, an upload progress bar, a retry-loop, or a polling loop — all four are
  explicit v1 non-goals per the decisions above, not oversights.
- Stop before step 7 (mounting the UI) and get the mount-point decision (Open Question 1)
  confirmed rather than guessing a location inside `DealAnalysis.tsx`.
- Every new fetch call goes through `apiFetch` from `@/api/http` **except** the raw `PUT` to the
  presigned URL, which must be a bare `fetch()` — no base-URL prefix, no bearer token, no
  `credentials: "include"` (the signed URL carries its own auth).
- Toasts and query invalidation live in the hook (`useUploadDocument.ts`), not the component —
  matches `useInvitations.ts`.
