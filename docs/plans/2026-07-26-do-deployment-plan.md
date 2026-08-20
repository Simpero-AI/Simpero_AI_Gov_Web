# Frontend Deployment to DigitalOcean — Architecture Plan

> **Status:** plan, pre-implementation. Nothing in `infra/` or `.github/workflows/deploy.yml` exists yet;
> this is greenfield, not a migration of existing IaC. Written 2026-07-26. Per the docs-map convention,
> this may drift from what ships — the post-hoc record goes in `docs/implementations/`.
>
> **Scope:** this repo only (`Simpero_AI_Gov_Web`, the static Vite SPA). No backend infrastructure is
> designed here. Where the frontend needs a value the backend owns, it is named as a dependency and
> nothing more (see "Backend dependencies").

---

## Summary of decisions

| # | Decision | One-line rationale |
|---|---|---|
| D1 | **DigitalOcean App Platform static site** (not Droplet+nginx, not Spaces+CDN) | The only DO product that serves an unknown deep link as **HTTP 200 + `index.html`** — Spaces CDN cannot do this at any price (verified 2026-07-27, see Alternatives). Managed TLS, CDN, and zero servers to patch come along with it. |
| D2 | **Two separate Apps** — `simpero-web-staging` (tracks branch `staging`), `simpero-web-production` (tracks branch `main`) | Clean split of Clerk instances (`pk_test` vs `pk_live`), domains, and state; App Platform has no slot/promotion model worth bending to. The tracked branch is just the `github_branch` var per `.tfvars` — no new module surface. |
| D3 | **DO builds from source (Node buildpack)**, GitHub Actions does *not* ship a `dist/` artifact | Every `VITE_*` value here is public by design (publishable key, API origin, analytics ids), so there is no secret-handling reason to move the build — and source-build avoids a container registry, a Dockerfile, and artifact plumbing. |
| D4 | **`deploy_on_push = false`**; deployments are created explicitly by `doctl apps create-deployment` | This is what makes deployment gated rather than automatic — without it, App Platform ships on every push to the tracked branch. |
| D5 | **Branch↔environment pairing is the deployment model, enforced not conventional**: `staging` → staging App, `main` → production App. No `release` pointer branch. | `main` only advances via reviewed promotion from `staging`, so its tip *is* the intended production artifact — a second pinned branch would buy pinning that `main` now provides by construction, at the cost of a force-push job and a fourth branch nobody reviews. Enforcement is GitHub Environment deployment-branch policies plus a fail-fast workflow guard (see `deploy.yml`). |
| D6 | **Terraform state in DO Spaces** (S3-compatible backend), one bucket per environment **shared with the backend repo**, `frontend/`-prefixed state key | Keeps everything in one vendor we already need an account with; the missing lock table is covered by a workflow `concurrency` group (see R3). The bucket (`simpero-tf-state-staging` / `simpero-tf-state-production`, V3) is **not** exclusive to this repo — `Simpero_AI_Gov_Alpha` shares it under `backend/`. This is a deliberate, accepted trade-off (V3): DO Spaces keys can't be scoped below bucket level, so the `frontend/` prefix is self-documentation, not an isolation mechanism — either repo's CI key can reach the other's state. |
| D7 | **Terraform lives in `infra/`**, one root module, per-environment `.tfvars` + `-backend-config` (no workspaces) | Explicit files beat implicit workspace state; a wrong `terraform workspace select` is a silent cross-environment apply. |
| D8 | **CI stays auto-triggered and gains `push: [main, staging]` + `workflow_call`**; deploy is a separate `workflow_dispatch`-only `deploy.yml` | CI must never become manual; `staging` is where active development lands and needs the same signal as `main`; the deploy workflow calls CI's `quality` job rather than duplicating it. |
| D9 | **`VITE_API_BASE_URL` is set explicitly per environment** to the backend App's origin (cross-origin), not left empty for same-origin `/api` | See D9-note — same-origin ingress is not achievable across two separately-owned Apps. |
| D10 | **Each App is assigned into a pre-existing, shared DO Project** (`"Simpero-Staging"` for staging, `"Simpero-Prod"` for production) via `digitalocean_project_resources`, added 2026-07-29 | Discovered by reading (read-only) the backend repo's already-live Terraform, which assigns its droplets into shared DO Projects with a comment marking them "shared with the frontend and services repos" — exact names confirmed directly by Vansh 2026-07-30 as `"Simpero-Staging"`/`"Simpero-Prod"`. `digitalocean_app` exposes a `urn` attribute (confirmed against the provider schema), so the App Platform apps can join the same projects DO's console already uses to group all of this product's cross-repo infra. Not creating the projects — only looking them up by name (`data.digitalocean_project`) and assigning into them. |
| D11 | **`deploy.yml`/`destroy.yml` reworked to mirror the backend repo's pipeline** — single `DO_TOKEN` per environment (RO/RW split dropped), a `<env>-plan`/`<env>` Environment pair (branch-restricted even for `plan`), a `run_terraform` toggle (routine deploys skip Terraform), `APP_ID`/`LIVE_URL`/`DEFAULT_INGRESS` as Environment variables instead of job outputs, and a new `destroy.yml`. Added 2026-07-29 | Explicit ask: "reuse tokens from alpha as much as possible" and "the deploy workflow should be as similar as possible as the alpha one," with "doesn't have to be exact copy, follow best practices." The backend repo's shape is proven (staging fully live there); adapted rather than copied verbatim since it deploys to a Droplet via Docker/SSH and we deploy to a managed PaaS — no image build, no SSH, no `.env` generation here. Kept `guard` and a standalone `smoke` job as deliberate additions beyond the backend repo's own pattern. |

### D9-note — the same-origin `/api` assumption needs revisiting

`.env.example`, `README.md:31`, and `src/api/http.ts:10` all describe production as *same-origin*: an empty
`VITE_API_BASE_URL` with "DO ingress" routing `/api/*` to the backend. App Platform ingress rules can only
route between **components of the same App**. Same-origin therefore requires the static site and the FastAPI
service to be two components of a **single** App — which means one repo's Terraform owns the other repo's
deployment, in direct tension with this repo's "backend changes belong in the backend repo" rule.

This plan assumes **separate Apps and a cross-origin `VITE_API_BASE_URL`**, which works because auth is a
bearer token (`src/api/http.ts`), not a cookie. Consequence: the backend must allowlist the frontend origins
in CORS (`credentials: "include"` is set, so the allowlist must be explicit origins, not `*`). If same-origin
is required, the correct shape is a single App with two components whose spec lives in a third, shared infra
repo, and this plan's `infra/` module changes materially.

> **Resolved (2026-07-26):** confirmed by Vansh — frontend and backend get separate subdomains
> (`app.simpero.com` / `api.simpero.com`), so this is inherently cross-origin. D9 is settled; the assumption
> above is the actual design, not a placeholder.

### Alternatives considered (briefly)

- **Droplet + nginx** — buys nothing a static SPA needs, costs an OS to patch, a TLS renewal to babysit, and a
  config to drift. Rejected.
- **Spaces + CDN** (the classic S3 + CloudFront pattern: build in CI, `s3cmd sync` to a Spaces bucket, serve
  via Spaces CDN). **Rejected — verified 2026-07-27, and the reason is specific and permanent, not a price
  judgement.** DO does not have CloudFront's "Error Pages", so there is no way to map 403/404 → `/index.html`
  **with the status rewritten to 200**, which is the mechanism the AWS pattern relies on for client-side
  routing. Two independent confirmations:
  - Spaces' S3 website mode (`PutBucketWebsite`, index/error document) is served **only** at
    `<bucket>.<region>-static.digitaloceanspaces.com`, and DO's S3-compatibility reference states plainly:
    "CDN is not supported for bucket websites"
    ([s3-compatibility](https://docs.digitalocean.com/products/spaces/reference/s3-compatibility/)). The two
    halves of the pattern are mutually exclusive on DO — website semantics *without* CDN, custom domain, or
    usable TLS; or CDN with custom domain and TLS but raw object semantics and no error document at all.
  - The custom-error-page request is closed as "Complete" with the resolution *use App Platform instead*
    ([ideas.digitalocean.com](https://ideas.digitalocean.com/storage/p/custom-403404-error-page)) — DO
    declining to build the equivalent, not a gap awaiting a roadmap.

  Even on the `-static` endpoint in isolation, an S3-style error document returns the **real** 404/403 status
  with substituted body content (true on AWS too — which is *why* the AWS pattern needs CloudFront on top).
  A non-200 shell is not equivalent to a 200: it fails this plan's own `smoke` deep-link assertion, fails
  Playwright's `response.ok()` checks, and misreports to uptime monitoring and crawlers. Padding the bucket
  with a copy of `index.html` per route is not a fix either — `/deals/:id` and `/admin/organizations/:orgId`
  are unbounded, so it would fail on exactly the deep links users paste.

  **Correction to a claim previously made here:** custom-domain TLS on Spaces CDN is *not* manual in general.
  Spaces CDN supports a custom subdomain with a DO-managed certificate, including free Let's Encrypt
  provisioning ([enable-cdn](https://docs.digitalocean.com/products/spaces/how-to/enable-cdn/)). The narrower
  true constraint: that integration **requires the zone to be DNS-hosted at DigitalOcean**; with external DNS
  you upload and renew the cert yourself. App Platform issues certs automatically under either DNS model
  (DO nameservers or a CNAME from an external provider), which matters given V8's DNS is not yet placed.

  **And it is not cheaper.** Two static-only Apps are **$0/mo** (App Platform's free tier covers three, 1 GiB
  outbound each); a Spaces subscription is **$5/mo**
  ([App Platform pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/),
  [Spaces pricing](https://www.digitalocean.com/pricing/spaces-object-storage)). D6 already buys a Spaces
  subscription for Terraform state, so the marginal storage cost would be zero — but the pricing argument for
  this option is dead either way, and it was never the deciding factor.

  This verdict is **SPA-specific**. For a traditional multi-page static site, Spaces + CDN would be a fine,
  arguably better choice. Revisit only if DO ships CDN-level rewrite rules, or if the app ever gains
  server-rendered routes.
- **Build in CI → push image to DOCR → App Platform deploys the image.** The correct escape hatch if the DO
  buildpack cannot handle pnpm 10.4.1 + the `wouter` patch (R1), or if we later need byte-identical
  staging→production artifact promotion. Costs: a registry, a Dockerfile, an image-tag lifecycle. Not now.
- **HCP Terraform (Terraform Cloud) free tier for state** — real locking and run history, no bucket or keys to
  create. Genuinely competitive with D6; rejected only to avoid a third vendor. Switch if R3 bites.

---

## Target architecture

```
GitHub  staging ──(auto)──> ci.yml: quality [+ e2e if E2E_ENABLED]      ← active development
        main    ──(auto)──> ci.yml: quality [+ e2e if E2E_ENABLED]      ← production source only
        feature ──PR──> staging ──PR──> main

        deploy.yml run from `staging`, environment=staging    ──┐
        deploy.yml run from `main`,    environment=production ──┤
          (any other branch↔environment pairing is rejected)     v
                    deploy.yml: guard → verify → tf plan → [approval] → tf apply
                                → doctl apps create-deployment --wait
                                → smoke check (+ assert built commit == dispatched SHA)
                                                          v
     simpero-web-staging    (github_branch = "staging") ──► app-staging.simpero.com
     simpero-web-production (github_branch = "main")    ──► app.simpero.com
        build: pnpm install && pnpm build
        output_dir: dist, catchall: index.html, deploy_on_push: false
        env (BUILD_TIME): VITE_CLERK_PUBLISHABLE_KEY, VITE_API_BASE_URL, VITE_ANALYTICS_*
                                                          │
                                   XHR to VITE_API_BASE_URL (cross-origin)
                                                          v
                             FastAPI App ── owned by Simpero_AI_Gov_Alpha,
                                            out of scope, see "Backend dependencies"
```

A branch is only ever a source for one environment. `staging` can never reach production and `main` can
never reach staging — not by convention, but because the deploy workflow refuses the pairing and the
GitHub Environment refuses the ref.

### App component specifics that are load-bearing

- **`catchall_document = "index.html"`** — without it, every deep link (`/admin/organizations`,
  `/deals/:id`) 404s on hard refresh, because wouter routes exist only client-side. This is the single
  most breakable line in the spec; the smoke check asserts it. It is also the **specific capability that
  decided D1** — no other DO product offers a 200-status catch-all rewrite (see Alternatives).
- **`output_dir = "dist"`**, `environment_slug = "node-js"`, build command roughly
  `corepack enable && pnpm install --frozen-lockfile && pnpm build`.
- **Node version** — App Platform reads `.nvmrc` / `engines`; `.nvmrc` pins 20.19.0. Verify the buildpack
  honours it and does not silently pick a newer major.
- **`VITE_BASE_URL` stays unset** — the app is served at domain root, so `vite.config.ts`'s `viteBase()`
  resolves to `/`.
- **Env var type is `GENERAL`, scope `BUILD_TIME`** — deliberately *not* `SECRET`. Vite inlines these into
  the bundle; marking them secret in DO would be theatre. Corollary, stated once so it cannot be misread
  later: **nothing genuinely secret may ever be added as a `VITE_*` variable.** A real secret belongs behind
  the backend.
- **`digitalocean_app_alert` on `DEPLOYMENT_FAILED`** — one block, worth having.

---

## Terraform layout

```
infra/
  versions.tf        required_version + digitalocean provider pin + s3 backend block (partial config)
  main.tf            digitalocean_app (static_site component), optional domain, deployment alert
  variables.tf       app_name, github_repo, github_branch, region (tor1, V5), clerk_publishable_key,
                     api_base_url, analytics_endpoint, analytics_website_id, custom_domain
                     (staging: app-staging.simpero.com, production: app.simpero.com),
                     do_project_name (D10 — "Simpero-Staging" / "Simpero-Prod", no default, required)
  outputs.tf         app_id, live_url, default_ingress
  env/
    staging.tfvars           non-secret per-env values
    production.tfvars
    staging.backend.hcl      bucket/key/region/endpoint for the Spaces state backend
    production.backend.hcl
  README.md          how to run plan/apply locally, and the one-time bootstrap steps
```

- **Backend block is partial**; init is `terraform init -backend-config=env/<env>.backend.hcl`, so the two
  environments cannot share a state file by accident.
- **State keys:** `frontend/staging.tfstate` in bucket `simpero-tf-state-staging`, `frontend/production.tfstate`
  in bucket `simpero-tf-state-production` (V3) — both buckets versioned and **shared with the backend repo**
  (`backend/staging.tfstate`, `backend/production.tfstate` live alongside these). There is no isolation
  between the two repos' state within a bucket — see V3's accepted-risk note.
- **Spaces-as-S3 quirks** the implementer will need in the backend block: custom `endpoints.s3`,
  `region` set to the Spaces region, and the `skip_credentials_validation` / `skip_region_validation` /
  `skip_requesting_account_id` / `skip_metadata_api_check` / `skip_s3_checksum` / `use_path_style` flags.
  The exact set varies by Terraform version — resolve at implementation, do not guess in advance.
- **Credentials:** `DIGITALOCEAN_TOKEN` for the provider; `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` set to
  the **Spaces** key pair for the shared state bucket (V3 — same bucket the backend repo uses, no folder-level
  isolation). All from GitHub Environment secrets (D11 — no repo-level secrets), never committed. The Spaces
  key pair **cannot be read-only** if Terraform's S3 `use_lockfile` locking is enabled (R3) — acquiring a
  lock writes a `<key>.tflock` object during `terraform-plan`, not just `terraform-apply`. Moot since D11
  anyway — both jobs now use the same single, read-write `DO_TOKEN`/Spaces key pair, just sourced from two
  different Environments (`<env>-plan` vs `<env>`).
- **`.gitignore` additions:** `infra/.terraform/`, `*.tfstate*`, `tfplan`. `infra/.terraform.lock.hcl` is
  **committed** (pins provider hashes).
- **Version pins:** pin an exact Terraform patch version in the workflow and a `~>`-constrained
  `digitalocean/digitalocean` provider in `versions.tf`. Choose current versions at implementation time
  rather than inheriting a stale number from this document.

---

## Workflow structure

### `ci.yml` — minimal changes only (stays automatic)

Two additions, nothing else touched:

```yaml
on:
  pull_request:
    branches: [main, staging]   # CHANGED — feature→staging PRs and staging→main promotion PRs
  push:                         # NEW — both deployable branches get a green/red signal
    branches: [main, staging]
  workflow_call:                # NEW — lets deploy.yml reuse `quality` instead of duplicating it
```

The existing `quality` and `e2e` jobs are unchanged. The `e2e` gate (`vars.E2E_ENABLED`) stays as-is — it
becomes useful only once a staging backend exists, which is not this plan's business to schedule.

### `deploy.yml` — new, `workflow_dispatch` only, reworked 2026-07-29 to mirror the backend repo

**Rework rationale:** Vansh asked for this pipeline to reuse the backend repo's (`Simpero_AI_Gov_Alpha`)
token model and mirror its `deploy.yml` shape as closely as makes sense — that repo's staging deploy is
already fully live, so its pattern is proven, not hypothetical. Adopted: a single DO token per environment
(no more RO/RW split), a per-environment `<env>-plan`/`<env>` Environment pair (branch-restricted even for
the *plan* step, not just apply), and a `run_terraform` toggle so routine code-only deploys skip Terraform
entirely. Kept, as a deliberate addition beyond the backend repo's own pattern: the `guard` job (defense in
depth — Alpha relies solely on Environment branch restrictions) and a separate `smoke` job (Alpha inlines
its health check into `deploy`; ours stays a distinct job).

```yaml
name: Deploy
on:
  workflow_dispatch:
    inputs:
      environment:   {type: choice, options: [staging, production], required: true}
      run_terraform: {type: boolean, default: false}  # skip for routine deploys — most deploys should
concurrency:
  group: infra-${{ inputs.environment }}   # shared with destroy.yml — a deploy and a destroy on the
  cancel-in-progress: false                # same environment can never race
```

**No `ref` input**, same reasoning as before — the branch is whichever one you dispatch from
(`github.ref_name`), and the environment determines which branch is legal.

**`run_terraform` replaces the old `plan_only`.** Most deploys ship new frontend code on an *already
existing* App and need no infra change at all — `run_terraform: false` (the default) skips `terraform-plan`/
`terraform-apply` entirely and goes straight from CI to `doctl apps create-deployment`, which builds fresh
from the tracked branch's current tip. Flip `run_terraform: true` only when the App *spec* itself needs to
change (a new env var, the domain, the alert rule, the DO Project assignment, etc.).

**Branch enforcement, two layers, now including the plan step:**

1. **GitHub Environment deployment branch policies**, on *all four* Environments this repo now has
   (`staging-plan`, `staging`, `production-plan`, `production` — see V7): `production`/`production-plan`
   restricted to `main`, `staging`/`staging-plan` restricted to `staging`. Because even the *plan* job now
   runs inside a branch-restricted Environment, a stray plan run from the wrong branch is rejected by GitHub
   itself, not just detected after the fact.
2. **The `guard` job**, same check as before, fails in seconds with a clear message rather than waiting on
   an Environment gate's rejection — but **reordered 2026-07-30 (Vansh) to run after `ci`, not before it**.
   Trade-off, stated plainly: a wrong branch/environment pairing now costs a full CI run instead of failing
   in seconds, in exchange for CI being the literal first job in the graph — matching the priority PR-time
   CI already has.

Jobs, in order — names now match the backend repo's (`ci`, `terraform-plan`, `terraform-apply`, `deploy`):

1. **`ci`** — no `needs`, first job in the graph. `uses: ./.github/workflows/ci.yml`.
2. **`guard`** — `needs: ci`. The branch assertion, plus `sha` as a job output. Runs on every dispatch,
   regardless of `run_terraform`.
3. **`terraform-plan`** — `needs: guard`, `if: inputs.run_terraform`. Ungated `${{ inputs.environment }}-plan`
   Environment (object `name:` form — required for a dynamic environment name, confirmed by the backend
   repo's own working pipeline). `DIGITALOCEAN_TOKEN` now comes from that Environment's own `DO_TOKEN`
   secret (no more repo-level read-only token — see V1). Otherwise unchanged: `fmt -check`, `init`,
   `validate`, `plan -out=tfplan`, upload artifact, write to `$GITHUB_STEP_SUMMARY`.
4. **`terraform-apply`** — `needs: terraform-plan`, `if: inputs.run_terraform`. Gated `${{ inputs.environment
   }}` Environment. Downloads and applies the saved plan. **No longer exports `app_id`/`live_url` as job
   outputs** — instead prints them to the step summary with an instruction to copy them into that
   environment's `APP_ID`/`LIVE_URL`/`DEFAULT_INGRESS` **Environment variables** (not secrets — an App ID isn't sensitive) if
   this was the first apply or the App got recreated. This mirrors the backend repo's own pattern of
   manually updating a static `DROPLET_HOST` secret after a Terraform run that could change the resource's
   identity.
5. **`deploy`** — `needs: [ci, terraform-apply]`. `if: always() && needs.ci.result == 'success' &&
   (inputs.run_terraform == false || needs.terraform-apply.result == 'success')` — the `always()` is
   load-bearing, same reasoning the backend repo's own comment gives: without it, GitHub implicitly ANDs in
   `success()`, which would block this job whenever `terraform-apply` is skipped, i.e. every routine
   `run_terraform: false` deploy. Reads `vars.APP_ID` from the gated Environment (no Terraform or its
   credentials needed in this job at all) and calls `doctl apps create-deployment $APP_ID --wait`.
6. **`smoke`** — `needs: [guard, deploy]`, also declares the gated Environment (to read `vars.LIVE_URL`/
   `vars.APP_ID` — Environment variables are only readable by jobs that declare that `environment:`). Same
   four checks as before, now reading `vars.LIVE_URL` instead of a `terraform-apply` job output.

Notes on the shape:

- Deploying to production requires being on `main`, choosing `environment: production`, *and* passing the
  reviewer gate — three deliberate acts, two of them machine-enforced.
- Rollback is not automated in v1. App Platform retains prior deployments and can redeploy one from the
  console/API; that is the rollback. If the bad commit is on `main`, revert it there too so the next deploy
  doesn't reintroduce it. Automate only if it turns out to be needed more than once.

### `destroy.yml` — new, 2026-07-29, mirrors the backend repo's destroy workflow

Deliberately its own workflow, not a toggle inside `deploy.yml` — tearing down infrastructure is rare and
dangerous enough to stay out of the routine deploy button, same reasoning the backend repo used.

```yaml
name: Destroy Infrastructure
on:
  workflow_dispatch:
    inputs:
      environment:          {type: choice, options: [staging, production], default: staging}
      confirm_environment:  {type: string, required: true}  # must exactly match `environment`
concurrency:
  group: infra-${{ inputs.environment }}   # shared with deploy.yml
  cancel-in-progress: false
```

Two jobs, mirroring `deploy.yml`'s plan/apply split and reusing the exact same Environments (no new ones to
create):

1. **`terraform-destroy-plan`** — ungated `${{ inputs.environment }}-plan` Environment. First step, before
   checkout: verify `confirm_environment` exactly matches `environment`, fail loudly if not — insurance
   against a fat-fingered dropdown on something this destructive. Then `terraform init` +
   `plan -destroy -out=tfplan`, upload the plan artifact.
2. **`terraform-destroy-apply`** — gated `${{ inputs.environment }}` Environment (the *same* Environment
   `deploy.yml`'s `terraform-apply`/`deploy` use — inherits the same reviewer + branch-restriction rules
   automatically). Downloads and applies the saved destroy plan. Final step writes a reminder to the job
   summary: the `APP_ID`/`LIVE_URL`/`DEFAULT_INGRESS` variables for this environment now point at a destroyed App and need
   clearing/updating before the next deploy, and the custom domain's DNS records now point at a dead App.

---

## Implementation phases

- **Phase 0 — prerequisites.** Everything under "Needed from Vansh", plus: **create the `staging` branch off
  `main`** and settle its protection rules (V13). No code until the DO↔GitHub link, the Spaces state bucket,
  and the `staging` branch all exist — Phase 1's first `apply` creates an App that tracks `staging`, and
  App Platform will not accept a branch that isn't there.
- **Phase 1 — `infra/` module + `ci.yml` triggers + `deploy.yml`/`destroy.yml`, first provisioning run
  through the workflow itself.** Write the module (`github_branch` comes from `.tfvars`: `staging` for
  staging, `main` for production), wire `ci.yml`'s triggers and `deploy.yml`, create the `staging-plan` and
  `staging` GitHub Environments with their (identical) deployment branch policy. **No local `terraform
  apply`** — the very first `terraform-plan`/`terraform-apply` against staging runs through `deploy.yml`'s
  `workflow_dispatch` (`environment: staging`, `run_terraform: true` since the App doesn't exist yet), the
  same gated path production will use later, not a laptop with an exported token. After the first apply,
  copy `app_id`/`live_url` from the job summary into the `staging` Environment's `APP_ID`/`LIVE_URL`/`DEFAULT_INGRESS`
  variables, then run `deploy` (`run_terraform: false` from here on for routine deploys). Confirm the App
  builds from the `staging` branch tip and the catch-all works — this is also where the buildpack risk (R1)
  surfaces, just observed from a CI run's logs instead of a local one. Also run the deliberate **negative
  test**: dispatch `environment: production` from the `staging` branch and confirm `guard` fails
  immediately.
- **Phase 2 — production.** `app.simpero.com` + DNS, Clerk production instance, `production.tfvars` with
  `github_branch = "main"`, `production-plan`/`production` GitHub Environments (the latter with required
  reviewers) **both** with the deployment branch policy restricted to `main`, then the first gated apply
  (`run_terraform: true`) — dispatched from `main`, again entirely through `deploy.yml`, followed by the
  same `APP_ID`/`LIVE_URL`/`DEFAULT_INGRESS` variable copy-in.
- **Phase 3 — follow-ups.** Point `E2E_API_BASE_URL` at staging and flip `E2E_ENABLED`; add the DO origins to
  Clerk allowed origins; update `README.md` if D9 resolves against same-origin.

---

## Needed from Vansh

Nothing below can be decided or supplied by an implementer. Items V1–V5 block Phase 1.

- ~~**V1 — DO account/team + API tokens.**~~ **Revised 2026-07-29: reuse, don't mint new ones.** Per D11,
  the RO/RW split is gone — this repo now needs the **same single DO API token(s) already in use for the
  backend repo** (`Simpero_AI_Gov_Alpha`'s `TF_VAR_do_token`), not a newly-generated pair. Since GitHub
  secrets don't propagate across repos, the same token *value* still has to be pasted into this repo's own
  `DO_TOKEN` secret(s) — see V6/V7 for where. Do not paste tokens into chat — set them directly as GitHub
  secrets.
- **V2 — DO ↔ GitHub authorization.** App Platform source builds require a one-time OAuth link between the DO
  team and the GitHub org in the DO console. Terraform cannot do this; without it,
  `digitalocean_app` fails to create.
- **V3 — Spaces bucket(s) for Terraform state.** **Shared infra: a one-time, account-level DO setup owned by
  neither repo.** Created out-of-band (chicken-and-egg with state), by Vansh, in the DO Control Panel.
  - **Decision (2026-07-27, overrides the earlier two-buckets-per-repo recommendation): one shared bucket per
    environment, not per repo.** `simpero-tf-state-staging` already exists (created by Vansh) and holds both
    repos' staging state under folder-style key prefixes: `frontend/staging.tfstate` (this repo),
    `backend/staging.tfstate` (`Simpero_AI_Gov_Alpha`). A second bucket, suggested `simpero-tf-state-production`,
    is still needed for production — same pattern, `frontend/production.tfstate` / `backend/production.tfstate`.
  - **Accepted risk, stated plainly so it isn't rediscovered as a surprise later:** DO Spaces access-key
    grants are `{bucket, permission}` — **there is no prefix/path scoping**
    ([Spaces Keys API](https://docs.digitalocean.com/reference/api/reference/spaces-keys/),
    [Manage Access](https://docs.digitalocean.com/products/spaces/how-to/manage-access/)), and bucket policies
    can't substitute (*"limited-access Spaces keys aren't compatible with `PutBucketPolicy`"* —
    [Bucket Policies](https://docs.digitalocean.com/products/spaces/how-to/configure-bucket-policies/)). So
    **any Spaces key with access to `simpero-tf-state-staging` can read/write/delete both `frontend/*` and
    `backend/*`** — there is no DO-side mechanism to fence the two repos' CI apart within the shared bucket.
    Vansh has confirmed this is an acceptable trade for a single bucket. Consequence: a leaked or misused
    Spaces credential in *either* repo, or a stray recursive delete from *either* repo's tooling, can corrupt
    or destroy the *other* repo's state too. Mitigate with what's still available: versioning (below) as the
    recovery path, and keeping the credential out of anywhere it could leak (see the `creds.txt`
    gitignore note this session).
  - **Versioning enabled on each bucket** (API-only — the control panel cannot set it; `s3api
    put-bucket-versioning` against the Spaces endpoint, or the `digitalocean_spaces_bucket` `versioning`
    block if bootstrapped with a local state file) — this is now the *only* corruption-recovery mechanism,
    given the isolation trade above, so don't skip it.
  - **One `Read/Write/Delete`-scoped key pair per bucket.** Since the bucket itself is the access boundary
    (not the folder), both repos' CI can use the same key pair for that bucket, or two separately-issued
    key pairs with identical effective access — pick whichever is easier to rotate independently later.
    Do not issue a full-access (account-wide) key to either repo's CI.
  - **Do not apply a bucket policy to either bucket** — doing so permanently blocks creating limited-access
    keys for it, and vice versa. Access control here is keys only.
  - **Cross-repo dependency:** `Simpero_AI_Gov_Alpha`'s Terraform needs the same bucket names, region, and key
    pair(s) — see the backend handoff note for the exact values.
  - **Grants are immutable** — a key's bucket scope cannot be edited after creation, only its name. Getting
    the scope wrong means deleting the key and rotating the GitHub secret.
- **V4 — Does a staging DO App already exist?** `ci.yml` and the FE-9 ledger entry both reference a
  "staging DO App", but nothing in this repo manages one. If one exists, decide **import vs. create fresh**
  (import needs its App ID; fresh needs the old one deleted to avoid two apps racing for the same domain).
  Plan assumes create-fresh until told otherwise.
- ~~**V5 — DO region.**~~ **Resolved: `tor1`.** Confirmed 2026-07-29 by cross-checking the backend repo's
  (`Simpero_AI_Gov_Alpha`) own already-live Terraform, which points at the same shared state buckets this
  repo uses — its `region`/`endpoints.s3` are `tor1`, independently verified there and proven working
  end-to-end (staging fully live). `infra/` here has been updated to match: `nyc3` replaced with `tor1`
  across `env/*.tfvars`, `env/*.backend.hcl`, and `variables.tf`'s default.
- ~~**V6 — GitHub repo secrets/variables.**~~ **Revised 2026-07-29 (D11): no repo-level secrets at all
  anymore** — everything moved to per-Environment, duplicated across each `<env>-plan`/`<env>` pair, matching
  the backend repo's own setup exactly:
  | Secret | `staging-plan` | `staging` | `production-plan` | `production` |
  |---|---|---|---|---|
  | `DO_TOKEN` (single, read-write) | ✓ | ✓ | ✓ | ✓ |
  | `SPACES_ACCESS_KEY_ID` | ✓ | ✓ | ✓ | ✓ |
  | `SPACES_SECRET_ACCESS_KEY` | ✓ | ✓ | ✓ | ✓ |

  Plus, on `staging`/`production` only (not the `-plan` pair — these are written by `terraform-apply`'s
  output, read by `deploy`/`smoke`, and don't exist until after the first real apply): **Environment
  variables** (not secrets) `APP_ID` (`deploy`), `DEFAULT_INGRESS` (`smoke` — App Platform's own
  `*.ondigitalocean.app` hostname, always live immediately post-apply), `LIVE_URL` (recorded but not
  currently read by any job — becomes meaningful once the custom domain's DNS/cert are live, R8). Confirm
  who has admin on the repo to set all of this.
- ~~**V7 — GitHub Environments + protection rules.**~~ **Revised 2026-07-29 (D11): four Environments, not
  two**, mirroring the backend repo's `-plan`/gated pair pattern:
  | Environment | Required reviewers | Deployment branches |
  |---|---|---|
  | `staging-plan` | None | `staging` only |
  | `staging` | None | `staging` only |
  | `production-plan` | None | `main` only |
  | `production` | **Yes** — name them | `main` only |

  The `-plan` environments are branch-restricted but **not** reviewer-gated — `terraform-plan` needs to stay
  visible to the approver before they approve `terraform-apply`, so it can't itself require approval. This
  is no longer optional for any of the four — it is the core of D5's enforcement (extended by D11 to cover
  the plan step too, not just apply), and without it the branch↔environment pairing is only a
  workflow-level convention.
- ~~**V8 — Custom domain and DNS.**~~ **Resolved.** Domain is `simpero.com` (Vansh owns it). Scheme: frontend
  on `app.simpero.com` (production) / `app-staging.simpero.com` (staging), backend on `api.simpero.com` /
  `api-staging.simpero.com` (backend repo's concern to provision, noted here for the shared naming
  convention). Still needed: DNS access (or a delegate) to create the CNAME/TXT records App Platform's
  managed-domain flow asks for — Terraform can request the domain on the App, but the zone owner (or whoever
  holds `simpero.com`'s DNS) has to add the records it returns. Clerk production (`pk_live_…`) can now proceed
  since a custom domain exists.
- ~~**V9 — Same-origin vs cross-origin API.**~~ **Resolved: cross-origin.** Separate subdomains means separate
  origins by construction — `VITE_API_BASE_URL` is `https://api.simpero.com` (production) /
  `https://api-staging.simpero.com` (staging). Backend CORS allowlist must include the matching frontend
  origin per environment (see "Backend dependencies").
- **V10 — Clerk keys per environment.** The staging `pk_test_…` (may be the existing one) and, for production,
  a `pk_live_…` from a Clerk production instance, plus adding `https://app.simpero.com` and
  `https://app-staging.simpero.com` to Clerk's allowed origins (and, since a custom domain now exists,
  configuring Clerk's own DNS records for the production instance per V8). Publishable keys are not secret and
  can live in `*.tfvars`; the Clerk **secret** key (e2e only) stays a GitHub secret.
- ~~**V11 — Environment strategy confirmation.**~~ **Resolved (2026-07-27).** Branch strategy is fixed by
  Vansh: `main` is the production-only source, `staging` is the active-development branch and the staging
  source. Two Apps (D2), branch↔environment pairing enforced (D5), no `release` pointer. Remaining questions
  about *how* the two branches are governed are V13, not this item.
- **V12 — Cost sign-off.** Verified 2026-07-27: App Platform's free tier covers **up to three apps using only
  static-site components**, with **1 GiB outbound data transfer per app per month**; each additional
  static-site app is **$3.00/mo**, and transfer beyond the allowance is **$0.02/GiB**
  ([pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/)). Two Apps (D2) therefore
  land at **$0/mo** in steady state. Separately, D6's Terraform-state bucket needs a **Spaces subscription at
  $5/mo** (250 GiB storage, 1 TiB outbound, CDN included —
  [pricing](https://www.digitalocean.com/pricing/spaces-object-storage)), so the real recurring floor for this
  plan is **$5/mo**, all of it state storage. Two things to sign off on rather than assume: (a) the 1 GiB/app
  transfer allowance is roughly a thousand loads of a ~1 MB bundle per month — fine now, worth knowing the
  ceiling exists, and overage is metered rather than a tier change; (b) DO has changed the static-site free
  tier before, so re-check at implementation rather than trusting this line.
- **V13 — Branch governance for the new two-branch model.** The branch↔environment *pairing* is settled (D5);
  how the branches themselves are governed is not, and an implementer must not guess:
  - Does `staging` get branch protection, or are direct pushes allowed since it is "active development"?
    (The deploy flow works either way; this is a policy call, and it decides whether every staging deploy is
    guaranteed to have passed a PR review or only CI.)
  - Does `staging` → `main` promotion happen via PR with required reviewers, or via a direct merge/fast-forward
    by you? D5 leans on "`main` only advances via reviewed promotion" for its no-pinning argument — if
    promotion is not reviewed, revisit R2's severity.
  - Does `main` require the CI check to pass before merge (branch protection → required status check
    `quality`)? Presumed yes, not confirmed.
  - **Hotfix path:** if production needs a fix that cannot wait for the `staging` queue, is a
    hotfix-branch → `main` PR acceptable, and does it then get back-merged into `staging`? Without an answer,
    the first urgent prod bug will improvise one.
  - Consequence of D4 worth confirming: `staging` deploys stay **manual dispatch** (`deploy_on_push = false`).
    If you want the staging App to auto-deploy on every push to `staging` now that it is the dev branch, that
    is a change to D4, not to D5 — say so and D4 gets revisited.

---

## Backend dependencies (noted, not designed)

Owned by `Simpero_AI_Gov_Alpha`; this repo neither designs nor implements them.

1. **A real FastAPI origin per environment** at `api.simpero.com` (production) / `api-staging.simpero.com`
   (staging) for `VITE_API_BASE_URL`. Until one exists, staging can deploy and render, but every authenticated
   screen fails at the fetch boundary.
2. **CORS allowlist** must include `https://app.simpero.com` (production) and
   `https://app-staging.simpero.com` (staging). `src/api/http.ts` sends `credentials: "include"`, so wildcards
   will not do.
3. **`E2E_API_BASE_URL` + `E2E_ENABLED`** stay off until a staging backend with fixtures exists — unchanged
   from `docs/e2e-implementation-plan.md`; not this plan's problem to solve.

---

## Risks and open questions

- **R1 — DO Node buildpack vs. pnpm 10.4.1 + the `wouter` patch.** The build must run `corepack`, respect
  `packageManager`, and apply `patches/wouter@3.7.1.patch`. If the patch silently does not apply, routing
  breaks subtly rather than loudly (per CLAUDE.md's gotcha). *Mitigation:* Phase 1's first real deploy
  (through `deploy.yml`, not a local apply — no manual deploys, see D5/Workflow structure) is where this
  surfaces; verify the deployed bundle behaves on deep links via the `smoke` job before trusting the
  pipeline further; escape hatch is the DOCR-image path.
  *Update 2026-08-20 — the patch half of this risk is retired:* wouter was replaced by
  `react-router@7.18.2` and `patches/wouter@3.7.1.patch` + `pnpm.patchedDependencies` were deleted
  (`docs/plans/2026-08-20-wouter-to-react-router.md`), so no patch is applied at build time at all.
  The `corepack` / `packageManager` / pnpm 10.4.1 half of R1 is unchanged, and deep links still depend
  on `catchall_document`, not on the router library.
- **R2 — App Platform builds a branch tip, not a SHA.** Under D5 this mostly stops being a problem: each App
  tracks a branch that only ever carries commits meant for that environment, so "tip" and "the thing we meant
  to ship" are the same commit by construction. The residual race is narrow — someone merges to the tracked
  branch between `guard` resolving the SHA and `create-deployment` running, and the App builds a newer commit
  than the one CI verified and the reviewer approved. *Mitigation:* the `smoke` job asserts the finished
  deployment's source commit equals `guard`'s SHA and fails the workflow if it drifted. That is detection, not
  prevention, and it is the right trade: on `main` the window is minutes wide and merges are gated; a pinned
  `release` branch would prevent it at the cost of a force-push job and a branch outside the two-branch model.
  If prevention ever becomes necessary, the honest fix is the DOCR image path (Alternatives), not a third
  branch.
- ~~**R3 — Spaces has no state-lock table.**~~ **Closed, 2026-07-29.** `use_lockfile = true` (native S3-backend
  locking, GA since Terraform 1.11) is confirmed working against these exact Spaces buckets — the backend
  repo runs it in production. `infra/versions.tf` now sets `use_lockfile = true` and
  `required_version = ">= 1.11.0"`. The per-environment `concurrency` group in `deploy.yml` remains as a
  belt-and-braces second layer (it also prevents two *workflow* runs from racing before either reaches
  Terraform, which the lock alone doesn't cover). Sharing the bucket with the backend repo (V3, D6) doesn't
  add lock contention — S3 locks are per state key, so the two repos never contend regardless of bucket
  sharing.
- **R7 — the shared state bucket has no cross-repo access isolation (accepted, 2026-07-27).** Per V3, DO
  Spaces keys can't be scoped below bucket level, so any credential with access to `simpero-tf-state-staging`
  / `simpero-tf-state-production` can read/write/delete both repos' state. Vansh has explicitly accepted this
  trade for the simplicity of one bucket. *Mitigation:* bucket versioning is the only recovery path if either
  repo's state gets corrupted or deleted from the other side — verify it's actually enabled on both buckets,
  don't assume. If this bites in practice (an incident, not a hypothetical), the fix is splitting into
  per-repo buckets, which V3 already priced at $0 marginal cost.
- **R4 — Terraform recreating the App.** Some `digitalocean_app` field changes force replacement, which means
  downtime and a new default ingress hostname. Always read the plan before approving; this is the reason
  `terraform-apply` consumes a saved plan. **Since D11**, a recreated App also gets a new `app_id` — the
  `APP_ID`/`LIVE_URL`/`DEFAULT_INGRESS` Environment variables go stale silently (no error, `deploy` just ships to whatever the
  old ID still happens to resolve to, or fails outright). `terraform-apply`'s step-summary reminder is the
  only safeguard; read it every time `run_terraform: true` is used, not just on the first apply.
- **R5 — Clerk allowed origins drift.** A new DO hostname that is not in Clerk's allowlist produces an app that
  loads and then fails auth in a confusing way. Add origins *before* the first deploy of each environment.
- **R6 — V4 unresolved.** If an unmanaged staging App already exists and is not imported, Terraform will create
  a second one and the two will be indistinguishable in the console. **Now more urgent under D5:** an existing
  App almost certainly tracks `main` with `deploy_on_push` on, which under the new model means it would
  silently deploy production-bound commits to the staging domain. Resolve V4 *before* `staging` becomes the
  development branch, not after.
- **R8 — the first `terraform-apply` for any environment always breaks its own `deploy`/`smoke` jobs
  (confirmed 2026-07-30, two instances).** `deploy` reads `vars.APP_ID`; `smoke` reads
  `vars.DEFAULT_INGRESS`/`vars.APP_ID` — none of which can exist before `terraform-apply` creates the App,
  and all three jobs run in the same dispatch on a first-time `run_terraform: true` run. Concretely: (1)
  `doctl apps create-deployment ""` — DO returns a 405 on the malformed empty-ID URL. (2) Separately, even
  after fixing (1), `smoke` originally checked `vars.LIVE_URL` (the custom domain), which can't return 200
  until Group D's DNS + DO's managed cert are live — confirmed failing against `app-staging.simpero.com`
  before DNS existed. Fixed by having `smoke` check `vars.DEFAULT_INGRESS` (App Platform's own
  `*.ondigitalocean.app` hostname, always live immediately post-apply) instead — `LIVE_URL` remains available
  as a variable for once the custom domain is actually verifiable. *Neither is a bug to fix further*,
  inherent consequences of not giving `deploy`/`smoke` Terraform credentials (deliberate, D11) plus DNS not
  existing yet — the operational fix is the same both times: after `terraform-apply` prints its outputs to
  the job summary, set that environment's `APP_ID`/`LIVE_URL`/`DEFAULT_INGRESS` variables, then
  **Actions → the run → Re-run jobs → Re-run failed jobs** (retries only `deploy`/`smoke`, not Terraform).
  Applies to both staging's first run (E1) and production's (E2) — see `docs/pending-on-vansh.md`.
  (3) A third, related instance found afterward on a *routine* `run_terraform: false` deploy (not just the
  first run): `smoke` was silently **skipped** entirely, not failed. GitHub's implicit default `if` for a
  job with `needs` checks the whole upstream chain, not just direct `needs:` — so `smoke` (`needs: [guard,
  deploy]`) was still being swept up by `terraform-plan`/`terraform-apply`'s skipped status even though
  `deploy` itself had already run and succeeded. Fixed with the same `always()` idiom `deploy`'s own
  condition already uses: `smoke`'s `if` is now `always() && needs.guard.result == 'success' &&
  needs.deploy.result == 'success'`, checking its direct needs explicitly instead of trusting the implicit
  default.
- **Open — does production need preview/PR apps?** Not planned. App Platform can create per-PR previews;
  deliberately skipped as unrequested scope.
- **Open — analytics.** `VITE_ANALYTICS_*` are wired as optional variables but no Umami instance is assumed to
  exist. Leave empty until there is one.
