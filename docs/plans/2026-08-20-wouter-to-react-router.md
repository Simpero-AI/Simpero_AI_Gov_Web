# Plan: Replace wouter with react-router, and fix issue #3 (unsaved-changes navigation guard) on top of it

## 0. Decisions confirmed with Vansh (2026-08-20)

- **R1 resolved: replace, not push.** All 31 redirect sites use `<Navigate replace />`. Back button skips over redirect pages entirely; `App.test.tsx`'s history assertions get updated to match.
- **R7 resolved: `AlertDialog` primitive**, not a hand-rolled match of the reset modal — accessibility (focus trap, Escape-to-dismiss) comes free.
- **R8 resolved: in scope.** Phase 6 also lifts the `beforeunload` listener out of `EditableMandateBlock.tsx` into `MandateScorecard.tsx`, gated on `anyDirty` (all three tabs), fixing the same bug for the browser reload/close case.
- **R5: de-risk early.** A throwaway spike (new Phase -1 below) validates Clerk's sign-in/sign-up flow against react-router before the full 37-file migration starts, rather than discovering a problem only at the Phase 5 gate.

## 1. Problem restatement

Two changes in one plan: (a) swap `wouter@3.7.1` (patched) for `react-router` across all 37 importing files — product routing in `src/App.tsx` and the admin portal's nested routing in `src/admin/AdminApp.tsx`; (b) use react-router's `useBlocker` — which wouter has no equivalent for — to warn before an in-app navigation away from `/mandate-scorecard/*` while *any* of the three editable tabs is dirty. (b) is the reason (a) is worth doing now; (a) is a pure transport swap with a pixel-identical obligation.

Nothing here touches RLS, tenant context, DB roles, auth enforcement, or the parsing pipeline — this is a frontend-only change in the Web repo. The one auth-adjacent surface (Clerk's `<SignIn routing="path">` flow) is addressed in Phase 1 as an explicit no-change decision, not an oversight.

## 2. Architectural decisions

**D1. Target `react-router@7.18.2` (`version-7` dist-tag), not v8.**
v8.3.0 is latest but requires Node `>=22.22.0` and is ESM-only; `package.json` declares `engines.node: ">=20.16.0"` and `docs/plans/2026-07-26-do-deployment-plan.md` R1 already flags DO's Node buildpack as a live risk. v7.18.2 supports React 19, has everything we need, and costs no infra change. Upgrade trigger for v8: when the repo bumps to Node 22.

**D2. Single package: import from `react-router`, never `react-router-dom`.**
In v7 `react-router-dom` is a compatibility mirror. One dependency, one import specifier, and it's already the v8-ready shape.

**D3. Data-router mode: `createBrowserRouter` + `RouterProvider`. Not `<BrowserRouter>`.**
Forced by the issue #3 requirement: `useBlocker` is available in framework and data mode only, and explicitly *not* in declarative (`<BrowserRouter>`) mode. This is the single decision that shapes the whole migration — pick it up front, don't migrate declaratively and re-migrate later.

**D4. Route objects live in a new `src/routes.tsx`, exported separately from the router instance.**
`createBrowserRouter(routes)` happens in `main.tsx`; tests call `createMemoryRouter(routes, { initialEntries })`. Without this split, `App.test.tsx` can't drive routing at all in data mode.

**D5. `App.tsx` becomes the root layout route element.**
It keeps `ErrorBoundary` → `ThemeProvider` → `TooltipProvider` → `Toaster` and renders `<Outlet />` where the `<Switch>` used to be. Same providers, same order, same rendering; the route table just moves out. `AuthGate` becomes a pathless layout route (`<AuthGate><Outlet /></AuthGate>`), mirroring today's `<Route><AuthGate><Router /></AuthGate></Route>` one-for-one.

**D6. `ClerkProvider` stays exactly where it is in `main.tsx`, outside the router. No `routerPush`/`routerReplace` wiring.**
Clerk v5 offers `routerPush`/`routerReplace` (wired from `useNavigate`) to make its internal path routing soft-navigate, but ClerkProvider has *no* navigate override today, so Clerk is already doing its default hard navigation. Leaving it untouched is byte-identical behavior and zero risk; wiring it would be a behavior *change* smuggled into a transport swap. Note the upgrade path in a comment and move on.

**D7. Admin portal mounts as `/admin/*` → lazy `AdminApp`, which owns a descendant `<Routes>`.**
This is the exact coupling level that exists today (`<Route path="/admin" nest>`): the product route table knows one path prefix and one lazy import, nothing else. Descendant `<Routes>` inside a data router are supported (they just don't get data-router APIs, which admin doesn't use). Alternative — hoisting admin routes into the product route array as `children` — would put admin route definitions inside product code and is rejected on CLAUDE.md's separation rule.

**D8. Admin links become absolute `/admin/...` via a new admin-local `ADMIN_ROUTES` constant.**
react-router has no `base` equivalent for descendant routes, and relative `<Link to="organizations">` resolves against the *matched route*, not the URL — a well-known footgun that would produce `/admin/organizations/organizations`. Admin already hardcodes `/admin/sign-in` in three places (`AdminGuard`, `AdminSignIn`, `AdminSignUp`), so absolute paths are consistent with existing code. The constant lives in `src/admin/` — the product never imports it, admin never imports the product's `ROUTES`.

**D9. `<Redirect to>` → `<Navigate to replace />` everywhere, consistently. Never `useNavigate()` in an effect for the render-return pattern.**
All 31 `Redirect` sites are the render-return pattern; `<Navigate>` is the direct idiom. `useNavigate()` is reserved for event handlers and existing effects. **Confirmed with Vansh (§0, R1): use `replace`.** wouter's `<Redirect>` calls `navigate(to, props)` with no `replace` default, i.e. it currently pushes, which traps the back button in a redirect loop through these "this URL is not a real destination" pages. `replace` fixes that as a deliberate, approved behavior change; `App.test.tsx`'s history assertions need updating to match.

**D10. The wouter patch and the `pnpm.patchedDependencies` entry are deleted outright, with no react-router equivalent.**
`window.__WOUTER_ROUTES__` has **zero consumers** — grepped across `src/`, `e2e/`, and configs; the only mentions are the patch itself and a CLAUDE.md gotcha describing the patch. `e2e/` uses only `page.goto(url)`, never route introspection. Nothing to replace.

**D11. Route ordering hazard disappears — react-router ranks by specificity, not declaration order.**
The `/admin/sign-in` and `/admin/sign-up` "must precede `/admin`" constraint (and the comments enforcing it in `App.tsx` and CLAUDE.md) become obsolete: `/admin/sign-in/*` outranks `/admin/*` regardless of order. Update the docs rather than leaving a stale warning.

**D12. Phases 0–5 (the swap) land as one PR; Phase 6 (the bug fix) as a second PR on top.**
Two routers cannot coexist for the same routes, so partial migration isn't a valid intermediate state — the swap is atomic by nature. But the `useBlocker` fix is independently reviewable and independently revertable, and it's the part that changes user-visible behavior. Splitting keeps "did the swap regress anything?" and "is the new guard right?" as separate review questions.

## 3. Path-syntax translation table

Every distinct pattern actually present in this codebase:

| wouter | react-router v7 | Notes |
|---|---|---|
| `<Switch>` + `<Route>` | route objects in `createBrowserRouter` | product tree only |
| `<Switch>` + `<Route>` (admin) | `<Routes>` + `<Route>` descendant | admin keeps JSX form |
| `<Route path="/x" component={C} />` | `{ path: "/x", element: <C /> }` | |
| `<Route path="/x/:id">{(p) => …}</Route>` | `{ path: "/x/:id", element: <XRoute /> }` + tiny wrapper calling `useParams()` | 6 sites, see §4 Group B |
| `:step?`, `:sub?` (optional param) | `:step?`, `:sub?` — **natively supported** since v6.5 | no rewrite needed |
| `path="/sign-in"` + `path="/sign-in/*"` | keep **both** entries | RR docs don't confirm `/x/*` matches bare `/x`; not worth the risk on the auth path |
| `<Route>` with no path (fallback) | `{ path: "*", element: <NotFound /> }` | |
| `<Route path="/admin" nest>` | `{ path: "/admin/*", element: <Suspense><AdminApp /></Suspense> }` | AdminApp owns the rest |
| `<Router base="/admin">` | no equivalent — absolute `/admin/...` via `ADMIN_ROUTES` (D8) | |
| `~/foo` (escape base) | `/foo` | `~/` → `/`, `~/admin/sign-in` → `/admin/sign-in` |
| `<Redirect to="/x" />` | `<Navigate to="/x" replace />` | see D9/R1 |
| `<Link href="/x">` | `<Link to="/x">` | 50 sites, mechanical |
| `const [loc] = useLocation()` | `const { pathname } = useLocation()` | **returns full path, not base-relative** — matters for `AdminNav` |
| `const [, nav] = useLocation()` | `const nav = useNavigate()` | |
| `nav(p, { replace: true })` | identical signature | |
| `useSearch()` → `"a=1"` | `useLocation().search` → `"?a=1"` | all 3 consumers feed `new URLSearchParams(...)`, which tolerates the `?` — safe drop-in |
| `location.split("?")[0]` | `pathname` | 2 sites (`DealDetail`, `MandateScorecard`) |
| `useParams<{ token: string }>()` | identical | 3 sites |
| `useRoute("/memo/:sessionId")` → `[match, params]` | `useParams()` | 1 site (`MemoDeliverable.tsx:142`); the component is already rendered *by* that route, so the match check is redundant — `const { sessionId = "" } = useParams()`. The other "useRoute" grep hit was a substring false positive. |

## 4. File-level plan (sequenced)

Order matters: shell before leaves (leaves need router context to exist), leaves before tests, tests before dependency removal (so `pnpm check` proves the swap before wouter is gone).

**Phase -1 — Clerk auth spike (throwaway, confirmed in scope — §0, R5).** Do this before Phase 0. On a scratch branch: install `react-router` alongside wouter (both present is fine for this one-off check, since nothing else changes), and swap *only* `src/main.tsx`/`src/App.tsx`'s router shell — `createBrowserRouter`/`RouterProvider` wrapping a single catch-all route that renders the existing `<App />` tree unchanged (product routes still resolved by wouter's own `<Switch>` underneath, exactly as today). This isolates the one variable in question: does Clerk's `<SignIn routing="path">` sub-routing (`/sign-in/factor-one`, SSO callbacks) still work once react-router's `RouterProvider` is mounted at the root, given wouter's global `history.pushState` patching is what's changing. Manually run: sign-in, sign-up, sign-out, `/admin/sign-in` with `?error=access_denied`. Discard the branch either way — this is not reusable code, it's a go/no-go check. If a flow hangs or double-navigates, the known fix is wiring Clerk's `routerPush`/`routerReplace` to `useNavigate()` (see D6) — decide then whether that's in-scope for Phase 1 or its own follow-up, don't wire it speculatively now. Green spike → proceed to Phase 0 as planned.

**Phase 0 — dependencies & config.** No app code.
- `package.json` — add `"react-router": "7.18.2"` (pin exact; `^7` would drift toward the v8 boundary). Leave `wouter` in place for now.
- `vite.config.ts` and `vitest.config.ts`: **verified — no changes needed.** No wouter-specific config exists; `@` / `@shared` aliases are untouched by this migration.

**Phase 1 — router shell (3 files).**
- **NEW** `src/routes.tsx` — exports `routes: RouteObject[]`. Contains the root layout entry (`element: <App />`), the public routes, the `/admin/*` entry, the pathless `AuthGate` layout route, and the product routes as its children. Also contains the six param-wrapper components (Group B below) — they're route plumbing, they belong next to the table, not in separate files.
- `src/App.tsx` — becomes the root layout: providers + `<Outlet />`. `Router()` is deleted (its contents move to `routes.tsx`). Add a 3-line `AuthGateLayout` = `<AuthGate><Outlet /></AuthGate>`; `AuthGate` itself keeps its current `children` signature unchanged.
- `src/main.tsx` — `createBrowserRouter(routes)` + `<RouterProvider router={router} />` replacing `<App />`. **ClerkProvider and ClerkTrpcProvider stay exactly where they are** (D6).

*Group B — the six inline render-prop routes that become wrappers in `routes.tsx`:* `/mandate-scorecard/:section`, `/new-deal/:step?`, `/deals/:dealId/screening`, `/deals/:dealId/analysis/:sub?`, `/analysis/:dealId`, `/intelligence/memory/:sub?`. Each wrapper calls `useParams()` and passes the same props as today. **Keep the existing `if (!params.dealId) return <NotFound />` guards verbatim** — they're now unreachable (a matched non-optional param can't be empty) but removing them is a behavior refactor, which the pixel-identical rule forbids in this PR.

**Phase 2 — product leaf call sites (22 files).** Mechanical, per the §3 table.
- Link-only (`href` → `to`): `src/components/mvp/dealDetail/DealHeaderCard.tsx`, `src/components/mvp/deals/DealsTable.tsx`, `src/pages/dealAnalysis/ScorecardTab.tsx`.
- Location-only (`[loc] = useLocation()` → `useLocation().pathname`): `src/components/mvp/shell/MvpAppShell.tsx`, `MvpSidebarItem.tsx`, `MvpSidebarSubNav.tsx` (two call sites in that file). All three do `location === href || location.startsWith(\`${href}/\`)` — semantics are unchanged because these are product routes at app root.
- Navigate-only (`[, nav] = useLocation()` → `useNavigate()`): `src/pages/NotFound.tsx`, `SharedMemo.tsx`, `MethodologyDashboard.tsx`, `History.tsx`, `VerifyOutput.tsx`, `ProductUsage.tsx`, `MemoViewer.tsx`, `Deals.tsx`.
- Redirect-only (`<Redirect>` → `<Navigate replace />`): `src/pages/InvestmentOnboarding.tsx`, `AnalysisRedirect.tsx`, `ScreeningRedirect.tsx`, `intelligence/InstitutionalMemory.tsx`.
- Mixed / needs care: `src/pages/DealDetail.tsx` (`useSearch` + `location.split("?")[0]` → `pathname`, plus `Link`s and a second `useNavigate`), `src/pages/MandateScorecard.tsx` (same shape), `src/pages/MemoDeliverable.tsx` (`useRoute` → `useParams`).
- **`src/pages/NewDealWizard.tsx` — frozen-flow file.** Only `useLocation`/`useSearch` change (11 `navigate(...)` calls keep identical arguments). The `?dealId=` read at line 74–78 goes through `new URLSearchParams`, so the leading-`?` difference is a non-event. Required verification: `/new-deal` and `/new-deal/upload-files` and `/new-deal/confirm` all still resolve through the `:step?` optional param, and `navigate("/analysis/${dealId}")` at line 313 still lands on the deal-analysis redirect. `src/pages/newDealWizard/**` imports nothing from wouter — confirmed, untouched.

**Phase 3 — admin portal (7 files).**
- **NEW** `src/admin/adminRoutes.ts` — `ADMIN_BASE = "/admin"` plus the path constants. Admin-local; no product import in either direction.
- `src/admin/AdminApp.tsx` — `<Switch>` → `<Routes>`; child paths become relative-to-splat (`organizations`, `organizations/:orgId`, `mandate-taxonomy`, `members`, `invitations`), index route for `/`, and the fallback `<Route path="*" element={<Navigate to="/" replace />} />` (wouter's `~/` → `/`).
- `src/admin/components/AdminGuard.tsx` — two `<Redirect to="~/admin/sign-in…">` → `<Navigate to="/admin/sign-in…" replace />`.
- `src/admin/components/AdminNav.tsx` — **the one non-mechanical admin change.** Its hrefs are base-relative (`/organizations`) and compared against wouter's base-stripped location. Under react-router `useLocation().pathname` is `/admin/organizations`, so both the hrefs and the `isActive` comparison must be rebased onto `ADMIN_ROUTES`. Getting this wrong silently breaks nav highlighting, not rendering — check it visually.
- `src/admin/pages/AdminHome.tsx` — three `<Redirect>` → `<Navigate replace />`, with `/organizations` → `/admin/organizations`, `/members` → `/admin/members`, `~/` → `/`.
- `src/admin/pages/OrgDetail.tsx` — `useParams` unchanged; `setLocation("/organizations")` → `navigate(ADMIN_ROUTES.organizations)`; `<Link href="/organizations">` → `<Link to={...}>`.
- `src/admin/pages/Organizations.tsx` — `<Link href={\`/organizations/${id}\`}>` rebased.
- `src/admin/pages/AdminSignIn.tsx` / `AdminSignUp.tsx` — **no changes.** They import no router; their Clerk `path="/admin/sign-in"` props already carry the full path.

**Phase 4 — tests (9 files).** Two harness shapes, applied consistently:
- *Data-router harness* (anything exercising the real route table or route params): `createMemoryRouter(routes, { initialEntries: [path] })` + `<RouterProvider>`. Used by `src/App.test.tsx` — and it gets *simpler*, since `routes` is directly importable and the redirect assertions can read `router.state.location.pathname` instead of wouter's `memoryLocation({ record: true })` history array.
- *Page-under-test harness* (component rendered directly, router only needed for context): `<MemoryRouter initialEntries={[path]}>`. Used by `src/pages/MandateScorecard.test.tsx`, `DealDetail.test.tsx`, `ScreeningRedirect.test.tsx`, `AntiPortfolio.test.tsx`, `intelligence/InstitutionalMemory.test.tsx`, `src/admin/__tests__/OrgDetail.test.tsx`, `AdminGuard.test.tsx`, and `src/admin/__tests__/testUtils.tsx`'s `renderAdmin` (`<Router base="/admin">` → `<MemoryRouter initialEntries={["/admin"]}>`).
- Specific notes:
  - `ScreeningRedirect.test.tsx` and `App.test.tsx` currently assert on `memoryLocation`'s recorded `history` array. There is no react-router equivalent — replace with `createMemoryRouter` + assert `router.state.location.pathname`, or render a probe route at the redirect target and assert it appears. Prefer the former for the redirect specs.
  - `OrgDetail.test.tsx` and `AntiPortfolio.test.tsx` and `InstitutionalMemory.test.tsx` wrap the component in a real `<Route>` so param changes re-render. Keep that structure: `<MemoryRouter initialEntries={[path]}><Routes><Route path="…" element={…} /></Routes></MemoryRouter>`.
  - `AdminGuard.test.tsx` mocks `wouter`'s `Redirect` to spy on the target. Direct translation: `vi.mock("react-router", async (io) => ({ ...(await io()), Navigate: (p) => { redirectSpy(p.to); return null; } }))`, and update the two expected targets from `~/admin/sign-in…` to `/admin/sign-in…`.
  - `MandateScorecard.test.tsx` passes `section` as a literal prop and switches tabs by re-rendering, not by `<Link>` clicks — except the first test, which *does* click `role="tab"` links. Under `MemoryRouter` those clicks navigate the memory history but the `section` prop stays fixed, which is exactly what that test already relies on. Keep the harness comment at lines 111–113 accurate.
  - `src/admin/__tests__/AdminSignIn.test.tsx` — no router usage; untouched.

**Phase 5 — cleanup.**
- `package.json` — remove `wouter` from `dependencies`; remove the entire `pnpm.patchedDependencies` key (`wouter@3.7.1` is its only entry). Leave `pnpm.overrides` and `pnpm.onlyBuiltDependencies` alone.
- Delete `patches/wouter@3.7.1.patch` (and the `patches/` directory if it's now empty).
- `pnpm install` to regenerate the lockfile.
- Docs: `CLAUDE.md` — rewrite the "pnpm config must live in package.json" gotcha (the pnpm-config lesson is still true and worth keeping; the wouter-patch example and the `__WOUTER_ROUTES__` check are dead), and drop the `/admin/sign-in` ordering warning from the Admin Portal section (D11). `README.md` line 10 stack list. `docs/split-implementation-status.md` line 16/40 and `docs/pending-on-vansh.md` line 185 and `docs/plans/2026-07-26-do-deployment-plan.md` R1 all reference the patch as a live deployment risk — that risk is now retired; add a dated note rather than rewriting historical plan docs.
- Gate: `pnpm lint && pnpm check && pnpm build`, then a manual click-through of every route in the §3 table, then `pnpm test:e2e` to whatever extent it runs today (see R4).

## 5. Phase 6 — the issue #3 fix (separate PR)

Single file: `src/pages/MandateScorecard.tsx`, plus a deletion in `EditableMandateBlock.tsx`.

**Where.** With the other hooks, immediately after `const navigate = useNavigate()` at what is currently line 82 — i.e. **before** the `if (!section || !VALID_SECTIONS.includes(...))` early return at line 93. Hooks cannot sit below that return.

**What it blocks on.** Not a bare boolean — a function, so same-page navigation stays unblocked:

```
const anyDirty = firmState.dirty || mandateState.dirty || frameworkState.dirty;
const blocker = useBlocker(({ nextLocation }) =>
  anyDirty && !nextLocation.pathname.startsWith(ROUTES.mandateScorecard)
);
```

The prefix check is load-bearing for two reasons: tab switches are real `<Link>` navigations to `/mandate-scorecard/:section` (blocking them would make the page unusable), and `setDealId` at line 84–91 does a `replace` navigation to add `?dealId=` on the same path. Both must pass through silently.

**Explicitly unchanged:** `activeState` / `saveState` / the topbar indicator stay scoped to the active tab, per the comment at lines 104–107. The blocker's `anyDirty` is a *different* condition for a *different* purpose, and the two must not be collapsed into one variable.

**What the user sees.** `blocker.state === "blocked"` renders a confirmation dialog as a sibling of `<MvpAppShell>` — same position as `MandateHistoryDrawer` and the reset modal, per the comment at lines 261–264. **Confirmed with Vansh (§0, R7): `AlertDialog` from `@/components/mvp/primitives`** (already installed, `alert-dialog.tsx` exists), not a hand-rolled match of the nearby reset modal — it gives focus trap, Escape-to-dismiss, and `role="alertdialog"` for free. Two actions, both live:
- "Stay on this page" → `blocker.reset()` (also the Escape / overlay-dismiss path)
- "Leave and discard changes" → `blocker.proceed()`

Not a dead end in any path: every exit from the dialog either returns the user to the page with edits intact, or completes the navigation they asked for. Body copy should name which tabs are dirty (derived from the three state flags) so "discard" is an informed choice.

**Also in this PR — the same bug's other half. Confirmed in scope (§0, R8).** The `beforeunload` listener at `EditableMandateBlock.tsx:392–402` is gated on *that block's* `isDirty` only, so a dirty Firm Profile or Scoring Framework is silently lost on browser reload too — same defect class, same page, one rung up. Delete that effect and lift it into `MandateScorecard.tsx` next to the blocker, gated on the same `anyDirty`. `EditableMandateBlock` is imported only by `MandateScorecard.tsx` (and its own test), so there's no other consumer to break, and no existing test covers the listener.

**Test to leave behind.** One case in `MandateScorecard.test.tsx`: mount at `/mandate-scorecard/firm` inside a `createMemoryRouter` with a second route, make a tab dirty, navigate to the other route, assert the dialog appears and the location didn't change; then assert "Stay" dismisses it and "Leave" completes the navigation. Plus one case asserting a *tab switch* is **not** blocked — that's the regression that would make the page unusable and it's the one worth pinning.

## 6. Risks and open questions

- **R1 — resolved, see §0.** `replace` confirmed for all 31 `<Navigate>` sites.
- **R2.** Whether react-router's `path="/x/*"` also matches bare `/x` is not confirmed by the docs. Mitigated by keeping both `/sign-in` and `/sign-in/*` entries (and the admin equivalents) rather than relying on it. Low risk because it's mitigated, but it's an assumption I didn't verify empirically.
- **R3.** `AdminNav`'s base-relative location comparison (Phase 3) fails *silently* — nav highlighting stops working, nothing throws. Needs a human visual check, not just a green test run.
- **R4 (can't fully verify).** Per CLAUDE.md, the e2e suite **cannot pass today** — no backend serves `/api`, and five specs are gated behind `E2E_BACKEND_FIXTURES=1`. I confirmed the specs use only `page.goto(url)` and contain no wouter-specific hooks, so nothing in `e2e/` needs a react-router equivalent. But I cannot confirm the suite's *current* pass/fail baseline, so "e2e still passes" is not a usable acceptance gate for this PR. Recommend capturing the pre-migration e2e result as the baseline and comparing, rather than expecting green.
- **R5 — resolved, see §0 and Phase -1.** De-risked with a throwaway spike before the full migration starts, rather than gated only at the end. Still the highest-uncertainty item in the plan; the spike is what makes it cheap to be wrong about.
- **R6.** The `NewDealWizard` flow is pixel-and-behavior frozen per CLAUDE.md's carve-out-inside-the-carve-out. Its 11 `navigate()` calls translate with identical arguments, but the `:step?` optional-param route is the one place where a syntax difference could change *which* step renders. Manual walk of the full wizard is a hard gate.
- **R7 — resolved, see §0.** `AlertDialog` primitive confirmed for the issue #3 dialog.
- **R8 — resolved, see §0.** `beforeunload` fix confirmed in scope for Phase 6.
- **Not blocking, worth knowing:** `react-router@7.18.2` peer-depends on React `>=18`; the repo is on React `^19.2.1`, fine. The v8 line's `>=19.2.7` peer would also be satisfied by `^19.2.1` at install time — the blocker for v8 is Node 22, not React.

## 7. Handoff instructions for the implementer

Run Phase -1 (Clerk spike) first, on a scratch branch, discarded regardless of outcome. Then execute Phases 0–5 as one PR, then Phase 6 as a second PR. Do not start Phase 6 until Phases 0–5 are merged.

1. **Do not deviate from D1/D3.** `react-router` pinned to exactly `7.18.2`, data-router mode. If something seems easier with `<BrowserRouter>`, it isn't — `useBlocker` doesn't exist there and Phase 6 dies.
2. **Do not import `react-router-dom`.** Every import is from `react-router`.
3. **Do not add any coupling between `src/admin/**` and the product.** Admin gets its own `src/admin/adminRoutes.ts`; it never imports `ROUTES` from `src/components/mvp/nav/mvpNav.ts`, and product code never imports from `src/admin/` except the existing lazy `AdminApp`/`AdminSignIn`/`AdminSignUp` imports in the route table. If you find yourself wanting to share a path constant across that line, duplicate the string.
4. **Do not "clean up" while migrating.** No `useSearchParams()` refactors, no removing the unreachable `if (!params.dealId)` guards, no touching the `activeState`/`saveState` active-tab scoping in `MandateScorecard.tsx`, no restructuring the reset modal. Pixel-identical means the diff is router constructs and nothing else — `<Navigate replace />` (§0/R1) is the one deliberate, approved exception to that rule.
5. **Do not delete `wouter` or the patch until `pnpm check` is green with react-router in place** — that ordering is what proves the swap before the escape hatch is gone.
6. Acceptance for PR 1: `pnpm lint` clean at `--max-warnings=0`, `pnpm check` green, `pnpm build` succeeds, `node_modules` contains no `wouter`, and a manual walk of every path in the §3 table plus the full New Deal wizard (R6) and all four auth flows (already validated once by the Phase -1 spike, re-verify against the real migrated code here).
7. Acceptance for PR 2: the two new `MandateScorecard.test.tsx` cases from §5, plus a manual check that switching between all four tabs while dirty never shows the dialog, that navigating to `/` while dirty does, and that closing/reloading the tab with any of the three tabs dirty shows the browser's native warning (R8).
