# API inventory — what the frontend needs from the FastAPI backend

> Every API this frontend actually calls, derived by grepping the live call sites in
> `src/` and reading the authoritative contracts in the monorepo's `server/routers.ts`
> and `server/apiRoutes.ts` at the split SHA
> (`simpero_GOV_AI @ 4cdfe5ce1c382febf777e5289ee2e209d0c4479f`).
> This is the requirements list for `Simpero_AI_Gov_Alpha` (BE-3…BE-5) and the
> source for prioritising the FE-7 call-site migration.
>
> **Surface: 4 REST endpoints + 41 tRPC procedures across 14 routers.**
> Exact response shapes: `src/api/_legacy/server/routers.d.ts` (frozen snapshot) is
> the authoritative type reference — it was generated from the same SHA.

## Conventions the backend must map

| Monorepo concept | FastAPI equivalent |
|---|---|
| `publicProcedure` | No auth required |
| `protectedProcedure` | Clerk JWT required (401 without) |
| `adminProcedure` | Clerk JWT + `role === "admin"` (403 otherwise) |
| tRPC `query` / `mutation` | GET / POST (suggested; final paths are the backend's call) |
| `TRPCError` codes | `BAD_REQUEST`→400, `UNAUTHORIZED`→401, `FORBIDDEN`→403, `NOT_FOUND`→404, `PRECONDITION_FAILED`→412, `TOO_MANY_REQUESTS`→429 |
| superjson wire format | Plain JSON — `Date` values must become ISO-8601 strings (frontend already formats from strings in most places; verify per screen during FE-7) |

Two cross-cutting behaviors to preserve:

1. **Audit log side effects** — most mutations append to `audit_log`
   (`memo_deleted`, `history_cleared`, `attestation_submitted`, `share_link_created`,
   `flag_feedback_submitted`, `memo_rescored`, `memo_deliverable_regenerated`,
   `memo_composer_regenerated`, `export_*`, `pdf_exported`, `auth_sign_out`,
   `analysis_job_queued`). This is a compliance product; the trail is a feature,
   not incidental logging — `audit.listForSession` and `logs.*` render it.
2. **Per-session regeneration mutex** — `memo.regenerateDeliverable`, `memo.rescore`,
   and `memo.regenerateComposer` serialise on `sessionId`; a concurrent call gets
   429. The UI relies on this to show "regeneration already in progress".

---

## REST endpoints (already migrated to `apiFetch` — first to build)

### `POST /api/simpero/analyse?async=1` — start document analysis
- Auth: Clerk JWT (401 without a resolvable user).
- Multipart form: `document` (required file: PDF/DOCX/PPTX), `financialModel`
  (optional XLSX), `dealId` (required positive int; deal must be owned by caller —
  404 otherwise), `selectedFrameworks` (optional JSON array string of framework ids),
  `conferenceMode` (optional `"true"` → skip pipeline, serve fixture), `fixtureId`
  (optional, default `"novaspark"`).
- Response `202`: `{ async: true, jobId, sessionId, pollUrl }`.
- Caller: `pages/NewDealWizard.tsx`. Progress is then polled via `deals.status`
  (tRPC), **not** via `pollUrl` — see "unused endpoints" below.

### `POST /api/simpero/export-pdf` — render IC memo PDF
- Body: full `ICMemoResult` JSON (must have `sections` + `sessionId`; up to 10 MB —
  raise the body limit for this route).
- Response: `application/pdf` attachment
  (`Simpero_IC_Memo_<stem>_<YYYY-MM-DD>.pdf`); appends `pdf_exported` audit row.
- Caller: `pages/MemoViewer.tsx`.

### `POST /api/simpero/verify` — verify pasted AI output against a source doc
- Multipart: `document` (required file) + `aiText` (or `text`, min 20 chars).
- Response: compliance report JSON (`verifyAIOutput` in `server/aiOutputVerify.ts`).
- Caller: `pages/VerifyOutput.tsx`.

### `GET /api/simpero/sec-search?q=<query>` — SEC EDGAR full-text search proxy
- Query: `q` (min 2 chars), optional `forms` (default `10-K,10-Q,8-K,S-1,S-1/A,DEF 14A,20-F`),
  optional `startdt`. Proxies `efts.sec.gov` with the required custom User-Agent.
- Response: `{ total, results: [{ company: string[], fileType, periodEnding, description }] }` (max 10).
- Callers: `CitationSidebar.tsx`, `pages/MemoViewer.tsx`.

**Monorepo REST endpoints NOT used by this frontend:** `GET /analyse-job/:jobId`
(frontend polls `deals.status` instead), `POST /analyze` (spelling alias),
`GET /diagnostics`. Build only if the backend wants them for its own reasons.

---

## tRPC procedures (migrated screen-by-screen in FE-7)

Kind: Q = query, M = mutation. Auth: pub / user / admin (see mapping table above).

### `auth` — `_core/hooks/useAuth.ts` (used on every page)
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `auth.me` | Q | pub | — | Current user row or `null`. The app's session probe. |
| `auth.syncProfile` | M | user | `{ name: string\|null, email: string\|null }` | Upserts name/email from Clerk's `useUser()` (the JWT has no profile claims). `{ success: true }` |
| `auth.logout` | M | pub | — | Clears legacy session cookie, audits `auth_sign_out`. With pure Clerk auth this may reduce to just the audit row. |

### `deals` — Dashboard, NewDealWizard, DealAnalysis, MemoDeliverable
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `deals.create` | M | user | `{ name, gpSource, dealSizeMinUsd?, dealSizeMaxUsd?, sectorTags[] }` | `{ dealId }` |
| `deals.get` | Q | user | `{ dealId }` | `DealWithLatestMemo` = `{ deal, latestMemoSession }` (memo JSON string inside). 404 if not owned. |
| `deals.status` | Q | user | `{ dealId }` | `{ jobStatus, currentPhase, steps }` (`computeStepStatuses`, `src/shared/pipelineSteps.ts`). **Polled during analysis** — this is the progress API. |
| `deals.listPipeline` | Q | user | — | Pipeline rows for dashboard + `AnalysisRedirect`. |
| `deals.dashboardStats` | Q | user | — | Aggregates for dashboard KPIs (`computeDashboardStats`). |
| `deals.advanceState` | M | user | `{ dealId, nextState }` (`dealsLifecycle` STATE_ORDER) | `{ ok: true }` |
| `deals.getRawChunks` | Q | admin | `{ sessionId }` | Document chunks; verifies session ownership. (ParserVerificationTab) |

### `history` — History, MemoViewer, MemoDeliverable
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `history.list` | Q | user | — | Memo session summaries (no full JSON). |
| `history.get` | Q | user | `{ sessionId }` | `{ memo: ICMemoResult, dealId } \| null` |
| `history.delete` | M | user | `{ sessionId }` | `{ success: true }` + audit |
| `history.clearAll` | M | user | — | `{ success: true, deletedCount }` + audit |

### `memo` — MemoViewer, MemoDeliverable, ScorecardTab (LLM-invoking, 10–60 s)
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `memo.regenerateSection` | M | user | `{ sessionId, sectionKey, sectionTitle, chunks[] (≤100), customPrompt? (≤500) }` | Regenerated `MemoSection` + `reVerification: { matched, unmatched, total, rate }`. Falls back to a draft scaffold rather than erroring. |
| `memo.regenerateDeliverable` | M | user | `{ sessionId }` | `{ ok, deliverable }`. Re-runs all Pass-3 composers. Mutex → 429. |
| `memo.rescore` | M | user | `{ sessionId }` | `{ ok, scoringResult }`. 412 when no profile / no framework categories / no deliverable. Mutex → 429. |
| `memo.regenerateComposer` | M | user | `{ sessionId, composeKey, steering? (≤2000) }` | `{ ok, deliverable }`. Wave-1 regen stamps `stale: true` on exec-summary + IC-recommendation fields; wave-2 clears its own. Mutex → 429. |

### `investmentProfile` — MandateScorecard, Dashboard, ScorecardTab, mandate blocks
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `investmentProfile.get` | Q | user | — | Profile or `null` (null = Pass-4 skipped on upload; UI shows empty states). |
| `investmentProfile.upsert` | M | user | `{ firmName?, firmType?, aumBand?, mandate?, weights? }` — enums + `MandateInputSchema`/`WeightsInputSchema` (`server/investmentProfileSchemas.ts`) | Returns the updated profile. |

### `attestation` + `brokercheck` — AttestationModal, MemoViewer, SharedMemo
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `attestation.submit` | M | user | `{ sessionId, principalName (2–255), crdNumber (1–32), firmName? }` | `{ success, attestedAt, validUntil (+90d), attestationText }` — text cites SEC 206(4)-7 / FINRA 3110(b)(2). |
| `attestation.get` | Q | pub | `{ sessionId }` | Attestation or `null`. Public because SharedMemo renders it. |
| `brokercheck.validateCrd` | Q | pub | `{ crdNumber }` | Proxies FINRA BrokerCheck (5 s timeout). `{ valid, name, firm, status, error }` — never throws, errors in-band. |

### `share` — MemoViewer, SharedMemo
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `share.create` | M | user | `{ sessionId, memoJson, fileName }` | `{ token (nanoid 32), expiresAt (+24h) }` |
| `share.get` | Q | pub | `{ token }` | `{ memo, fileName, expiresAt, viewCount } \| null` (null on expired/unknown — UI shows "link expired"). |

### `flagFeedback` — MemoViewer, MethodologyDashboard
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `flagFeedback.submit` | M | user | `{ sessionId, flagCategory, flagSeverity: H\|M\|L, action: accept\|dismiss, justification? }` | `{ success: true }` — the methodology flywheel. |
| `flagFeedback.getForSession` | Q | user | `{ sessionId }` | Feedback rows (restores accepted/dismissed UI state). Verifies session ownership. |
| `flagFeedback.stats` | Q | admin | — | Accept/dismiss counts per category. |

### `audit` + `logs` — MemoViewer, LogsPanel, Dashboard
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `audit.listForSession` | Q | user | `{ sessionId }` | Audit rows for a memo (owner only). |
| `audit.logClientExport` | M | user | `{ sessionId, exportKind: simpero_offline\|model_card_stub\|diligence_issues_csv\|diligence_issues_json\|audit_log_json, downloadFileName? }` | Records browser-side blob downloads. |
| `logs.auditTrail` | Q | user | `{ dealId }` | Audit rows for a deal (ownership-checked). |
| `logs.jobActivity` | Q | user | `{ dealId }` | Most recent analysis job for the deal. |
| `logs.recentActivity` | Q | user | `{ limit (1–100, default 20) }` | `{ total, warnings, critical, rows[] }` — rows have ISO `createdAt`. |

### `productUsage` + `methodology` — admin dashboards (ProductUsage, MethodologyDashboard)
| Procedure | Kind | Auth | Input | Returns / notes |
|---|---|---|---|---|
| `productUsage.recentAsyncJobs` | Q | admin | `{ limit (1–100, default 40) }` | Completed jobs with LLM usage rollups. |
| `productUsage.llmEventsForJob` | Q | admin | `{ jobId }` | Per-call LLM usage rows. |
| `productUsage.sessionRollup` | Q | admin | `{ sessionId }` | Aggregated usage for a session. |
| `productUsage.masterSummary` | Q | admin | — | Org-wide token report row. |
| `productUsage.regenerateMasterSummary` | M | admin | — | Recomputes + returns master summary. |
| `methodology.list` | Q | admin | — | `{ pass1[], pass3[] }` — JSON-safe projections of the prompt registries. |
| `methodology.composerStats` | Q | admin | — | Per-composer regen count + last-used. |

---

## Defined in the monorepo but NOT called by this frontend

Not needed for cutover parity — deprioritise or skip:

- `system.health`, `system.notifyOwner`
- `analysis.getSession` / `createSession` / `updateSession` (legacy session table)
- `finance.getPublicComps`, `finance.getBenchmarkContext` (Yahoo comps / static SaaS benchmarks — no live call site)
- `memo.patchDeliverable` (manual field edit — no live call site)
- `ai.chat` appears only in JSDoc comments (`AIChatBox.tsx`, `ComponentShowcase.tsx`); no such router exists server-side.

## Suggested build order (mirrors user impact)

1. **Auth + read path**: `auth.me`, `auth.syncProfile`, `deals.get/listPipeline/dashboardStats/status`, `history.list/get`, `investmentProfile.get` — makes Dashboard, History, DealAnalysis, MemoDeliverable render.
2. **Core write path**: `POST /analyse`, `deals.create`, `investmentProfile.upsert` — makes the upload → memo flow work end to end.
3. **Memo actions**: `memo.*`, `share.*`, `attestation.*`, `brokercheck.validateCrd`, `flagFeedback.submit/getForSession`, `audit.*`, `/export-pdf`, `/sec-search`, `/verify`.
4. **Admin**: `productUsage.*`, `methodology.*`, `flagFeedback.stats`, `deals.getRawChunks`, `logs.*` (logs earlier if LogsPanel matters sooner).
