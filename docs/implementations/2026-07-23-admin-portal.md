# Admin Portal — Implementation Summary (2026-07-22 → 2026-07-25)

Session record of building the Admin Portal frontend end-to-end: the phased
plan implementation, live manual-testing pass, and the bug fixes / feature
additions that came out of that testing (2026-07-22 → 2026-07-24), followed
by a second session (2026-07-25) adding cross-org member management, role
changes, and a soft-delete status lifecycle. Written as a memory artifact —
read this before picking the work back up. **Sections 1–5 cover the first
session; section 6 covers the second — read both, section 6 changes or
supersedes some of what section 5 lists as "current state."**

**Architecture source of truth:** `docs/plans/admin-portal-frontend.md` (Rev.
2). This doc records what actually happened against that plan, including
amendments and deviations. The plan doc itself was **not** updated to
reflect later changes (see "Stale docs" below) — don't treat it as 100%
current.

**Cross-repo feature.** Roughly half of this session's changes are in the
sibling backend repo, `Simpero_AI_Gov_Alpha` (FastAPI), not this repo. See
"Backend changes" section — if you're only looking at `git log` in
`Simpero_AI_Gov_Web`, you will miss half the picture.

---

## 1. What was built (Phases 0–5 of the plan)

New self-contained module `src/admin/`, lazy-loaded, outside the product
`AuthGate`, talking to `/api/admin/*` via `src/api/http.ts` only. Mounted in
`src/App.tsx`'s outer `<Switch>` (the one product file touched, plus
`package.json`/`pnpm-lock.yaml` for one new dependency).

- **Phase 0 — scaffold, routing, guard.** `types.ts`, `api/adminClient.ts`
  (all endpoint functions), `hooks/{queryKeys,useAdminContext}.ts`,
  `components/AdminGuard.tsx`, `AdminApp.tsx`, `pages/AdminSignUp.tsx`.
- **Phase 1 — shell + capability nav.** `components/{AdminLayout,AdminNav,
  DataState,ConfirmDialog}.tsx`, `pages/AdminHome.tsx` (capability-based
  redirect). Self-contained — deliberately does not reuse
  `MvpAppShell`/`MvpSidebar`/`buildMvpNav`.
- **Phase 2 — platform admin: Organizations.** `hooks/useOrganizations.ts`,
  `pages/Organizations.tsx`, `components/InviteMemberDialog.tsx` (F3: invite
  a product user into an arbitrary client org). Added `@hookform/resolvers`
  dependency (the standard react-hook-form ↔ zod adapter — nothing in the
  repo already provided this glue).
- **Phase 3 — org admin: Members + Invitations.** `hooks/{useMembers,
  useInvitations}.ts`, `pages/{Members,Invitations}.tsx`.
- **Phase 4 — polish/reconcile.** Audit pass; came back a zero-diff report,
  everything already correct.
- **Phase 5 — testing.** 49 unit/component tests under `src/admin/__tests__/`
  (adminClient, AdminGuard's full branch matrix, zod validation, page
  loading/error/empty/populated states, mutation → invalidate → toast).
  Plus `e2e/admin-portal.spec.ts`, gated behind `@needs-backend-fixtures` /
  `E2E_BACKEND_FIXTURES=1` like the five pre-existing gated specs.

### Amendments made to the plan during Phase 0 (approved by Vansh before implementation)

The plan document's own "Open questions for a human" section left several
things unresolved; these were decided and implemented as amendments, not
left as open questions:

1. **403 / non-admin handling** — inline "Access denied" view in
   `AdminGuard`, **not** a redirect to `/` (plan's original text). Least
   surprising: the guard shows the denial reason instead of silently
   bouncing.
2. **`/admin/sign-in` added** (beyond the plan's F2, which only specified
   `/admin/sign-up`). Mirrors `AdminSignUp.tsx`'s structure, renders Clerk's
   `<SignIn>`, `forceRedirectUrl="/admin"`. Registered in the outer
   `<Switch>` **before** the `/admin` nest route (ordering matters — a
   `nest`ed `/admin` route would otherwise swallow `/admin/sign-in`'s
   sub-routes).
3. **Guard's signed-out redirect target is `~/admin/sign-in`**, not
   `~/admin/sign-up` (the plan's original target). `/admin/sign-up` stays
   directly reachable via invite-ticket URLs (outside the guard, per F2) but
   is no longer the guard's default landing.
4. **No dual-role special-casing.** A user being both platform-admin and
   org-admin simultaneously was decided as "not expected in practice" — no
   bespoke UI/logic for that combination. `AdminHome`/`AdminGuard` just check
   `isPlatformAdmin` before `isOrgAdmin`, in that order.

---

## 2. Post-implementation: live verification pass

After the phased build, this session moved into verifying two gaps the plan
had flagged as unresolved ("`Member` row shape needs backend reconciliation"
and "no live manual walkthrough possible").

### Member shape — fully reconciled, no code change needed

Read the actual backend Pydantic schemas in `Simpero_AI_Gov_Alpha`
(`app/schemas/admin/*.py`) and cross-checked the **entire** admin API
contract against `src/admin/types.ts` field-for-field. Everything matches
exactly — `Member`, `AdminContext`, `Organization`/`CreateOrgResult`,
`Invitation`, request bodies, and the F3 endpoint. A couple of backend
responses carry fields the frontend types don't surface (e.g. `createdAt` on
the org list item) — harmless, unused, not a mismatch.

### E2E — a bigger finding than expected

Ran the full `pnpm test:e2e` suite against a live local backend
(`docker-compose.dev.yml` in the Alpha repo — Postgres + Valkey + migrations
+ FastAPI, no cloud dependency except the Clerk API itself). Result: **0
tests passed**, 36 failed, 27 skipped/gated, 7 didn't run.

Root cause, confirmed by reading the failure evidence directly (every
failure just landed on Clerk's real sign-in screen and sat there): **no e2e
spec in this repo — admin or product, gated or not — has ever actually
performed a Clerk sign-in.** There's no `setupClerkTestingToken` call, no
`storageState`, no auth fixture anywhere, including in always-on specs like
`mvp-shell-dashboard.spec.ts` that assume an authenticated session exists.
This is a **pre-existing, repo-wide gap**, not something introduced by or
specific to the admin portal work.

What *is* live-verified: the unauthenticated path. A signed-out visit to
`/admin` against the real running backend correctly redirects to
`/admin/sign-in`; `pnpm build` produces separate lazy chunks; the backend
boots and migrates cleanly from a cold local stack.

**Left out of scope, deliberately:** building real Clerk e2e auth
infrastructure for this repo (test users, `clerk.signIn()` wiring, likely a
shared `storageState` fixture) — this affects the whole e2e suite, not just
admin, and is a separate initiative from "build/verify the admin portal."
`.env.local` (gitignored) now has `CLERK_PUBLISHABLE_KEY` /
`CLERK_SECRET_KEY` populated (Vansh filled in real test-instance values
himself, never pasted into chat) — that unlocks `clerkSetup()`'s
bot-detection bypass only, **not** any actual sign-in. Whoever picks this up
next still needs to add real `clerk.signIn()`/testing-token calls to specs,
which likely also needs seeded test platform-admin and org-admin Clerk
users.

---

## 3. Bugs found and fixed during manual testing

Manual testing (Vansh clicking through the real app against the live local
stack) surfaced four issues, all resolved this session:

### a. Platform admin landed on `/members` instead of `/organizations`

**Not a code bug.** `app/api/admin/context.py` derives `isPlatformAdmin`
as `claims["tenant_id"] == settings.simpero_platform_org_id` — i.e. whether
the *currently active Clerk org* in the session matches the configured
platform org, not "is this account a platform admin somewhere." The
backend's `.env` had `SIMPERO_PLATFORM_ORG_ID` unset (defaults to `""`,
fails closed by design — the docstring says exactly this). Vansh added the
real value to `Simpero_AI_Gov_Alpha/.env` and the backend was restarted;
fixed, no code change.

### b. No sign-out button in the admin portal

Product side already has one (`MvpSidebar.tsx`, via `useAuth().logout()`),
but admin never got an equivalent — that hook is explicitly off-limits for
admin (F1: never call `/auth/me`, it JIT-provisions a product `users` row).
**Fix:** added a `SignOutButton` to `AdminLayout.tsx` using
`useClerk().signOut()` directly, landing on `/admin/sign-in` after.
Required mocking `useClerk` in the three admin page component tests that
render `AdminLayout` (`Organizations`/`Members`/`Invitations` test files).

### c. "Back to app" link removed

Per Vansh's explicit call — the admin portal should not link back into the
product shell. Replaced by the sign-out button above. **The plan document
(`docs/plans/admin-portal-frontend.md`) still describes the old "Back to
app" link** in its UI spec section — not updated, since it's a historical
planning doc, but worth knowing it's stale on this point.

### d. Platform admin became a Clerk member of orgs they create

**This was a previously-deliberate, documented backend decision** (labeled
"R1" in the backend code) that Vansh explicitly reversed: *"I want platform
user to have all the access to see all orgs and all members in that org but
they should not be part of any org apart from the Simpero platform org."*
Two changes followed from this, both in the backend repo — see next
section.

---

## 4. Backend changes (in `Simpero_AI_Gov_Alpha`, sibling repo — not in this repo's git history)

1. **`create_org` no longer leaves the creator as an org member.** Clerk's
   `POST /organizations` requires a `created_by` to seed an initial admin
   member — that's unavoidable — but `app/api/admin/organizations.py`'s
   `create_org` now calls the existing `remove_organization_membership`
   helper immediately after creating the org + seeding the invitation.
   Best-effort: a Clerk-side removal failure does not fail the request or
   undo the org/invitation (they already exist) — the outcome is recorded
   on the audit row as `creator_membership_removed: bool` instead.

2. **New endpoint: `GET /api/admin/organizations/{clerk_org_id}/members`**
   (platform-admin-guarded). Lets a platform admin view members of *any*
   client org — reads live from Clerk's membership API
   (`list_organization_memberships`, new service function in
   `clerk_admin.py`; response shape verified against the **real** Clerk API
   via a one-off script run inside the local container, not guessed from
   docs — Clerk's docs pages weren't scrapable). New router module
   `app/api/admin/platform_members.py` (mirrors the existing
   `platform_invitations.py` isolation pattern — cross-tenant reads/writes
   get their own module, visibly distinct from the org-admin's own-org
   path). New schema `OrgMemberResponse` in `app/schemas/admin/members.py`
   — distinct from `MemberResponse`: `id` here is a Clerk org-membership id
   (string), not a local `users.id` (int), since the target org's local
   rows may not exist if nobody there has signed into the product yet.

3. **3 new backend tests** added to `tests/test_admin_portal.py` (34 total,
   all passing): membership-removal-on-create-success,
   membership-removal-failure-is-best-effort, and two for the new
   cross-org members endpoint (guard denial + field-mapping success).
   `pyright`/`ruff` clean.

**Corresponding frontend changes** (this repo): `OrgMember` type in
`types.ts`, `listOrgMembers` in `adminClient.ts`, `useOrgMembersQuery` in
`useOrganizations.ts`, new `OrgMembersDialog.tsx` component wired into
`Organizations.tsx` as a per-row "View members" action (read-only). One new
`adminClient` test added for `listOrgMembers`.

---

## 5. Current state / what's left

**Working and verified (backend restarted, frontend rebuilt, both manually
re-tested against the local stack):**
- Full admin portal: sign-up, sign-in, guard (all branches), platform-admin
  Organizations page (create org, per-org invite, per-org view-members),
  org-admin Members + Invitations pages, sign-out.
- 218 frontend tests + 34 backend tests passing; both `pnpm check`/`pnpm
  lint` and `pyright`/`ruff` clean.

**Known gaps, explicitly left for later:**
1. **Repo-wide e2e auth infrastructure doesn't exist.** Not admin-specific.
   Needs: seeded test platform-admin + org-admin Clerk users, real
   `clerk.signIn()`/testing-token wiring in specs (currently just
   `test.skip` gates + placeholder comments), likely a shared
   `storageState` fixture so every spec doesn't re-authenticate. This blocks
   *all* gated e2e specs in the repo, not just `admin-portal.spec.ts`.
2. **Stale test data.** An org created during this session's manual testing
   (before the R1 membership fix), Clerk org id in the `"Simpero 2"` name,
   still has a leftover `org:member` row for the account that created it.
   Harmless (pre-fix artifact, not a live bug) but not cleaned up — offered
   to clean it up, Vansh hadn't decided by end of session.
3. **`docs/plans/admin-portal-frontend.md` is stale on two points**: it
   still describes the "Back to app" link (removed) and its Phase 0
   text/Open-Question-7 framing doesn't reflect that `/admin/sign-in` ended
   up being built in this session rather than deferred. Not updated —
   treat this implementation summary as authoritative over the plan doc
   where they conflict.
4. **Plan's own deferred items, still deferred, not touched this session:**
   a `no-restricted-imports` eslint rule to hard-enforce the admin/product
   import boundary (currently convention + code review only); reconciling
   the `type` field's free-string-vs-enum tension between create/read
   schemas (low risk, backend already constrains create to a `Literal`).
5. **Local backend `.env` now has `SIMPERO_PLATFORM_ORG_ID` set** (Vansh
   added it) — if this value is ever unset again (e.g. a fresh clone, a new
   environment), platform-admin access fails closed for everyone with no
   obvious error beyond "always lands on `/members`." Worth a comment or
   startup check in the backend if this bites again.

---

## 6. Session 2 (2026-07-25): cross-org member management, role changes, status lifecycle

Driven by more live manual testing against the deployed session-1 build,
plus new feature requests. Every backend item below was handed to a
separate `Simpero_AI_Gov_Alpha` Claude Code session as a written prompt —
**this session never edited the backend repo directly** (see the new
CLAUDE.md rule in section 6f). All of it has since been verified
**implemented and passing** in that repo (66/66 backend tests, `pyright`/
`ruff` clean) — confirmed by reading the actual backend diff at the end of
this session, not assumed from the prompts alone.

### a. Org-detail page replaces the per-row dialogs

`Organizations.tsx`'s "View members" action (a dialog: `OrgMembersDialog`)
and per-row "Invite user" dialog were replaced with a dedicated page,
`src/admin/pages/OrgDetail.tsx` at route `/organizations/:orgId` (new route
in `AdminApp.tsx`). `OrgMembersDialog.tsx` was deleted — everything it did
now lives on this page, always-fetched instead of dialog-gated
(`useOrgMembersQuery(orgId, true)`).

The org-detail page consolidates every per-org platform-admin action in one
place: members table, "Invite member", "Invite org admin" (new — see 6b),
"Delete organization" (new — see 6c), and per-row role-change + remove (new
— see 6d/6e).

### b. Invite org admin, alongside invite member

`InviteMemberDialog.tsx` was generalized to take a `role: "member" |
"admin"` prop (was hardcoded to `"member"`) — varies the trigger label,
dialog copy, and the role sent in the mutation body. `CreateInviteBody.role`
widened from `"member"` to `"member" | "admin"`.

Backend: `POST /admin/organizations/{clerk_org_id}/invitations`
(`platform_invitations.py`) now accepts both roles and maps to Clerk's
`org:member`/`org:admin` — previously hardcoded to member-only. The
org-admin's own-org `POST /admin/invitations` (`invitations.py`)
deliberately still rejects anything but `"member"` — that boundary was not
touched, only the platform cross-org path was widened.

### c. Delete organization (cascades to members)

New destructive action on the org-detail page (`ConfirmDialog` + `Button
variant="destructive"`). Backend: new `DELETE
/admin/organizations/{clerk_org_id}` (`platform_organization_delete.py`,
new module). **Verified against the real Clerk API**: `DELETE
/organizations/{id}` cascades on its own — succeeds even with active
memberships/pending invitations, no pre-check needed. Deliberately does
**not** touch local DB rows for the target org (`organisation`, `users`,
`funds`, `clerk_admin_users`) — `get_admin_db`'s RLS clamp restricts the
session to the platform admin's own org, and reaching into an arbitrary
target org's rows from a route handler was treated as a real RLS-crossing
precedent worth deferring rather than doing casually. **Known gap, left as
orphaned rows on purpose**: deleting an org via this button leaves that
org's local `users`/`clerk_admin_users` rows in place, referencing a Clerk
org that no longer exists. Not cleaned up this session — flag if it
resurfaces.

### d. Member role change (member ↔ admin), three things kept in sync

New `Select` control on the role column, both on `Members.tsx` (own org —
works identically whether the org-admin is client or platform, since it's
always "caller's own current org") and `OrgDetail.tsx` (platform admin,
arbitrary org). Backend: `PATCH /admin/members/{user_id}` (own org) and
`PATCH /admin/organizations/{clerk_org_id}/members/{clerk_user_id}`
(platform, keyed by Clerk user id not a local int id, since the target
org's local row may not exist).

**Design decision, arrived at after two false starts this session** — a
role change keeps **three things** in sync together on every promote/demote,
not just one:
1. The person's actual Clerk org membership role (`org:member` ↔
   `org:admin`) — new `update_organization_membership` service function in
   `clerk_admin.py`.
2. Local `users.role` (if a local row exists for them — skipped, not
   errored, if it doesn't; consistent with this codebase's existing
   lazy-JIT-provisioning philosophy).
3. Their `clerk_admin_users` row — created/reactivated on promote,
   deactivated on demote.

(Mid-session, this was briefly narrowed to "only `clerk_admin_users`
changes," which would have left `users.role` and Clerk's own membership role
permanently stale the moment this feature was used — corrected back to "all
three, kept in sync" before any backend work started. Worth remembering if
this area gets touched again: the three-way sync is the actual intended
design, not the narrower version.)

**Reactivation gap this surfaced, and fixed**: `AdminUserRepo.upsert()` was
`ON CONFLICT DO NOTHING` — a previously-deactivated admin being promoted
again would silently no-op and stay inactive. Backend added
`AdminUserRepo.reactivate_or_create` (real `ON CONFLICT DO UPDATE`) to
close this, since it was breaking a documented invariant ("revoke-only, no
re-activate method") on purpose.

**Guards** (both remove and demote, both own-org and cross-org endpoints):
self-change forbidden (can't remove or demote yourself — closes a real risk,
since self-demotion could lock the caller out); reject an action that would
leave an org with zero active admins (this was flagged as a known future
gap in the original `remove_member` code's own comment before this session
even started — now load-bearing).

### e. Remove member — self-guard, cross-org remove, soft-delete instead of hard-delete

`Members.tsx`: the "Remove" button is now disabled on the signed-in admin's
own row (`useUser()`'s Clerk id vs. the row's `clerkUserId`) — previously
any row, including your own, was removable, which for a single-admin org
meant a self-lockout was one click away.

`OrgDetail.tsx` gained a "Remove" action too (didn't exist before this
session — platform admins could view but not remove a client org's
members). Backend: new `DELETE
/admin/organizations/{clerk_org_id}/members/{clerk_user_id}` in
`platform_members.py`.

**Bigger change: removal became a soft-delete.** New `users.status`
(`"active"`/`"inactive"`) and `users.deactivated_at` (nullable) columns
(migration `920070316626_users_soft_delete_status.py`). Removing a member no
longer hard-deletes the `users` row — it sets `status="inactive"`,
`deactivated_at=now()`, and always revokes their Clerk org membership
(confirmed: unconditionally, even for an admin-only identity with no local
`users` row — the alternative would leave a "removed" admin still holding
real Clerk membership). Removing an admin-type target also deactivates
their `clerk_admin_users` row.

`AdminUserRepo.deactivate()` had a latent bug found in the course of this
work: its bulk `update()` statement set `status="inactive"` but never
`updated_at` — the column's `onupdate=utc_now` only fires on ORM-flush
updates, not this Core-style bulk statement. Fixed to set both explicitly.
This bug predates this session (it affected the pre-existing D3
downgrade-only sync too) but was only caught while speccing this feature.

### f. Inactive members stay visible, with one-click re-invite

Product decision, reversing an earlier draft of the same backend prompt
mid-session: **inactive members are NOT filtered out of the lists** —
`list_members`/`list_org_members` return active and inactive together, with
a new `status` field on `MemberResponse`/`OrgMemberResponse` so the
frontend can tell them apart. Rationale: admins need visibility into who's
been deactivated, and a way to bring them back, from the same screen.

Frontend: both `Members.tsx` and `OrgDetail.tsx` now sort active-first,
render a `Badge` (`success` "Active" / `neutral` "Inactive") per row, and
disable the role `Select` + "Remove" button on inactive rows (nothing left
to change on an already-removed row). Inactive rows get a new "Invite"
button instead, sending a fresh invite to the member's already-known,
stored email — one click, no re-typing. On `Members.tsx` this reuses
`useCreateInvitationMutation` and is **member-only** (that own-org endpoint
has never accepted `role: "admin"`, so a previously-admin inactive member
needs re-promoting via the role `Select` after they accept and sign back
in). On `OrgDetail.tsx` it reuses `useInviteMemberToOrgMutation` and *can*
preserve the member's last-known role, since that endpoint takes an
explicit role.

**Reactivation-on-re-login gap this surfaced, and fixed**: once someone is
soft-deleted, their Clerk membership is fully revoked, so the only way back
is a brand-new invitation — but both JIT-provisioning paths
(`_ensure_user_provisioned` in `dependencies.py`, `_ensure_admin_provisioned`
in `admin_dependencies.py`) previously only checked "does a row already
exist for this person," not "is it active," and would leave a re-invited,
re-logged-in person stuck at `status="inactive"` forever. This never
mattered before this session, since removal used to be a hard delete (a
re-invited person would just get a brand-new row). Both functions now
reactivate an existing-but-inactive row on a valid new sign-in.

### g. `AdminGuard` no longer strands a non-admin on an in-place error screen

Manual testing found: a plain product member of the Simpero platform org
(invited via the platform-admin's own Invitations tab, which invites into
the caller's *own* org — for a platform admin, that's the platform org
itself) could reach the full admin shell UI. Two separate things were going
on:

1. **A real backend bug**: `GET /admin/context`'s `is_platform_admin` was
   computed as a bare `claims["tenant_id"] == settings.simpero_platform_org_id`
   comparison — pure org-membership, not an actual privilege check. Anyone
   whose active Clerk org happened to be the platform org got
   `isPlatformAdmin: true` regardless of whether they held any
   `clerk_admin_users` row. Fixed to mirror `require_platform_admin`'s full
   check (active admin row + `admin_type == platform` + tenant match) —
   confirmed in the current backend code
   (`app/api/admin/context.py:39-47`). **No data was ever exposed** by this
   bug — every real endpoint's own guard (`require_platform_admin`) was
   always correct; this only affected which nav items rendered.
2. **A UX gap, by design until this session**: `AdminGuard` showed a static
   "Access denied" screen in place for a signed-in-but-not-admin user,
   leaving their live (non-admin) session active with no path forward.
   Changed: a signed-in user with neither `isPlatformAdmin` nor
   `isOrgAdmin` now gets redirected to `~/admin/sign-in?error=access_denied`.
   `AdminSignIn.tsx` reads that param and shows "This account doesn't have
   admin access" — if they're still signed in, it shows a "Sign out and try
   a different account" button instead of Clerk's `<SignIn/>` widget
   (rendering the widget while already signed in would just auto-bounce
   them straight back via `forceRedirectUrl`, an infinite loop). Genuine
   fetch failures (network/5xx/401) are checked *before* this branch and
   still get the original in-place `AccessDenied` state — that's a
   different kind of problem, not an authorization verdict.

### h. Smaller items

- **Optional `accountManagerEmail` on org creation** — was required, now
  optional. `CreateOrgBody.accountManagerEmail?`, `OrganizationCreated.
  invitation` is `Invitation | null` (backend skips seeding an invitation
  when no email given). Backend: `account_manager_email: EmailStr | None`,
  `CreateOrgResult.invitation` optional.
- **Bug fix — org-detail role `Select` rendered blank.** `OrgMember.role`
  is Clerk's raw `"org:admin"`/`"org:member"` string (unlike `Member.role`,
  which is the plain `"admin"`/`"member"` local column), so binding it
  straight into a `Select` whose `SelectItem`s only have plain values
  produced no match → empty trigger. Fixed by normalizing in `OrgDetail.tsx`
  before passing it to `Select`. The test fixtures were also fixed — they'd
  been using fake plain-string roles, which is exactly why the bug wasn't
  caught originally; a regression test now asserts the raw-role case
  explicitly.
- **Config gotcha found, not a code bug**: invitation redirect URLs
  (`settings.app_base_url`, used for the `/admin/sign-up` and `/sign-up`
  redirect targets) default to `http://localhost:3000` in
  `Simpero_AI_Gov_Alpha/app/core/config.py`, and the local `.env` never
  overrode it — but this repo's Vite dev server runs on **5173**. Any
  invitation link generated against a local backend pointed at a dead port.
  Fix is a one-line env addition (`APP_BASE_URL=http://localhost:5173` in
  the backend's `.env`) — not made automatically since it's the backend
  repo's own config; flagged to Vansh to add himself.
- **"Invitations" nav item, clarified (no code change)**: it's the
  org-admin's own-org invite page (`/admin/invitations`) — always targets
  the caller's *own current org* (`claims["tenant_id"]`), forced to
  `role: "member"` server-side. For a platform admin, whose own current org
  *is* the Simpero platform org, this means "Invitations" invites people
  into Simpero's internal team, not into any client org — easy to
  mis-read given it sits in the same nav as "Organizations." This is what
  originally surfaced the bug in 6g.

**Backend files touched this session** (`Simpero_AI_Gov_Alpha`, verified via
`git status`/reading the actual diff, not just the prompts sent):
`app/api/admin/{organizations,members,invitations,platform_invitations,
platform_members}.py`, new `app/api/admin/platform_organization_delete.py`,
`app/core/{dependencies,admin_dependencies,config}.py`,
`app/models/organisation.py`, `app/repo/{UserRepo,AdminUserRepo}.py`,
`app/schemas/admin/{organizations,members,invitations}.py`,
`app/services/admin/clerk_admin.py`, new migrations
`588db2facf84_clerk_admin_users_updated_at.py` and
`920070316626_users_soft_delete_status.py`, `tests/test_admin_portal.py`
(66 tests total, all passing; `pyright`/`ruff` clean).

**Frontend test count**: 232 tests across `src/admin/__tests__/` (up from
218 at end of session 1), `pnpm check`/`pnpm lint` clean.

### Known gaps after session 2

1. **Orphaned local rows on org delete** (6c) — deleting a client org
   leaves its local `users`/`clerk_admin_users` rows pointing at a
   nonexistent Clerk org. Deliberate deferral, not a bug, but worth
   revisiting if org deletion becomes a frequent operation.
2. **`APP_BASE_URL` still needs manual setup** in the backend's local
   `.env` (6h) — not yet added.
3. Everything from session 1's "known gaps" (section 5) that wasn't
   specifically addressed above still stands, especially the repo-wide e2e
   auth infrastructure gap (item 1 there) — untouched this session.
