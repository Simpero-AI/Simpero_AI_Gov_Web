# Simpero_AI_Gov_Web — Claude Code Session Context

React frontend for Simpero (AI-powered IC Memo generator), extracted from the
`simpero_GOV_AI` monorepo on 2026-07-07. This repo is the **frontend half** of the
frontend-split + Express→FastAPI migration; the backend half is `Simpero_AI_Gov_Alpha`
(FastAPI, sibling directory). Authoritative plan documents live in the monorepo:
`docs/FS/local_plans/2026-07-07-frontend-separation-playbook.md` (steps FE-0…FE-10) and
`2026-07-07-express-to-fastapi-transition-playbook.md`.

Current migration state: **FE-0…FE-5 done, FE-6…FE-10 pending** — see
`docs/split-implementation-status.md` for the full ledger, what's blocked on the
backend, and what needs a human decision.

## Provenance & the faithful-copy rule

- Import baseline: `simpero_GOV_AI @ 4cdfe5ce1c382febf777e5289ee2e209d0c4479f`
  (branch `SIM-14_FS-1`). The import commit message pins this; the monorepo runs
  `git diff <split-sha>..HEAD -- client/ shared/` at cutover to audit drift.
- **UI/UX must stay pixel-identical to the monorepo** until cutover. Only the data
  transport changes (tRPC → OpenAPI client). No redesigns, no component refactors
  that alter rendering.
- The monorepo's `client/` is production and gets bugfixes only; every such fix must
  be dual-applied here (playbook FE-8 — log not yet created).

## Commands

```bash
pnpm dev          # Vite dev server; /api proxied to http://localhost:8000 (FastAPI)
pnpm build        # vite build → dist/
pnpm preview      # serve the production build (also proxies /api)
pnpm check        # tsc --noEmit + vitest run — run before considering a task done
pnpm lint         # eslint src --max-warnings=0
pnpm test         # vitest (unit)
pnpm test:e2e     # Playwright — see e2e caveats below
```

`.env` needs `VITE_CLERK_PUBLISHABLE_KEY` (see `.env.example`). All `VITE_*` vars are
build-time — changing one requires a rebuild.

## Layout & aliases

- `@` → `./src`, `@shared` → `./src/shared` (vite.config.ts, vitest.config.ts,
  tsconfig paths — keep all three in sync).
- `src/shared/` — copied slice of the monorepo's `shared/` (17 modules + tests).
  It is the UI's rendering contract (`simperoTypes.ts` above all). Two types were
  vendored in because they lived server-side in the monorepo: `AnalysisJobPhase`
  (inlined in `pipelineSteps.ts`) and `ContractReview` (`contractReview.ts`). This
  directory shrinks as OpenAPI-generated types replace it (FE-6/7).
- `src/api/http.ts` — the single fetch boundary: prefixes `VITE_API_BASE_URL`,
  attaches the Clerk bearer token. **Never construct API URLs or fetch outside it.**
- `src/api/_legacy/` — FROZEN machine-generated `.d.ts` snapshot of the monorepo's
  tRPC `AppRouter` (see its README). Do not edit, do not import from it except in
  `src/lib/trpc.ts`. Excluded from eslint. Deleted in FE-7.
- `src/lib/trpc.ts` + `src/lib/ClerkTrpcProvider.tsx` — legacy tRPC client, still
  the live data layer for all ~45 procedure call sites until FE-7 migrates them.

## Gotchas (learned the hard way)

- **pnpm config must live in `package.json`'s `"pnpm"` key** — pnpm 10.4.1 ignores
  a standalone `pnpm.yaml`. The wouter patch (`patches/wouter@3.7.1.patch`,
  `patchedDependencies`) and `onlyBuiltDependencies` are configured there. If the
  patch stops applying, routing-dependent tests break subtly — check
  `node_modules/wouter/esm/index.js` contains `__WOUTER_ROUTES__`.
- eslint enforces the **Carbon swap boundary**: shadcn primitives and `sonner` must
  be imported via `@/components/mvp/primitives`, never `@/components/ui/*` directly.
- Number conventions from the monorepo hold everywhere: USD = integer **cents**,
  percents = integer **basis points**, ratios = plain decimals. Formatters:
  `src/lib/dealMetricsFormat.ts`.

## E2E state (Playwright)

- Runs against `vite preview` (production build) — the old Express dev-server
  bootstrap and `SKIP_AUTH_DEV` bypass are gone.
- Auth strategy: real Clerk via testing tokens — `e2e/global.setup.ts` activates
  `@clerk/testing` when `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (test instance)
  are set; otherwise it's a no-op.
- **The suite cannot pass yet**: there is no backend serving `/api` (FastAPI has no
  endpoints as of the split). Five specs are gated behind `E2E_BACKEND_FIXTURES=1`
  (`@needs-backend-fixtures` — they need server-seeded fixtures the FastAPI backend
  doesn't provide yet). CI's e2e job is gated on the `E2E_ENABLED` repo variable.

## Git rules

- Commit messages: concise imperative sentence, **no AI attribution of any kind**.
- Never push, create remotes, or publish without an explicit instruction.
