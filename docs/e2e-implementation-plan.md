# End-to-end flow implementation plan

> Goal: make **sign in → create deal → upload/analyse → poll progress → view memo**
> functional across `Simpero_AI_Gov_Alpha` (FastAPI backend) and `Simpero_AI_Gov_Web`
> (React frontend), fixture-first. Derived from the backend audit (2026-07-18) against
> `docs/api-inventory.md`. Status at planning time: backend has 2 of 45 required
> surfaces implemented (`GET /auth/me`, `POST /auth/sync-profile`); frontend has ~66
> tRPC call sites across 22 files still to migrate to `apiFetch`.

## Locked decisions

1. **Pipeline scope: fixture-first.** The real parse/LLM pipeline (Docling,
   `Simpero_Gov_AI_Services`, G1 bake-off) is a separate tracked effort. Phase 2
   ships the `conferenceMode`/`fixtureId` branch only.
2. **Deal/session IDs are UUID** (`gen_random_uuid()` PKs). Frontend integer-`dealId`
   validation flips to opaque strings during call-site migration (touch points below).
3. **DDL role is `doadmin`**; runtime role is `dd_app` (as the repo already uses).
4. **FE transport: hand-written `apiFetch` fetchers per screen** (the
   `useAuth`/`useProfileSync` pattern), typed against the frozen
   `src/api/_legacy/server/routers.d.ts`. No orval/FE-6 gating; codegen may be
   adopted later once the API surface is stable.
5. **JSON structures stored as native JSONB.** Where the frozen frontend contract
   expects a stringified value (`sector_tags` via `parseSectorTags`, memo JSON inside
   `latestMemoSession`), the response layer serializes per-screen to match — verified
   against `routers.d.ts` during each screen migration.
6. **Org scoping: integer `org_id` FK to the existing `organisation.id` serial PK.**
   No PK/type migration of `organisation`/`users`/`funds` — additive columns are
   allowed (e.g. `funds.strategy`, added per Vansh's fund model 2026-07-18). Only
   new-entity PKs are UUID.
7. **All DB access through repository classes** (`app/repo/`, extending
   `BaseRepo.py`). App logic never calls SQLAlchemy directly. Existing auth-code
   violations are refactored in Phase 1.
8. **`contracts/claims.schema.json` is normative** for the claim shape (owned by the
   parse-service repo, pinned by the backend). Never restated here.

## Cross-cutting backend rules (every phase)

- **Build order per resource:** model in `app/models/` → import in
  `app/models/__init__.py` → Alembic migration as `doadmin` **including the RLS
  policy in the same revision** → Pydantic schema → router using `Depends(get_db)` →
  register in `app/main.py`.
- **Tenancy:** every new table carries `org_id INTEGER FK → organisation.id` with the
  `funds`-style RLS policy
  (`org_id IN (SELECT id FROM organisation WHERE clerk_org_id = current_setting('app.org_id', true))`).
  No `WHERE org_id = …` in app code — RLS only. Ownership 404s fall out of RLS
  returning no row, not manual checks.
- **Immutability is a DB guarantee:** audit tables get
  `REVOKE UPDATE, DELETE FROM dd_app` in their migration, never app-level enforcement.
- **Audit side effects:** every mutation appends its event (`memo_deleted`,
  `export_*`, `auth_sign_out`, `analysis_job_queued`, …) via the append-only
  repository — the trail is a product feature.
- **Conventions:** USD = integer cents, percents = basis points, dates = ISO-8601
  strings on the wire (no superjson).

---

## Status ledger

| Phase | Status | Notes |
|---|---|---|
| Phase 0 | ✅ **Done** (2026-07-18, uncommitted in Alpha) | See below |
| Phase 1 | ✅ **Done + cross-checked** (2026-07-19, uncommitted both repos) | Backend: migrations `dd80cdfaeb9a` (`sessions`) + `fb49da6a9bc0` (`investment_profiles`), 10 endpoints, UserRepo auth refactor, pytest 49 passed. Frontend: `src/api/{deals,history,investmentProfile}.ts` fetchers; Dashboard/History/DealAnalysis/AnalysisRedirect/profile-readers migrated; 167 tests, lint clean. Cross-half shape check passed after two fixes: ALL endpoints (auth included) now mount under `/api` (matches vite proxy + prod ingress), and history/deals fetcher types corrected to the real wire shapes. Known intentional gaps: investmentProfile writes still tRPC (Phase 2); LogsPanel/ScorecardTab carry a `Number(dealId)` shim until Phase 3. Pulled forward from Phase 3 (2026-07-19): `GET /api/logs/recent-activity` from `human_audit_log` + Dashboard's Recent Activity panel — Dashboard is now fully off tRPC. |
| Phase 2–4 | Not started | |

**Phase 0 delivered:** migrations `7175bc85ffb0` (`human_audit_log`: RLS +
`FORCE ROW LEVEL SECURITY` per v1.3 §5.4 + `REVOKE UPDATE, DELETE FROM dd_app`) → `2f9ca0724bb9` (`deals`: UUID PK, int
`org_id` FK, nullable `fund_id` FK, `gp_source`, cents deal sizes, `sector_tags`
jsonb, `status`) → `418dc290d913` (`funds.strategy`, nullable additive) →
`b26e963e0645` (`ai_audit_log`: table only, OD-1 columns, FORCE RLS + REVOKE;
writer arrives with the real pipeline).
Models `app/models/{human_audit_log,deal,ai_audit_log}.py` + `Funds.strategy`;
repos `HumanAuditRepo` (append-only) + `DealRepo`; 8 new immutability/RLS tests.
Verified on local dev Postgres: clean upgrade/downgrade roundtrip, pyright 0
errors, pytest 36 passed, ruff clean. Also fixed a pre-existing `conftest.py`
bug (`SET LOCAL` can't take bind params → `set_config()`). Known cleanup for a
later phase: `BaseRepo.get_by_id` is typed `id: int`, so UUID repos widen to
`object` — wants a generic-typing fix.

---

## Phase 0 — Foundations (backend only)

Blocks everything with a side effect or ownership check.

**1. `human_audit_log`** — every human action.
Columns: `id` (UUID PK), `org_id` (int FK), `actor_id`, `actor_email` (denormalized
for audit stability), `event_type`, `deal_id`/`session_id` (nullable UUID),
`payload` (jsonb), `ip_address`, `user_agent`, `created_at`.
Migration: RLS + `REVOKE UPDATE, DELETE FROM dd_app`.
Sole write path: `HumanAuditRepository.append()` (INSERT-only).
Backs `audit.*`/`logs.*` and all mutation side effects.

**2. `deals`** — UUID PK, `org_id` int FK, `fund_id` (nullable FK → funds; the
create contract has no fund field yet), `name`, `gp_source`,
`deal_size_min_usd`/`deal_size_max_usd` (int cents, nullable), `sector_tags`
(jsonb), lifecycle `status` (`dealsLifecycle` STATE_ORDER values). RLS policy.
`DealRepository`. Deliverables are NOT a separate table — they live inside the
`ICMemoResult` JSONB on `sessions` (decided 2026-07-18).

**3. `ai_audit_log`** — table only, no writer yet (Vansh's call 2026-07-18,
reversing the earlier deferral). OD-1 Option A columns (hashes + references
only — no prompt text, thinking, or raw tool inputs, ever), UUID PK, int
`org_id` FK, nullable `fund_id` FK, RLS + FORCE RLS + REVOKE UPDATE/DELETE.
The LLM base wrapper that writes to it arrives with the real-pipeline effort.

**Verify:** migrations apply clean from scratch; test that `dd_app` can
INSERT/SELECT `human_audit_log` but UPDATE/DELETE is denied (alongside
`tests/test_security.py`); RLS org-isolation test for `deals`.

---

## Phase 1 — Auth completion + read path

**Backend**
- `sessions` table: UUID PK, `org_id` int FK, `deal_id` FK, `ICMemoResult` as
  jsonb, timestamps. RLS. `SessionRepository`. (Built here because `deals.get`'s
  `latestMemoSession` and `history.*` both need it.)
- `deals` router: `listPipeline`, `dashboardStats`, `get` (→ `DealWithLatestMemo`,
  404 via RLS), `status` (returns `queued`/null phase until Phase 2 adds the job
  model).
- `history` router: `list` (summaries, no full JSON), `get`
  (`{ memo, dealId } | null`).
- `investmentProfile.get` (+ its table; returns profile or `null` — null keeps the
  UI's empty states). Alpha builds only this contract-shaped per-org table — the
  catalog's per-fund `investment_frameworks`/`workflow_stage_configs` are deferred
  (decided 2026-07-18: only what alpha needs).
- `sessions` — SLIM shape (decided 2026-07-19): `id` UUID PK (= the API's
  sessionId), int `org_id` FK, `user_id`, `deal_id` UUID FK, `file_name`,
  `memo_json` jsonb (full `ICMemoResult`, deliverables inside, nullable until the
  job completes), `composed_at`, `created_at`. The legacy denormalized summary
  stats (claims counts, match_rate, verdict/score, page_count,
  selected_frameworks) are computed from `memo_json` at read time — fine at
  ≤50 analyses/mo; re-denormalize if History gets slow.
- `auth.logout` → just an `auth_sign_out` row via `HumanAuditRepository`.
- **Refactor fold-in:** add `get_by_clerk_id`/upsert to `app/repo/UserRepo.py` and
  route `app/api/auth.py` (`select(Users)` at line 22) and
  `app/core/dependencies.py::_ensure_user_provisioned` through it — kills the
  direct-SQLAlchemy exception while this router is open anyway.
- Response layer serializes jsonb → frozen shapes (`sector_tags` as JSON string,
  memo as string inside `latestMemoSession`) per `routers.d.ts`.

**Frontend — migrate to hand-written `apiFetch` fetchers**
- `src/pages/Dashboard.tsx` (`listPipeline`, `dashboardStats`)
- `src/pages/History.tsx` (`history.list/get/delete/clearAll` — reads now, deletes
  can land with them)
- `src/pages/DealAnalysis.tsx` read queries
- `src/pages/AnalysisRedirect.tsx`
- `MandateScorecard.tsx` / `FirmProfileBlock.tsx` / `MvpFundSelector.tsx`
  (`investmentProfile.get`)

**Verify:** Dashboard, History, and DealAnalysis (not-yet-analysed state) render
against a seeded deal. `pnpm check` green.

---

## Phase 2 — Core write path (the milestone)

**Backend**
- `deals.create` → `{ dealId }` (UUID), `investmentProfile.upsert`,
  `deals.advanceState`.
- Analysis-job model (UUID PK, `deal_id`/`session_id` FKs, `jobStatus`, `phase`).
  `AnalysisJobRepository`.
- `POST /api/simpero/analyse?async=1` → `202 { async, jobId, sessionId, pollUrl }`.
  Multipart per the inventory; validates deal visibility via RLS. Creates session +
  job rows, appends `analysis_job_queued` audit row. **Fixture branch only**: serves
  the `conferenceMode`/`fixtureId` path the frontend already sends
  (`fixtureId="novaspark"` default; shape reference
  `src/shared/e2eUxMemoFixture.ts`).
- SAQ worker task (queue backend: Valkey) in `app/jobs/tasks/` that walks the job's `phase` through the
  `AnalysisJobPhase` union (`src/shared/pipelineSteps.ts`) so the progress UI
  animates, then writes the fixture `ICMemoResult` to the session row.
- `deals.status` now reports real `{ jobStatus, currentPhase, steps }` via
  `computeStepStatuses`.
- Leave `parse_client.py` untouched (dead scaffolding for the real pipeline).

**Frontend**
- `src/pages/NewDealWizard.tsx`: migrate `deals.get` (attach mode), `deals.create`,
  and the `utils.auth.me.fetch()` preflight; `/analyse` is already `apiFetch`.
- `src/pages/DealAnalysis.tsx`: migrate the `deals.status` poll.
- **dealId integer → UUID touch points** (ride along, non-visual):
  - `NewDealWizard.tsx` — `attachDealIdFromUrl` (`Number(raw) > 0` guard →
    non-empty string), create-mutation return type, `fd.append("dealId", …)` source
    type.
  - `src/pages/newDealWizard/newDealWizardReducer.ts` — `attachDealId:
    number | null` → `string | null`, `set_attach_deal_id` payload.
  - `DealAnalysis.tsx` — `/analysis/:dealId` route param (drop int coercion),
    status-poll input.
  - `AnalysisRedirect.tsx` — dealId parse/redirect.
  - `Dashboard.tsx` pipeline links; any `{ dealId: number }` fetcher input types.

**Verify:** full create → upload → poll (steps animate) → redirect → memo renders,
end to end against the fixture. This is the acceptance milestone for the whole task.

---

## Phase 3 — Memo view actions

`MemoViewer`/`MemoDeliverable` reads are covered by Phase 1 (`history.get`).

**Backend**
- `memo.regenerateSection` / `regenerateDeliverable` / `rescore` /
  `regenerateComposer` — all LLM-invoking. **Per-`sessionId` mutex → 429** via
  Postgres advisory lock (not app memory) — the UI depends on it. Under
  fixture-first these degrade to their documented fallbacks (`regenerateSection` →
  draft scaffold; `rescore` → 412 preconditions) or defer with the real pipeline.
- `share.create/get` (public `get`, 24 h expiry, nanoid token).
- `attestation.submit/get` (public `get`) + `brokercheck.validateCrd` (FINRA proxy,
  5 s timeout, errors in-band).
- `flagFeedback.submit/getForSession`.
- `audit.listForSession`, `audit.logClientExport`,
  `logs.auditTrail/jobActivity/recentActivity` (read `human_audit_log`).
- REST: `POST /export-pdf` (10 MB body limit, `pdf_exported` audit row),
  `POST /verify`, `GET /sec-search` (EDGAR proxy with required custom User-Agent).

**Frontend:** `MemoViewer.tsx`, `MemoDeliverable.tsx`, `AttestationModal.tsx`,
`SharedMemo.tsx`, `ScorecardTab.tsx`, `LogsPanel.tsx`, mandate blocks.

**Deferrable within this phase** (nothing here blocks the core flow): share links,
attestation/BrokerCheck, PDF export, verify, sec-search.

---

## Phase 4 — Admin (defer freely)

`productUsage.*` (needs LLM-usage rows → real pipeline), `methodology.*`,
`flagFeedback.stats`, `deals.getRawChunks` (needs claims/chunks), `logs.*` admin
views. Frontend: `ProductUsage.tsx`, `MethodologyDashboard.tsx`,
`ParserVerificationTab`.

---

## Deferred — named so nothing is silently missing

| Item | Lands with |
|---|---|
| `ai_audit_log` | real pipeline (first writer) |
| `chunks` + hybrid retrieval (pgvector/tsvector) | real pipeline; migration must `CREATE EXTENSION IF NOT EXISTS vector` first |
| `claims` FKs to `deals`/`sessions` | real pipeline (claims population) |
| Real analyse pipeline (Docling → OCR → claims → Pass 1–4) | separate tracked effort; `Simpero_Gov_AI_Services`, G1 bake-off |
| `memo_history`, `portfolio_entities`, `rejected_deal_records`, `reconsideration_conditions`, `watch_signals`, `framework_calibration_events`, `feedback_events`, `corroboration_events` | later phases per data-model doc |
| `tolerance_overrides` table | per-client tuning need; type-default tolerances are shared-contract constants |
| `investment_frameworks`, `workflow_stage_configs` (per-fund JSON configs) | when per-fund mandate config / configurable stages are needed; alpha serves the frontend's per-org `investmentProfile` contract only |
| `system.*`, `analysis.*Session`, `finance.*`, `memo.patchDeliverable`, `ai.chat` | never (no live call sites / no router exists) |

## Housekeeping (non-blocking)

- Alpha `CLAUDE.md` is stale: says `decode_clerk_jwt` is a stub — it's fully
  implemented in `app/core/security.py`. Correct it.
- `app/models/claim.py` restates contract columns; its header already concedes the
  contract wins. Honor, don't touch.
- Frontend `docs/split-implementation-status.md`: update the FE-6/FE-7 entries to
  record the hand-written-fetcher decision.
