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

## Docs map (this repo's own `docs/`, distinct from the monorepo docs above)

- `docs/plans/` — architect-authored implementation plans, written before a
  feature is built. Can drift from what actually shipped — see caveat under
  Admin Portal below.
- `docs/implementations/` — dated, post-hoc summaries of what was actually
  built for a given feature/session (features, gaps, future work). Add a new
  dated file here after finishing a non-trivial feature; this is the
  authoritative "what happened" record, prefer it over `docs/plans/` when
  they disagree.
- `docs/split-implementation-status.md` — the FE-0…FE-10 migration ledger
  (see above).
- `docs/api-inventory.md`, `docs/e2e-implementation-plan.md` — standing
  reference docs, updated in place rather than dated.

## Provenance & the faithful-copy rule

- Import baseline: `simpero_GOV_AI @ 4cdfe5ce1c382febf777e5289ee2e209d0c4479f`
  (branch `SIM-14_FS-1`). The import commit message pins this; the monorepo runs
  `git diff <split-sha>..HEAD -- client/ shared/` at cutover to audit drift.
- **UI/UX must stay pixel-identical to the monorepo** until cutover. Only the data
  transport changes (tRPC → OpenAPI client). No redesigns, no component refactors
  that alter rendering.
- The monorepo's `client/` is production and gets bugfixes only; every such fix must
  be dual-applied here (playbook FE-8 — log not yet created).
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
- **Redesigned pages must never fabricate data to match the mockup.** Where
  a mockup section has no backing field on `simperoTypes.ts`, render it as a
  real-shaped `UnbackedSection`/empty state instead of inventing content;
  where a mockup action has no backend endpoint, render it as a real,
  `disabled` control with an explanatory note ("visible, disabled,
  explained"), not a fake success path or a bare "coming soon". Design
  compliance also means matching mockup **structure** (section presence,
  order, composition), not just colors/tokens — verify against actual DOM,
  not just CSS.

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

## Admin Portal

`src/admin/**` is a platform/org-admin management UI — create/delete client
orgs, invite members and org admins (own org or, for platform admins, an
arbitrary client org), remove members, and change a member's role between
`member`/`admin` — a separate application mounted in `App.tsx`'s outer
`<Switch>`, **outside** `Router()`/`AuthGate`, lazy-loaded so its code never
enters the main product bundle. Routes are declared in `src/routes.tsx`:
`/admin/sign-up`, `/admin/sign-in` (each with a `/*` sibling for Clerk's
sub-routes) and `/admin/*` → `AdminApp.tsx`, which owns a descendant
`<Routes>` (`organizations`, `organizations/:orgId` — the per-org detail
page for platform admins, `members`, `invitations`). react-router ranks
matches by specificity, so declaration order between these is irrelevant.
Admin links use absolute paths from `src/admin/adminRoutes.ts`
(`ADMIN_ROUTES`), never relative `to` — a relative `to` in a descendant
`<Routes>` resolves against the matched route, not the URL. Guarded
internally by `AdminGuard` (Clerk
signed-in + `GET /api/admin/context`, not `AuthGate`) — a signed-in user who
isn't any kind of admin is redirected to `/admin/sign-in?error=access_denied`
(not shown an in-place error), which offers sign-out if they're still
holding a non-admin session. Full build history and gaps:
`docs/implementations/2026-07-23-admin-portal.md`; original plan:
`docs/plans/admin-portal-frontend.md` (has since drifted substantially from
the implementation — trust the implementation doc where they conflict). See
also the separation rule directly below.

**Member role is three things kept in sync, not one**: a member's Clerk org
membership role (`org:member`/`org:admin`), the local `users.role` column,
and their `clerk_admin_users` row (which is what actually grants `/admin`
portal access) all change together on every promote/demote — backend-side,
not something this repo enforces, but the frontend's role `Select` assumes
this invariant holds. **Member removal is a soft-delete**: removed members
get `status: "inactive"` and stay visible in the Members/org-detail lists
(not filtered out) with a one-click re-invite action, rather than
disappearing — don't "fix" a list that shows inactive members, that's
intentional.

## Admin portal / product portal separation

`src/admin/**` (the platform/org-admin portal) and the rest of `src/` (the
product portal) are **independent surfaces and must stay that way**:

- No coupling in either direction. Admin code must never import product
  components, hooks, or shell code (`src/components/mvp/shell/**`, product
  auth hooks, etc.) and vice versa — `AdminLayout`/`AdminNav` are deliberately
  hand-rolled rather than reusing `MvpAppShell`/`MvpSidebar` for this reason.
  Shared primitives (`@/components/mvp/primitives`) and generic libs
  (`@/lib/*`) are fine to share; anything product-specific or admin-specific
  is not.
- Auth is separate: admin sign-in/sign-out (`useClerk()` directly) is not the
  product's `useAuth()`/logout flow — do not reuse or bridge them.
  `getAdminContext`/`clerk_admin_users` never creates a product `users` row.
  Route guards (`AdminGuard` vs whatever gates the product) stay independent.
  **One narrow, intentional exception**: the product's own `GET /auth/me`
  exposes a read-only `is_platform_admin` boolean (`useAuth.ts`'s `AuthUser`,
  threaded into `MvpUser.isPlatformAdmin` in `mvpNav.ts`), computed
  server-side from `clerk_admin_users`, used only to gate visibility of a
  few still-unscoped product nav items (Institutional Memory, Anti-Portfolio
  — see `docs/implementations/2026-08-13-web-design-revamp.md`). This is a
  data flag on the product's existing auth response, not an admin auth
  bridge — it doesn't create an admin session, doesn't import admin code,
  and isn't license for further product/admin coupling.
- If a task seems to need admin code to call into product code (or the
  reverse) to avoid duplicating a few lines, duplicate the few lines instead
  — that's the correct trade, not a shortcut.

## Backend changes belong in the backend repo's own session

This repo's Claude Code sessions must **never** implement changes in
`Simpero_AI_Gov_Alpha` (the sibling FastAPI backend), even when a feature
change here clearly requires a paired backend change. Instead:

1. Implement the frontend half only, against the target API contract.
2. Produce a copy-pastable, self-contained prompt describing exactly what
   the backend needs (endpoints, schema/field changes, request/response
   shapes, why, and any relevant existing-code context) for the user to hand
   to a separate Claude Code session running in the backend repo.
3. Do not `cd` into, read for the purpose of editing, or write files in the
   backend repo from this repo's session.

## Gotchas (learned the hard way)

- **pnpm config must live in `package.json`'s `"pnpm"` key** — pnpm 10.4.1 ignores
  a standalone `pnpm.yaml`, silently. `overrides` and `onlyBuiltDependencies` are
  configured there; anything added later (patches, overrides) goes there too, and
  a misplaced one fails quietly rather than erroring.
- eslint enforces the **Carbon swap boundary**: shadcn primitives and `sonner` must
  be imported via `@/components/mvp/primitives`, never `@/components/ui/*` directly.
- Number conventions from the monorepo hold everywhere: USD = integer **cents**,
  percents = integer **basis points**, ratios = plain decimals. Formatters:
  `src/lib/dealMetricsFormat.ts`.
- `src/index.css` has a deliberately **unlayered** `a { color: inherit }`
  reset (kept unlayered on purpose, to out-priority a third-party Carbon
  stylesheet's own unlayered `a` selector — see the comment above that rule
  in that file). It beats layered Tailwind utilities, so any button/link
  styling meant to always apply on an `<a>` (e.g. `Button` rendered via
  `asChild` + `href`, as in `EmptyState`'s `action.href`) needs the Tailwind
  v4 `!` important-prefix, or the reset silently wins and text goes
  invisible against a colored background. See `src/components/ui/button.tsx`'s
  `default`/`destructive` variants for the fixed pattern.

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
