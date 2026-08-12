# Admin Portal — Frontend Implementation Architecture Plan (Rev. 2)

> **Rev. 2 — 2026-07-22.** Integrates four now-final backend decisions (F1–F4) that move `/admin` off the product auth gate, add a dedicated admin sign-up entry, add a platform-admin "invite product user into a client org" endpoint, and pin post-signup landing. Rev. 1's core architecture is unchanged: a self-contained `src/admin/` module, all data through `src/api/http.ts`, React Query, primitives via `@/components/mvp/primitives`, and the same out-of-scope list.

## What changed since Rev. 1 (F1–F4)

- **F1 — `/admin` is no longer inside the product `AuthGate`.** The backend now persists admins in a dedicated `clerk_admin_users` table and treats client admins as **admin-only** (no product `users` row). The product `AuthGate` (`src/App.tsx:77-85`) gates on `useAuth()` → `GET /auth/me`, which (a) would **bounce** an admin-only user (no product user row) and (b) worse, `/auth/me` + `useProfileSync` **JIT-provision a product `users`/org row** server-side — violating the admin-only model. So `/admin` now mounts in the **outer `<Switch>`** (alongside `/sign-in`, `/sign-up`, `/shared/:token`), guarded by a **new admin guard** based on **Clerk signed-in state + `GET /api/admin/context`** — never `/auth/me`. Calling `/api/admin/context` (backend `get_admin_db`) is what both **authorizes and provisions** the admin row; it does **not** create a product users row.
- **F2 — new `/admin/sign-up` route**, reachable while **signed out** (invitees have no session yet), also in the outer `<Switch>`. Hosts a Clerk `<SignUp>` mirroring `src/pages/SignUp.tsx`, configured to land the user in `/admin` after sign-up, and completes the invitation ticket. The guard applies to the portal pages, not this entry.
- **F3 — new platform-admin endpoint** `POST /api/admin/organizations/{clerkOrgId}/invitations` (invite a **product user** into a target client org). Adds an `adminClient.inviteMemberToOrg`, a React Query mutation, and a per-org "Invite user" action in the platform Organizations UI. The client-admin's own member-invite flow (Invitations page) is unchanged.
- **F4 — post-signup landing pinned.** Client admins land in `/admin` (via F2); product users (invited by a client admin *or* a platform admin) land on the product dashboard `/` via the existing `/sign-up` flow. No product-routing change beyond what F1 requires.

**The single product-file edit is still `src/App.tsx`** — but now the **outer `<Switch>` (`:98-110`)**, not `Router()`.

---

## Overview

This plan specifies a self-contained `src/admin/` module for a two-tier Admin Portal in the React/Vite frontend at `/Users/vanshkhanna/Documents/Simpero/Simpero_AI_Gov_Web`. Platform admins (Simpero internal) create client organizations and seed one account-manager admin per org, and may invite product users directly into any client org; org admins invite and manage users within their own org only. The frontend renders role-appropriate UI and calls a new REST admin API through the existing fetch boundary; **the backend enforces all tenant isolation and role authorization** — the frontend never infers privilege client-side. The module is lazy-loaded as an `/admin` subtree so it never enters the product bundle, consumes data exclusively via `@tanstack/react-query` over `src/api/http.ts`, and matches the existing visual language by composing `@/components/mvp/primitives`. Admins are an **admin-only** identity (no product `users` row), so the portal lives **outside** the product `AuthGate` and authorizes via `GET /api/admin/context`, never `/auth/me`. This document is standalone and phased for an implementer subagent working in parallel with the backend team (backend plan Rev. 3).

---

## Verified findings (file:line) and discrepancies

**Fetch boundary — confirmed.** `src/api/http.ts:21-33` exports `apiFetch(path, init)`, which prefixes `API_BASE_URL` (`src/api/http.ts:14`) and attaches the Clerk bearer token from `window.Clerk.session.getToken()` (`src/api/http.ts:22-30`), sending `credentials: "include"`. The existing domain modules `src/api/deals.ts:11-15` and `src/api/history.ts:18-22` establish the exact pattern to mirror: a thin `async` function that calls `apiFetch`, throws `new Error(...)` on `!res.ok`, and casts the JSON. `adminClient.ts` follows this verbatim. **Locked decision 2 confirmed.**

**Query client + global error behavior — confirmed, with one caveat.** `src/main.tsx:25-37` constructs the app-wide `QueryClient` (`staleTime: 15_000`, retry up to 2). The retry predicate (`src/main.tsx:29-33`) and the global redirect-on-401 subscriber (`src/main.tsx:39-67`) both key on `error instanceof TRPCClientError`. **Admin calls go through `apiFetch` and throw plain `Error`, not `TRPCClientError`** — so (a) the automatic "redirect to /sign-in on unauthorized" does NOT fire for admin queries, and (b) admin queries would be retried twice by default even on 401/403. Implication: the context guard query must set `retry: false` to fail fast, and admin auth failures are handled locally (redirect), not via the global subscriber. This is now **desirable**: we do not want an admin 401 to bounce to the *product* `/sign-in`.

**Auth-gate composition & mount point — RE-VERIFIED (F1 driver).** `src/App.tsx:98-110`: the outer `<Switch>` registers public routes (`/landing`, `/shared/:token`, `/sign-in`, `/sign-in/*`, `/sign-up`, `/sign-up/*`) and a **final catch-all `<Route>`** that wraps `<AuthGate><Router/></AuthGate>` (`src/App.tsx:105-109`). `AuthGate` (`src/App.tsx:77-85`) calls `useAuth()` + `useProfileSync()`, returns `null` while `loading`, renders children if `user`, else `<RedirectToSignIn/>`. `useProfileSync` (`src/_core/hooks/useProfileSync.ts:19`) and `useAuth`'s `fetchMe` (`src/_core/hooks/useAuth.ts:24-29`) both hit product `/auth/me`, which **JIT-provisions a product `users`/org row**. **Therefore `/admin` must NOT be registered inside `Router()` or under `AuthGate`** — doing so would both bounce an admin-only user and create a spurious product user row. Rev. 1's instruction to mount inside `Router()` is **reversed**: `/admin` and `/admin/sign-up` now register in the **outer `<Switch>` (`:98-110`)**, before the `AuthGate` catch-all.

**Clerk signed-in gating — confirmed, established idiom exists.** The repo already reads Clerk's client-side session state via `import { useAuth as useClerkAuth } from "@clerk/clerk-react"` → `{ isSignedIn, isLoaded }` (`src/_core/hooks/useAuth.ts:3,41`), and gates a downstream query with `enabled: clerkLoaded && isSignedIn === true` (`useAuth.ts:50`). The product does **not** use `<SignedIn>/<SignedOut>` wrappers anywhere (grep: only a comment at `App.tsx:73`); it uses `<RedirectToSignIn>` (`App.tsx:6,84`) and the `useClerkAuth()` hook. **The admin guard mirrors the `useClerkAuth()` hook idiom** (not `<SignedIn>`), so its `useAdminContext` query is `enabled` only once Clerk is loaded and signed-in — otherwise `apiFetch` would fire without a token.

**`useAuth` shape — confirmed, and confirms the split.** `src/_core/hooks/useAuth.ts:13-20` types `AuthUser` as `{ id, org_id, name, email, role, login_method }` — a **product** identity with `role` as a free string used only for product nav (`src/components/mvp/nav/mvpNav.ts:100`, `src/pages/History.tsx:64`). It carries **no platform-admin / org-admin distinction and no admin identity at all** — admin capability MUST come from `GET /api/admin/context`.

**ClerkProvider redirect props — confirmed (F2/F4).** `src/main.tsx:70-80` sets `signInUrl="/sign-in"`, `signUpUrl="/sign-up"`, `signInFallbackRedirectUrl="/"`, `signUpFallbackRedirectUrl="/"`. These are the **global product defaults** and are correct for product users: a product invite → `/sign-up` → dashboard `/`. The admin `<SignUp>` overrides the landing **per-component** (`forceRedirectUrl="/admin"`), so it does not disturb the product default. **No change to `src/main.tsx`.**

**SignIn/SignUp visual language — confirmed (F2 mirror).** `src/pages/SignIn.tsx:3-19` / `src/pages/SignUp.tsx:3-19` define identical `CLERK_APPEARANCE` tokens (`colorPrimary: "#004235"`, Inter, `0.375rem` radius), render a centered `--mvp-sidebar-bg` background with the Simpero logo (`SignUp.tsx:23-33`), and use Clerk `<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={...}>` (`SignUp.tsx:29-34`). `AdminSignUp.tsx` copies this structure, swapping `path="/admin/sign-up"` and adding `forceRedirectUrl="/admin"`.

**Wouter version + nesting — confirmed with a required technique.** `package.json:73` declares `wouter@^3.3.5`, but `package.json:106-109` pins the patched build to `wouter@3.7.1` (`patches/wouter@3.7.1.patch`), so the resolved runtime is 3.7.1. The patch (`patches/wouter@3.7.1.patch:9-24`) only injects `window.__WOUTER_ROUTES__` bookkeeping inside `Switch` — it does not alter matching semantics. Wouter 3.x supports prefix nesting via the `nest` prop; a nested `<Route>` mounts a child router with a `base`, child paths match relative to it, and `<Redirect to="~/..." >` escapes to an absolute path. Both `/admin` and `/admin/sign-up` need `nest` (the sign-up needs it for Clerk's verification sub-routes). **Ordering matters in the outer `<Switch>`: `/admin/sign-up` must be registered before `/admin`**, since a `/admin` nest route would otherwise swallow `/admin/sign-up/*`.

**No `React.lazy` exists yet — confirmed.** A repo-wide grep for `React.lazy|lazy(|Suspense` returns only a comment in `src/components/mvp/shell/slot.ts:10`. The Admin Portal is the **first** lazy-loaded subtree; the implementer adds the `<Suspense>` boundary and verifies separate chunks in `pnpm build`.

**Carbon-swap eslint boundary — confirmed and applies to admin.** `eslint.config.js:42-58` enforces `no-restricted-imports`: `@/components/ui/**` is banned (`:48`) and bare `sonner` is banned (`:53-56`); exemptions (`:63-78`) cover only the primitives barrel, `ui/` internals, and `ComponentShowcase.tsx`. Admin lives under `src/**` (`:12`): **all shadcn primitives via `@/components/mvp/primitives`, toasts via `@/components/mvp/primitives/sonner`.** **Locked decision 5 confirmed.**

**Available primitives — enumerated.** `src/components/mvp/primitives/index.ts:1-66` re-exports (relevant to admin): `button`, `card`, `dialog`, `alert-dialog`, `input`, `label`, `textarea`, `select`, `form`, `table`, `badge`, `separator`, `skeleton`, `spinner`, `dropdown-menu`, `tabs`, `sonner` (toast), `tooltip`, `empty`, `field`, `input-group`. `react-hook-form@7.64` and `zod@4.1` are available (`package.json:64,74`).

**Visual-language reference — confirmed.** Appearance tokens and shell idiom per `SignIn.tsx:3-19,28-33` and `MvpAppShell.tsx:75-113`. Admin matches these.

### Discrepancies / judgment calls to surface

1. **Data boundary vs. design-system boundary.** Decision 2 governs **data/fetch** (only `http.ts`); decision 5 authorizes the **design-system** boundary (`@/components/mvp/primitives`). Admin's permitted inbound imports from shared code: `@/api/http`, `@/components/mvp/primitives`, `@/lib/utils`'s `cn`, shared CSS tokens, and `@clerk/clerk-react` (for the sign-up component and the guard's signed-in check). **Everything else product-side is off-limits.**
2. **Do NOT reuse `MvpAppShell` / `MvpSidebar` / `buildMvpNav`.** These are product-shell-coupled (`buildMvpNav` hardcodes product routes, `mvpNav.ts:60-111`). Admin builds its own lightweight `AdminLayout` from primitives + shared CSS tokens. Deliberate deviation from literally "reuse the shell."
3. **Loose coupling is not eslint-enforced.** Enforced here by convention + review; an optional `no-restricted-imports` hardening rule is noted out-of-scope pending Vansh's decision.
4. **Admin guard now spans two systems (Clerk + backend context).** Unlike the product `AuthGate` (single `/auth/me`), the admin guard first checks Clerk `isSignedIn` (client) then `GET /api/admin/context` (server). Both must pass. Called out because the guard's two-stage flow is new and its ordering (Clerk → context) is load-bearing: `apiFetch` needs a token, so the context query must be `enabled` only when signed-in.

---

## API contract (verbatim — identical to the backend plan Rev. 3 contract section)

Base path `/api/admin`, Clerk bearer auth (handled by `http.ts`). Responses are camelCase on the wire (backend uses `CamelModel`).

- `GET /api/admin/context` → `{ isPlatformAdmin: bool, isOrgAdmin: bool, org: { clerkOrgId, name, type } }`
  - Backed by `get_admin_db`: this call **authorizes AND JIT-provisions the admin row** in `clerk_admin_users`. It does **not** create a product `users` row. Call it **exactly once** via `useAdminContext` (`retry: false`).

Org-admin endpoints (backend guard; org derived from token):
- `POST /api/admin/invitations` body `{ emailAddress: str, role?: "member" }` → `{ id, emailAddress, status, createdAt }`
- `GET /api/admin/invitations` → list pending for own org
- `DELETE /api/admin/invitations/{invitation_id}` → revoke
- `GET /api/admin/members` → list users in own org
- `DELETE /api/admin/members/{user_id}` → deactivate/remove member (`user_id` = local `users.id`, **int**)

Platform-admin endpoints:
- `POST /api/admin/organizations` body `{ name: str, type?: "PE Firm"|"Family Office", accountManagerEmail: str }` → `{ clerkOrgId, name, type, invitation: {...} }`
- `GET /api/admin/organizations` → list client orgs
- **`POST /api/admin/organizations/{clerkOrgId}/invitations`** *(NEW — F3)* body `{ emailAddress: str, role?: "member" }` → `{ id, emailAddress, status, createdAt }`
  - Platform-guarded; the **target org is taken from the path** (`clerkOrgId`), not the caller's token. Invites a **product user** into that org; the invitee's `redirect_url` is the product `/sign-up` (they become a product user, landing on `/`). Distinct from `POST /api/admin/invitations`, which invites into the caller's *own* org.

> Note: field casing is camelCase (backend `CamelModel`). Reconcile the exact `GET /members` row shape with the backend team before Phase 3 (see Open Questions).

---

## Module layout

```
src/admin/
  AdminApp.tsx                 # lazy entrypoint: guard + nested <Switch> (portal pages)
  types.ts                     # hand-written TS interfaces mirroring the contract
  api/
    adminClient.ts             # all fetch functions; ONLY file that imports @/api/http
  hooks/
    useAdminContext.ts         # context query (retry:false) + capability helpers
    useOrganizations.ts        # list + createOrg + inviteMemberToOrg mutations (platform)
    useInvitations.ts          # list + create + revoke (org admin — own org)
    useMembers.ts              # list + remove (org admin)
    queryKeys.ts               # centralized ["admin", ...] key factory
  components/
    AdminLayout.tsx            # self-contained shell (sidebar + topbar + main)
    AdminNav.tsx               # capability-driven nav (built from AdminContext)
    AdminGuard.tsx             # Clerk-signed-in + context guard (loading / redirect)
    DataState.tsx              # shared loading/error/empty render helper
    ConfirmDialog.tsx          # destructive-action confirm (alert-dialog primitive)
    InviteMemberDialog.tsx     # F3: platform per-org "invite product user" dialog
  pages/
    AdminSignUp.tsx            # F2: signed-out-reachable Clerk <SignUp> (lands /admin)
    Organizations.tsx          # platform: list + create org + per-org "Invite user"
    Members.tsx                # org admin: member list + remove
    Invitations.tsx            # org admin: invite form + pending list + revoke
  __tests__/                   # vitest unit/component tests (see Phase 5)
```

**Responsibilities**

- `AdminApp.tsx` — default export, lazy-imported by `App.tsx`. Renders `<AdminGuard>` wrapping a nested wouter `<Switch>` for the **portal** views (not sign-up). No product imports.
- `pages/AdminSignUp.tsx` *(NEW — F2)* — default export, lazy-imported by `App.tsx` **separately from `AdminApp`**, mounted **outside the guard** so it is reachable signed-out. Hosts Clerk `<SignUp>` mirroring `src/pages/SignUp.tsx`.
- `types.ts` — hand-written admin shapes (single source of truth until OpenAPI generation, FE-6/7).
- `api/adminClient.ts` — the only admin file importing `@/api/http`. One function per endpoint (including F3's `inviteMemberToOrg`).
- `hooks/*` — React Query wrappers: keys, `useQuery`/`useMutation`, invalidation, toast side-effects. UI never calls `adminClient` directly.
- `components/AdminLayout.tsx` — self-contained shell using primitives + shared CSS tokens.
- `components/InviteMemberDialog.tsx` *(NEW — F3)* — a dialog reused per-org row on the Organizations page.
- `pages/*` — one file per view.

---

## `adminClient.ts` design

Every function calls `apiFetch` from `@/api/http` and throws on non-2xx, mirroring `src/api/deals.ts`/`src/api/history.ts`. Return types come from `types.ts`.

```ts
// src/admin/api/adminClient.ts  (illustrative signatures only — implementer writes bodies)
import { apiFetch } from "@/api/http";
import type { AdminContext, Organization, OrganizationCreated,
              Invitation, Member, CreateOrgBody, CreateInviteBody } from "../types";

getAdminContext(): Promise<AdminContext>          // GET  /api/admin/context
listOrganizations(): Promise<Organization[]>      // GET  /api/admin/organizations
createOrganization(b: CreateOrgBody): Promise<OrganizationCreated>  // POST /api/admin/organizations
inviteMemberToOrg(clerkOrgId: string, b: CreateInviteBody): Promise<Invitation>
                                                  // POST /api/admin/organizations/{clerkOrgId}/invitations  (F3)
listInvitations(): Promise<Invitation[]>          // GET  /api/admin/invitations
createInvitation(b: CreateInviteBody): Promise<Invitation>          // POST /api/admin/invitations
revokeInvitation(id: string): Promise<void>       // DELETE /api/admin/invitations/{id}
listMembers(): Promise<Member[]>                  // GET  /api/admin/members
removeMember(userId: number): Promise<void>       // DELETE /api/admin/members/{userId}  (int local id)
```

Each body follows this shape (from `history.ts:36-40`):

```ts
const res = await apiFetch(`/api/admin/organizations/${clerkOrgId}/invitations`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) throw new Error(`POST /admin/organizations/${clerkOrgId}/invitations failed: ${res.status}`);
return (await res.json()) as Invitation;
```

For `getAdminContext`, treat 401/403 as a definitive "not an admin" signal — return the raw error (the hook sets `retry:false` so it surfaces immediately, and `<AdminGuard>` redirects). DELETE endpoints returning no body `return;` after the `res.ok` check.

**Hand-written types (`types.ts`)** — mirror the contract exactly (camelCase):

```ts
export interface AdminOrg { clerkOrgId: string; name: string; type: string | null }
export interface AdminContext {
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
  org: AdminOrg;
}
export interface Organization { clerkOrgId: string; name: string; type: string | null }
export interface Invitation {
  id: string; emailAddress: string; status: string; createdAt: string; // ISO
}
export interface OrganizationCreated extends Organization { invitation: Invitation }
export interface Member { id: number; clerkUserId: string; email: string | null; name: string | null; role: string }
export type OrgType = "PE Firm" | "Family Office";
export interface CreateOrgBody { name: string; type?: OrgType; accountManagerEmail: string }
export interface CreateInviteBody { emailAddress: string; role?: "member" }
```

Note: `CreateInviteBody` is reused for both `createInvitation` (own org) and `inviteMemberToOrg` (platform, target org in path). The `Member` shape and the `DELETE /members/{user_id}` **int** path param must be reconciled with the backend before Phase 3.

---

## React Query design

**Key factory (`hooks/queryKeys.ts`)** — all keys namespaced `["admin", ...]` (parallels `DEALS_*_QUERY_KEY` in `deals.ts:5-8`):

```ts
adminKeys = {
  context:       ["admin", "context"] as const,
  organizations: ["admin", "organizations"] as const,
  invitations:   ["admin", "invitations"] as const,
  members:       ["admin", "members"] as const,
}
```

**Context query (`useAdminContext`)** — `useQuery({ queryKey: adminKeys.context, queryFn: getAdminContext, retry: false, refetchOnWindowFocus: false, staleTime: 60_000, enabled: clerkLoaded && isSignedIn === true })`. `retry:false` is required (the global predicate `main.tsx:29-33` would retry 401/403 twice) and the `enabled` gate mirrors `useAuth.ts:50` so the call never fires without a Clerk token. Expose derived `{ context, isPlatformAdmin, isOrgAdmin, isLoading, isError }`.

**List queries** — standard `useQuery`; `enabled` gated on the relevant capability flag so non-privileged views never fire (members/invitations only when `isOrgAdmin`, organizations only when `isPlatformAdmin`).

**Mutations + invalidation flow:**

| Mutation | On success | Toast |
|---|---|---|
| `createOrganization` | `invalidateQueries(adminKeys.organizations)` | success "Organization created; invite sent to {email}" |
| `inviteMemberToOrg` *(F3)* | no list to invalidate (platform org list shows no invitations); close dialog | success "Invitation sent to {email}" |
| `createInvitation` | `invalidateQueries(adminKeys.invitations)` | success "Invitation sent" |
| `revokeInvitation` | `invalidateQueries(adminKeys.invitations)` | success "Invitation revoked" |
| `removeMember` | `invalidateQueries(adminKeys.members)` | success "Member removed" |

All mutations use `toast` from `@/components/mvp/primitives/sonner`. `<Toaster/>` is already mounted globally (`src/App.tsx:1,97`). Error toasts render `error.message`. Disable submit buttons while `mutation.isPending`; lists render a skeleton while `isLoading` and inline error + Retry when `isError` (History idiom, `History.tsx:284-307`).

---

## Routing + route-guard design (the big change — F1/F2)

### Mount points (edit to `src/App.tsx` — the OUTER `<Switch>`, `:98-110`)

Add two lazy imports at module top and **two routes in the outer `<Switch>`**, placed **after** the `/sign-up*` routes (`App.tsx:103-104`) and **before** the `AuthGate` catch-all (`App.tsx:105-109`). Ordering within the pair matters: `/admin/sign-up` first, then `/admin`.

```tsx
// module top of src/App.tsx
import { lazy, Suspense } from "react";
const AdminSignUp = lazy(() => import("@/admin/pages/AdminSignUp"));
const AdminApp     = lazy(() => import("@/admin/AdminApp"));

// inside the OUTER <Switch>, after <Route path="/sign-up/*" .../> and before the AuthGate catch-all:
<Route path="/admin/sign-up" nest>                {/* F2: signed-out reachable, NO guard */}
  <Suspense fallback={<AdminBootFallback />}>
    <AdminSignUp />
  </Suspense>
</Route>
<Route path="/admin" nest>                         {/* F1: guarded portal */}
  <Suspense fallback={<AdminBootFallback />}>
    <AdminApp />
  </Suspense>
</Route>
```

- Both routes use `nest` (base `/admin/sign-up` and `/admin` respectively). `/admin/sign-up` **must precede** `/admin` or the `/admin` nest would swallow the sign-up sub-routes.
- Neither route is inside `AuthGate`, so **`/auth/me` and `useProfileSync` never run for admins** — no product `users` row is created, and admin-only users are not bounced. This is the crux of F1.
- The product catch-all (`<Route><AuthGate><Router/></AuthGate></Route>`) is unchanged and still handles all product routes.
- **This is the only change to a product file.** Rev. 1 edited `Router()`; Rev. 2 edits the outer `<Switch>` instead.
- **Fallback if `nest` misbehaves under the patched wouter:** use `path="/admin/sign-up/:rest*"` and `path="/admin/:rest*"` — verify with the Phase 0 routing smoke test.

### `AdminSignUp.tsx` (F2)

Mirrors `src/pages/SignUp.tsx:21-38` structure (same centered `--mvp-sidebar-bg` layout, Simpero logo, shared `CLERK_APPEARANCE` tokens — copy the tokens locally to stay self-contained; do not import from `src/pages/`). Renders:

```tsx
<SignUp
  routing="path"
  path="/admin/sign-up"
  signInUrl="/sign-in"
  forceRedirectUrl="/admin"          // F4: land in /admin after sign-up
  appearance={CLERK_APPEARANCE}
/>
```

- Reachable **signed out** (invitee has no session). Clerk automatically completes the invitation **ticket** from the `__clerk_ticket` query param the backend's `redirect_url=<app_base_url>/admin/sign-up` carries.
- `forceRedirectUrl="/admin"` overrides the global `signUpFallbackRedirectUrl="/"` (`main.tsx:75`) **for this component only** — product sign-up still lands on `/`.
- After redirect to `/admin`, the guard runs, `GET /api/admin/context` provisions the admin, and `AdminHome` sends them to their capability landing.
- `nest` on the outer route + `routing="path" path="/admin/sign-up"` lets Clerk's verification sub-routes (e.g. `.../verify-email-address`) resolve. This page is **not** wrapped by `AdminGuard`.

### Nested portal router (`AdminApp.tsx`)

Because `/admin` is `nest`ed, child paths are relative to `/admin`:

```tsx
<AdminGuard>
  <Switch>
    <Route path="/" component={AdminHome} />            // /admin
    <Route path="/organizations" component={Organizations} />
    <Route path="/members" component={Members} />
    <Route path="/invitations" component={Invitations} />
    <Route><Redirect to="~/" /></Route>                 // unknown /admin/* → product root
  </Switch>
</AdminGuard>
```

`AdminHome` redirects to the capability landing (platform admin → `/organizations`, org admin → `/members`).

### Guard (`AdminGuard.tsx`) — now two-stage (Clerk + context)

Call both hooks **unconditionally** (React hook rules), gate the context query with `enabled`, then branch on values:

```
const { isLoaded, isSignedIn } = useClerkAuth();          // @clerk/clerk-react, mirrors useAuth.ts:41
const { isLoading, isError, isPlatformAdmin, isOrgAdmin }
   = useAdminContext();                                    // enabled: isLoaded && isSignedIn === true

if (!isLoaded)            → full-height centered spinner
if (!isSignedIn)          → <Redirect to="~/admin/sign-up" />   // F1/F2: admin entry, NOT product /sign-in
if (isLoading)            → spinner
if (isError || (!isPlatformAdmin && !isOrgAdmin))
                          → <Redirect to="~/" />                // 403 → product root
otherwise                → render children
```

Design rationale (extra scrutiny — this touches auth):
- **Clerk first, context second.** `apiFetch` reads `window.Clerk.session.getToken()`; firing the context query before signed-in would send a tokenless request that 401s and looks like "not an admin." The `enabled` gate (mirroring `useAuth.ts:50`) prevents that.
- **Signed-out → `/admin/sign-up`, not `/sign-in`.** Sending a signed-out visitor to the product `/sign-in` would, on success, land them on `/` under `AuthGate` — the exact admin-only bounce/JIT-provision problem F1 exists to avoid. The admin entry is `/admin/sign-up`; the Clerk `<SignUp>` there offers a "sign in" affordance for returning admins. (Open Question 7: whether a dedicated `/admin/sign-in` is wanted for returning signed-out admins.)
- **Not-an-admin (403 or both-false) → `~/`.** Less surface disclosure than a 404, and it drops the user onto the product root (where product `AuthGate` takes over normally). The `~/` prefix escapes the nested base; a plain `/` would resolve under `/admin`. Reversible to a 403 view if Vansh prefers.
- **No `useProfileSync`, no `/auth/me` anywhere in this path.** The only server call is `GET /api/admin/context`, which provisions the admin row and never a product users row.

---

## UI / component plan per page

All pages compose `@/components/mvp/primitives` only; toasts via `@/components/mvp/primitives/sonner`. Visual tokens match `SignIn.tsx`/`MvpAppShell` (`--mvp-sidebar-bg` dark sidebar, light content, Inter, `#004235` primary).

**`AdminLayout` + `AdminNav`.** Self-contained shell: dark left sidebar (Simpero logo + "Admin" wordmark like `SignIn.tsx:30-33`), a thin topbar with breadcrumb and a "Back to app" link (`<a href="/">`, a full navigation out of the admin subtree), scrollable main. `AdminNav` renders conditionally from `AdminContext`:
- Platform admin: "Organizations".
- Org admin: "Members", "Invitations".
- Both (if backend allows) → all three.

**`Organizations.tsx` (platform admin).**
- Header: `PageHeader`-style title "Client Organizations" + primary "New organization" button opening a `dialog`.
- Create form (`form` + `react-hook-form` + `zod`): `name` (required), `type` (`select`: "PE Firm"/"Family Office", optional), `accountManagerEmail` (required, email). Submit → `createOrganization`; on success close, toast (surface returned `invitation`), invalidate list.
- List: `table` with columns Name / Type / Org ID (`clerkOrgId`, monospace, truncated) / **actions**. Skeleton / inline error+Retry / `empty` when none.
- **Per-org "Invite user" action *(NEW — F3)*.** A row action (dropdown-menu item or button) opens `InviteMemberDialog` bound to that row's `clerkOrgId`. The dialog is a small `form` (`emailAddress` required+email; `role` fixed to `"member"`, rendered read-only or omitted and defaulted). Submit → `inviteMemberToOrg(org.clerkOrgId, body)` mutation → toast "Invitation sent to {email}" → close dialog. Distinct from the org-admin Invitations page (which targets the caller's own org).

**`Members.tsx` (org admin).**
- Header "Team Members" showing the org name from context.
- `table`: Name / Email / Role / actions. Remove → `ConfirmDialog` (`alert-dialog`) → `removeMember` (int local id) → toast + invalidate. Disable row action while pending.

**`Invitations.tsx` (org admin — unchanged from Rev. 1).**
- Invite form: `emailAddress` (required, email), `role` fixed/defaulted `"member"`. Submit → `createInvitation` → toast + invalidate.
- Pending list: `table` Email / Status (`badge`/`StatusChip`) / Created. Revoke → confirm → `revokeInvitation` → toast + invalidate.

**Post-signup landing (F4), summarized:**
- **Client admin** → invited to `/admin/sign-up` → after sign-up `forceRedirectUrl="/admin"` → guard provisions admin → capability landing.
- **Product user** (invited by a client admin via `POST /api/admin/invitations`, or by a platform admin via `POST /api/admin/organizations/{clerkOrgId}/invitations`) → invited to the existing `/sign-up` → global `signUpFallbackRedirectUrl="/"` → product dashboard. No product-routing change.

---

## Phased implementation plan

Each phase ends green on `pnpm check` (`tsc --noEmit && vitest run`, `package.json:11`) and `pnpm lint` (`eslint src --max-warnings=0`, `package.json:12`).

### Phase 0 — Scaffold, routing, guards, sign-up entry
- Create `src/admin/` tree: `types.ts`, `api/adminClient.ts` (all 9 functions incl. `inviteMemberToOrg`), `hooks/queryKeys.ts` + `useAdminContext.ts`, `components/AdminGuard.tsx`, `AdminApp.tsx`, and `pages/AdminSignUp.tsx`.
- Edit `src/App.tsx` **outer `<Switch>` (`:98-110`)**: add `lazy`/`Suspense` imports and the two routes (`/admin/sign-up` nest, then `/admin` nest) before the `AuthGate` catch-all.
- `AdminGuard` implements the two-stage Clerk→context flow; portal pages can be placeholders.
- **Acceptance:**
  - `pnpm build` produces separate `AdminApp` and `AdminSignUp` chunks (verify admin code absent from the main entry chunk).
  - Signed-in admin at `/admin` → guard renders (context fetched once, `retry:false`); non-admin context (or 401/403) → redirect to `/`; signed-out visitor at `/admin` → redirect to `/admin/sign-up`.
  - `/admin/sign-up` renders the Clerk `<SignUp>` **while signed out** (no guard, no `/auth/me` call — verify via network panel that `/auth/me` is never hit on the admin paths).
  - `pnpm check` + `pnpm lint` pass; no admin file imports any product module except `@/api/http`, `@/components/mvp/primitives`, `@/lib/utils` (`cn`), and `@clerk/clerk-react`.

### Phase 1 — AdminLayout + capability nav
- Build `AdminLayout`, `AdminNav`, `DataState`, `ConfirmDialog`, `AdminHome` (capability redirect).
- **Acceptance:** shell renders with correct tokens; nav shows role-appropriate items from `AdminContext`; `AdminHome` sends platform admins to `/organizations`, org admins to `/members`; no `@/components/ui/*` / bare `sonner` imports (lint proves it).

### Phase 2 — Platform admin: Organizations + per-org invite (F3)
- `hooks/useOrganizations.ts` (list + `createOrganization` + `inviteMemberToOrg` mutations); `pages/Organizations.tsx`; `components/InviteMemberDialog.tsx`.
- **Acceptance:** list renders/loads/errors/empties; create form validates and on success closes/toasts/invalidates; **the per-org "Invite user" action opens a dialog, validates email, calls `inviteMemberToOrg(clerkOrgId, body)`, toasts "Invitation sent to {email}", and closes**; org-admin-only users cannot reach this view (guarded + nav-hidden).

### Phase 3 — Org admin: Members + Invitations
- `hooks/useMembers.ts`, `hooks/useInvitations.ts`; `pages/Members.tsx`, `pages/Invitations.tsx`.
- **Acceptance:** members list + remove-with-confirm (int local id) works; invite create + pending list + revoke-with-confirm works; all mutations toast + invalidate the right key; platform-only users don't see these in nav.

### Phase 4 — Polish + reconcile
- Confirm every mutation's loading/disabled/error states; reconcile `Member` shape with the backend's actual `GET /members`; verify `getAdminContext` failure paths (network vs 401/403) both resolve to a redirect, not an infinite spinner; verify the admin sign-up ticket flow end-to-end (invitation URL → `/admin/sign-up` → `/admin` → capability landing) once the backend serves it.
- **Acceptance:** no lingering `TODO` types; manual walkthrough of both admin roles + a fresh invitee sign-up is clean.

### Phase 5 — Testing
- **Unit (vitest):** `adminClient` functions with `apiFetch`/`window.Clerk` mocked (assert URL incl. `{clerkOrgId}` interpolation for `inviteMemberToOrg`, method, body, throw-on-!ok); `AdminGuard` logic — mock `useClerkAuth` (`@clerk/clerk-react`) + `useAdminContext`: `!isLoaded`→spinner, `!isSignedIn`→redirect `/admin/sign-up`, context loading→spinner, non-admin/error→redirect `/`, admin→children — using `QueryClientProvider` + wouter `<Router base="/admin">`; zod validation for org-create, own-org invite, and platform invite-member forms.
- **Component:** render each page with a mocked query client; assert loading/empty/error/populated states and that a mutation triggers invalidation + toast (mock `toast` from the primitives barrel), including `InviteMemberDialog` submitting to the per-org endpoint.
- **E2E (Playwright) — gated.** Per CLAUDE.md, the suite runs against `vite preview` and **cannot pass without a backend serving `/api`**. Author admin specs (including the `/admin/sign-up` invite flow) but gate them behind `@needs-backend-fixtures` / `E2E_BACKEND_FIXTURES=1`, like the five existing gated specs; do not enable them (`E2E_ENABLED` repo variable).
- **Acceptance:** `pnpm test` green; new unit/component tests cover client, guard (both Clerk stages), and all three form validations; e2e specs exist but are gated and documented as backend-blocked.

---

## Out of scope / do not touch

- **Product pages** (`src/pages/**` except the single `App.tsx` outer-`<Switch>` route registration) and **product components** (`MvpAppShell`, `MvpSidebar`, `MvpNavRenderer`, `MvpTopbar`, `MvpFundSelector`, `buildMvpNav`, `src/components/mvp/nav/**`). Do not import them into admin; do not import admin into them. `AdminSignUp` **copies** `CLERK_APPEARANCE` tokens locally rather than importing from `src/pages/SignUp.tsx`.
- **The product `AuthGate` / `Router()` / `useAuth` / `useProfileSync`** — the admin surface deliberately does **not** use them (F1). Do not route admin through `/auth/me`, and do not attempt to make an admin also a product user.
- **`src/main.tsx`** — no change. The ClerkProvider redirect props (`signUpFallbackRedirectUrl="/"`, etc.) and the global retry/redirect subscriber stay as-is; admin needs are handled locally (`retry:false`, `forceRedirectUrl="/admin"` on the admin `<SignUp>`).
- **Legacy tRPC layer** — `src/lib/trpc.ts`, `src/lib/ClerkTrpcProvider.tsx`, `src/api/_legacy/**` (frozen, eslint-ignored per `eslint.config.js:8`). Admin endpoints are REST via `http.ts` only. Do not add admin procedures to tRPC.
- **`src/api/http.ts`** — consume it; do not modify it.
- **Domain API modules** (`src/api/deals.ts`, `history.ts`, etc.) — reference for pattern only; do not import or edit.
- **Faithful-copy product surfaces** and `src/shared/**` — untouched.
- **eslint config / wouter patch / vite aliases** — no changes required.

---

## Open questions / risks for a human

1. **`GET /api/admin/members` row shape** — backend types it `{ id: int, clerkUserId, name, email, role }` with `DELETE /members/{user_id}` taking the **local `users.id` (int)**. Confirm before Phase 3.
2. **403 handling for non-admins** — this plan redirects to `~/` (least surface disclosure). Confirm over a dedicated 403 view.
3. **Can a user be both platform admin and org admin?** Context returns independent booleans; nav/home support both. Confirm the combination is expected (affects `AdminHome` default landing).
4. **Loose-coupling enforcement** — optionally add a `no-restricted-imports` rule forbidding `@/admin/**` ↔ product cross-imports (allowlisting `@/api/http`, `@/components/mvp/primitives`, `@clerk/clerk-react`). Out of scope until approved.
5. **Wouter `nest` under the 3.7.1 patch** — high confidence, but Phase 0 must smoke-test both nested routes, with `:rest*` as the documented fallback. Verify `/admin/sign-up` ordering-before-`/admin` actually prevents the nest from swallowing sign-up sub-routes.
6. **`type` free-string vs enum** — create body constrains `type` to `"PE Firm"|"Family Office"`; `GET` responses type it `str | null`. Confirm the backend won't return other values.
7. **Dedicated `/admin/sign-in` for returning signed-out admins?** *(NEW)* Today the guard sends signed-out visitors to `/admin/sign-up`, whose Clerk `<SignUp>` links to the product `/sign-in`. If a returning admin signs in there, `signInFallbackRedirectUrl="/"` lands them on `/` (product `AuthGate`), which is wrong for an admin-only user. In practice Clerk sessions persist so this is rare, but confirm whether a dedicated admin sign-in entry (with `forceRedirectUrl="/admin"`) is wanted. **Depends on a Vansh/backend decision.**
8. **F3 invalidation semantics** — `inviteMemberToOrg` currently invalidates nothing (the platform org list shows no per-org invitation state). Confirm the Organizations UI won't display per-org pending invites; if it should, add a per-org invitations query + key and invalidate it.
9. **`AdminBootFallback`** — the `<Suspense>` fallback for both admin chunks should be a minimal, product-independent spinner on the `--mvp-sidebar-bg` background (no product shell). Trivial, but flagged so the implementer doesn't reach for a product loader.

---

**Relevant files (absolute paths):**
- `src/App.tsx` — only product file edited (outer `<Switch>`, `:98-110`)
- `src/main.tsx` — ClerkProvider redirect props + QueryClient behavior (unchanged)
- `src/_core/hooks/useAuth.ts` — product `/auth/me` (why admin must NOT use it) + the `useClerkAuth` signed-in idiom the guard mirrors
- `src/pages/SignUp.tsx` — structure `AdminSignUp.tsx` mirrors
- `src/pages/SignIn.tsx` — appearance tokens
- `src/api/http.ts` — fetch boundary (consumed, unchanged)
- `src/components/mvp/primitives/index.ts` — allowed UI imports
- `eslint.config.js` — Carbon-swap boundary
- `patches/wouter@3.7.1.patch` — routing runtime
- New module root to be created: `src/admin/`
