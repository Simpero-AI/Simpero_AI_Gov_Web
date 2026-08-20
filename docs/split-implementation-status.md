# Frontend split — implementation status

> Repo created 2026-07-07 by executing steps FE-0…FE-5 of the frontend separation
> playbook (`simpero_GOV_AI/docs/FS/local_plans/2026-07-07-frontend-separation-playbook.md`).
> This document is the ledger: what was done, what deviated from the playbook and why,
> what remains, and what needs a human decision.

## Decisions taken (2026-07-07, by Vansh)

| Decision | Choice |
|---|---|
| Repo name | `Simpero_AI_Gov_Web` |
| History | Fresh repo, no carry-over; provenance via import-commit SHA |
| Split source | `simpero_GOV_AI @ 4cdfe5ce1c382febf777e5289ee2e209d0c4479f` (branch `SIM-14_FS-1` — main lacked the Clerk-only frontend the playbook assumes; branch was strictly ahead of main) |
| Sample HTML entry points (`carbon-sample`, `radix-*`) | **Dropped**, with their `*-main.tsx` bootstraps, `src/samples/`, and deps (`@carbon/react`, `@carbon/styles`, `@radix-ui/themes`). Re-addable from the monorepo archive in ~30 min if ever needed |
| Package manager | pnpm kept (per playbook standing decision; wouter patch preserved) |

> **Update 2026-08-20:** the wouter patch is gone — wouter was replaced by
> `react-router@7.18.2` and both the patch and `pnpm.patchedDependencies` were
> deleted (`docs/plans/2026-08-20-wouter-to-react-router.md`). pnpm itself is
> unchanged. This retires the patch as a live concern in the two places below
> (this table row and deviation 3) and in the deployment plan's R1.

## Done — FE-0…FE-5 (all gates green)

| Step | Commit | Notes |
|---|---|---|
| FE-0 import | `e3eb143` | 347 files verbatim: `client/`, shared slice, `e2e/`, configs, `patches/` |
| FE-1 restructure | `9589808` | Flattened to standard Vite layout (`/index.html`, `/src`, `/public`); shared slice → `src/shared/`; samples removed; configs rewritten (`@` → `./src`, `@shared` → `./src/shared`) |
| FE-2 manifest | `0db52bc` | Frontend-only deps (~40% smaller); scripts are plain `vite` / `vite build`; `@trpc/*` + `superjson` intentionally retained until FE-7 |
| FE-3 API boundary | `4c0580d` | `src/api/http.ts` (`VITE_API_BASE_URL` + Clerk bearer token); all 6 REST call sites switched; dev+preview proxy `/api` → `localhost:8000`; README + `.env.example` |
| FE-4 decouple | `c6db0e2` | Frozen `AppRouter` `.d.ts` snapshot under `src/api/_legacy/` (see below); repo compiles with zero references to the monorepo |
| FE-5 gates | `ada6f11` | `tsc` clean · 167 unit tests / 33 files pass · lint clean · build clean (3095 modules) · Playwright reconfigured (lists 63 tests / 15 files) · CI workflow added · app visually verified booting with today's UI |

### Deviations from the playbook (all additive, none contradicting it)

1. **Shared slice is 17 modules, not the 7 listed** — the playbook's list missed
   relative-path imports (`claimEnrichment`, `complianceAlignments`, `diligenceQueue`,
   `e2eUxMemoFixture`, `exportNaming`, `llmUsageReportPayload`, `llmUsageRollup`,
   `pass2Ack`, `sectionConfidence`, `dealsStatus`). It anticipated this ("follow
   compiler errors").
2. **Two server-side types vendored into `src/shared/`** — `AnalysisJobPhase`
   (string union, inlined in `pipelineSteps.ts`) and `ContractReview` + friends
   (`contractReview.ts`); both were type-only imports reaching into `server/`.
3. **pnpm config moved from `pnpm.yaml` into `package.json`** — pnpm 10.4.1 silently
   ignores `pnpm.yaml`; the wouter patch was not applying until moved. (The monorepo
   has the same config duplicated in `package.json`, which is why it works there.)
   *2026-08-20: the patch itself is now deleted along with wouter; the
   config-location lesson still stands for `overrides`/`onlyBuiltDependencies`.*
4. **`src/api/_legacy/` excluded from eslint** — 433 errors in machine-generated
   drizzle `.d.ts`; generated frozen code isn't lintable.
5. **`@clerk/testing` added** as the e2e auth strategy (replaces the deleted
   `SKIP_AUTH_DEV` server bypass), activated only when Clerk test-instance keys are set.

## `src/api/_legacy/` — what it is

A **machine-generated, frozen type snapshot** of the old Express backend's tRPC router
(60 `.d.ts` files emitted by `tsc --declaration --emitDeclarationOnly` on the
monorepo's `server/routers.ts` at the split SHA). It contains no runnable code — types
only. It exists because `src/lib/trpc.ts` used to import `AppRouter` directly from
`../../../server/routers`, the single line that made the frontend uncompilable outside
the monorepo. The snapshot keeps all ~45 tRPC call sites fully type-checked against
the *old* backend during the transition, without any dependency on the monorepo.
Rules: never edit it; never import it except from `src/lib/trpc.ts`; it is deleted
wholesale in FE-7 when the last tRPC call site moves to the generated OpenAPI client.

## Remaining — FE-6…FE-10

| Step | What | Blocked on |
|---|---|---|
| FE-6 | orval/OpenAPI codegen pipeline → `src/api/generated/`; Zod-guarded pass-through fetchers for deep payloads | Backend playbook BE-2: `Simpero_AI_Gov_Alpha` must export a committed `openapi.json` (currently it has only `health` + a stubbed `GET /deals/`). The frontend's full endpoint requirements are enumerated in `docs/api-inventory.md` |
| FE-7 | Migrate ~45 tRPC call sites + delete `trpc.ts`, `ClerkTrpcProvider`, `_legacy/`, `@trpc/*`, `superjson`; keep `docs/api-migration.md` checklist | FE-6 + backend endpoints landing phase by phase (BE-3…BE-5) |
| FE-8 | Dual-maintenance rules: `docs/dual-applied-fixes.md` here + PR-template checkbox in the monorepo | Nothing — can be done any time (touches the monorepo) |
| FE-9 | DO App Platform static-site component (staging first) | Repo pushed to GitHub; the DO App from backend playbook BE-7 |
| FE-10 | Cutover-readiness checklist (all specs green vs staging, visual parity audit, drift log reconciled) | Everything above |

## Needed from you (Vansh)

1. **Review this repo, then approve GitHub creation + push** — the FE-5 gate is
   reached; nothing is pushed and no remote exists (deliberate, per the playbook's
   explicit-approval rule). Also confirm the GitHub org/owner (playbook FE-9 sketch
   assumed `Digitallick/Simpero_AI_Gov_Web`; the repo now belongs to the
   `Simpero-AI` org instead).
2. **Decide when to do FE-8** (dual-maintenance log + monorepo PR-template checkbox)
   — recommended immediately after the first push, since interim monorepo `client/`
   bugfixes must be mirrored here from day one.
3. **Backend prerequisites** (with the CTO, per the backend playbook): BE-0…BE-2 in
   `Simpero_AI_Gov_Alpha` — Clerk JWT verify, error envelope, committed
   `openapi.json` — unblock FE-6/7 here.
4. **For CI e2e (later)**: create/confirm the Clerk *test* instance and set repo
   variables/secrets — `VITE_CLERK_PUBLISHABLE_KEY` (var), `CLERK_SECRET_KEY`
   (secret, test instance only), `E2E_API_BASE_URL` (var), and flip `E2E_ENABLED`
   to `true` once a staging backend exists.
5. **DO App Platform** (FE-9): create the staging App with the static-site component
   + ingress rules once the backend service component exists; add the DO domains to
   Clerk allowed origins.

## Local environment note

`.env` here was seeded with the `VITE_*` values from the monorepo's `.env` (Clerk
`pk_test_` key) so the app boots locally. `.env` is gitignored; rotate/replace freely.
