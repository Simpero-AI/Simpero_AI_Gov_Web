# Simpero_AI_Gov_Web

React frontend for Simpero — AI-powered Investment Committee memo generation.
Extracted from the `simpero_GOV_AI` monorepo (see the import commit for the exact
source SHA); served as a static site on DigitalOcean App Platform, talking to the
`Simpero_AI_Gov_Alpha` FastAPI backend.

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · react-router · TanStack Query ·
Clerk (`@clerk/clerk-react`) · pnpm

## Getting started

```bash
pnpm install
cp .env.example .env      # fill in VITE_CLERK_PUBLISHABLE_KEY
pnpm dev                  # http://localhost:5173, /api proxied to http://localhost:8000
```

The dev server proxies `/api` to a locally running backend
(`uv run uvicorn app.main:app` in `Simpero_AI_Gov_Alpha`).

## Environment variables

All variables are **build-time** (Vite inlines them — changing one requires a rebuild).

| Variable | Required | Purpose |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key (`pk_test_…` staging, `pk_live_…` production) |
| `VITE_API_BASE_URL` | no | Backend API origin. Empty/unset = same-origin (production DO ingress routes `/api/*`; local dev uses the Vite proxy). Set to e.g. `https://staging.example.com` to point a preview build at a remote backend |
| `VITE_ANALYTICS_ENDPOINT` | no | Umami analytics endpoint; analytics load only when set |
| `VITE_ANALYTICS_WEBSITE_ID` | no | Umami website id |

## Commands

```bash
pnpm dev          # Vite dev server with /api proxy
pnpm build        # production build → dist/
pnpm preview      # serve the production build locally
pnpm check        # tsc --noEmit + vitest run
pnpm lint         # eslint src --max-warnings=0
pnpm format       # prettier --write .
pnpm test         # vitest unit tests
pnpm test:e2e     # Playwright (installs Chromium first)
```

## Transition notes

- The data layer is mid-migration from tRPC to a generated OpenAPI client
  (see the frontend separation playbook in the monorepo's `docs/FS/`).
  `src/api/http.ts` is the single fetch boundary — it prefixes
  `VITE_API_BASE_URL` and attaches the Clerk session token.
- `src/shared/` is the copied slice of the monorepo's `shared/` types —
  the contract the UI renders. It shrinks as OpenAPI-generated types land.
- `src/api/_legacy/` holds a frozen type snapshot of the old Express tRPC
  router so screens stay type-checked during the transition; it is deleted
  when the last tRPC call site is migrated.
