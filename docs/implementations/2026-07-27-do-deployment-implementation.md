# DO Deployment — Implementation Record & Setup Guide

> Built 2026-07-27 against `docs/plans/2026-07-26-do-deployment-plan.md` (read that first for the *why*
> behind every decision — this doc is the *what got built* and *what's left*, per this repo's docs
> convention).

## What was built

**Terraform module** (`infra/`):
- `versions.tf` — Terraform + `digitalocean` provider pins, partial S3-compatible backend block
- `variables.tf` — `app_name`, `github_repo`, `github_branch`, `region`, `clerk_publishable_key`,
  `api_base_url`, `analytics_endpoint`, `analytics_website_id`, `custom_domain`
- `main.tf` — one `digitalocean_app` resource per environment: `static_site` component, `deploy_on_push =
  false` (gated deploys), `catchall_document = "index.html"` (SPA deep-link routing), build-time env vars,
  custom domain, `DEPLOYMENT_FAILED` alert
- `outputs.tf` — `app_id`, `live_url`, `default_ingress`
- `env/staging.tfvars`, `env/production.tfvars` — per-environment values (Clerk keys are placeholders, see
  below)
- `env/staging.backend.hcl`, `env/production.backend.hcl` — per-environment state backend config
- `README.md` — local `plan`/`apply` instructions
- `.terraform.lock.hcl` — committed on purpose (provider hash pins)

**Workflows**:
- `.github/workflows/ci.yml` — now triggers on `push`/`pull_request` to both `main` and `staging`, plus
  `workflow_call` so `deploy.yml` can reuse the `quality` job. `quality`/`e2e` jobs themselves untouched.
- `.github/workflows/deploy.yml` — new, `workflow_dispatch`-only. `guard` → `verify` → `plan` → `apply`
  (GitHub Environment gate fires here) → `deploy` (`doctl apps create-deployment`) → `smoke` (4 checks
  including a deployed-commit-matches-dispatched-commit assertion).

**`.gitignore`** — added `infra/.terraform/`, `*.tfstate*`, `tfplan`, and (from earlier this session)
`creds.txt`.

Validated locally: `terraform fmt -check`, `terraform init -backend=false` + `terraform validate` (both
pass against the real provider schema), both workflow YAML files parse cleanly. **Not validated**: an actual
`terraform apply`, an actual GitHub Actions run, or an actual DO deployment — none of that is possible until
the prerequisites below exist.

## Code-level TODOs left for first real run

These are flagged with `# TODO` comments in the code itself — listed here so they're not lost:

1. **`infra/main.tf`, the `alert` block** — shape (`rule`/`disabled`/`destinations`) is confirmed against
   the provider schema, but whether `DEPLOYMENT_FAILED` is accepted by the live DO API wasn't verifiable
   without a real `apply`. If `terraform apply` errors on this block, that's why — check DO's current
   `digitalocean_app` alert docs.
2. **`deploy.yml`'s `smoke` job, last step** — assumes `doctl apps get-deployment -o json` exposes the
   deployed commit at `.static_sites[0].source_commit_hash`. Unverified against a real API response. If the
   `smoke` job fails specifically on the "Deployed commit matches" step with an empty `deployed_sha`, this
   is the first thing to check — run `doctl apps get-deployment <app-id> <deployment-id> -o json | jq` by
   hand and fix the `jq` path.
3. **`deploy.yml`'s `deploy` job** declares `environment: ${{ inputs.environment }}` a second time (after
   `apply` already used it) so it can reach the read-write `DO_TOKEN` secret for `doctl`. If GitHub
   re-prompts for reviewer approval on this second `environment:` reference during a real production run,
   fold the `deploy` job's steps into `apply` instead.
4. **`infra/versions.tf` / `env/*.backend.hcl` Spaces-as-S3 flags** (`skip_credentials_validation` etc.) —
   picked for a recent Terraform S3 backend; if `terraform init` complains about an unknown backend
   attribute on first real run, it's a Terraform-version mismatch, not a logic error — check `terraform
   version` in the CI runner against what these files assume.

## Pending tasks — step by step

Nothing below can be done by an implementer; everything here needs an action from you. Grouped in the
order you'll actually hit them — later groups build on earlier ones.

### Group A — before any Terraform can run at all

1. **DigitalOcean ↔ GitHub authorization.** In the DO control panel, under App Platform → create/link a
   source → authorize DigitalOcean's GitHub App for the `Simpero-AI` org (or at minimum this repo). This is
   a one-time OAuth click; Terraform cannot do it, and `digitalocean_app` will fail to create without it.
2. **Create the `staging` branch.** `git checkout main && git checkout -b staging && git push -u origin
   staging`. Everything downstream (the staging App, `deploy.yml`'s branch guard, CI triggers) assumes this
   branch exists.
3. **Create the production state bucket.** `simpero-tf-state-staging` already exists; create
   `simpero-tf-state-production` the same way (DO control panel → Spaces → Create Bucket, same region as
   below). Enable object versioning on it via the API (the control panel can't set this) — see `infra/README.md`
   for the exact command, or run:
   `s3cmd --host=<region>.digitaloceanspaces.com --host-bucket='%(bucket)s.<region>.digitaloceanspaces.com' setversioning s3://simpero-tf-state-production enabled`
   (substitute your chosen region). Confirm versioning is also actually enabled on `simpero-tf-state-staging`
   — it was created manually and versioning may not have been turned on.
4. **Decide the DO region.** The code defaults to `nyc3` everywhere (`infra/env/*.tfvars`,
   `*.backend.hcl`). If you want a different region, it's a find-and-replace across those 4 files before
   the first `apply` — otherwise `nyc3` ships as-is. Should match whatever region the backend repo's App
   ends up in.
5. **Get two DigitalOcean API tokens**: one read-only, one read-write. DO control panel → API → Generate
   New Token. Don't paste them into chat — go straight to step 7 below.
6. **Get a Spaces access key pair** scoped to `simpero-tf-state-staging` and `simpero-tf-state-production`
   (DO control panel → API → Spaces Keys → limited-access key). Since Spaces keys can't be scoped below
   bucket level, one key with access to both buckets is fine (see the plan doc's V3 for why per-repo
   isolation isn't possible on DO regardless).

### Group B — GitHub repo configuration

**Superseded 2026-07-29 (D11):** the token model changed — no more repo-level secrets, no more RO/RW
split, and four GitHub Environments instead of two. See `docs/pending-on-vansh.md` Group B for the current
version; steps 7–9 below are kept only as the historical record of what this doc originally said.

7. ~~**Set repo-level secrets**~~ (Settings → Secrets and variables → Actions → Repository secrets):
   - `DO_TOKEN_RO` — the read-only DO API token (step 5)
   - `SPACES_ACCESS_KEY_ID` / `SPACES_SECRET_ACCESS_KEY` — the Spaces key pair (step 6)
8. ~~**Create two GitHub Environments**~~ (Settings → Environments):
   - `staging` — no required reviewers. Under *Deployment branches and tags*, restrict to the `staging`
     branch only.
   - `production` — add required reviewers (decide who). Under *Deployment branches and tags*, restrict to
     the `main` branch only. This restriction plus the reviewer requirement is what makes the gate real —
     without it, `deploy.yml`'s branch check is only a workflow-level convention, not an enforced one.
9. **Set environment-scoped secrets** on both `staging` and `production` environments: `DO_TOKEN` — the
   read-write DO API token (step 5). Same token value can be used for both environments, or issue two if you
   want to be able to revoke staging access independently of production later.
10. **Decide branch governance for `staging`/`main`** (plan doc's V13 — genuinely open, not guessed at in
    code): does `staging` get branch protection or are direct pushes fine? Does `staging` → `main` promotion
    require a reviewed PR? Does `main` require the `quality` CI check to pass before merge? What's the
    hotfix path if production needs an urgent fix that can't wait for the normal `staging` queue? Set up
    branch protection rules (Settings → Branches) to match whatever you decide.

### Group C — values only you can supply

11. **Clerk publishable keys.** `infra/env/staging.tfvars` and `production.tfvars` currently have
    `pk_test_REPLACE_ME` / `pk_live_REPLACE_ME` placeholders. Replace with real values — staging can likely
    reuse the existing test-instance key; production needs a `pk_live_…` from a Clerk **production**
    instance (which itself needs the custom domain from Group D to exist first, since Clerk production
    instances require custom-domain DNS records).
12. **Add DO origins to Clerk's allowed origins** for both instances: `https://app-staging.simpero.com` and
    `https://app.simpero.com`.

### Group D — domain and DNS

13. **Point DNS at the App Platform apps.** Once Phase 1 (below) creates the staging App, DO will give you
    CNAME/TXT records to add for `app-staging.simpero.com`; add them wherever `simpero.com`'s DNS is
    hosted. Same for `app.simpero.com` once the production App exists.
14. **Coordinate with the backend repo** on its own domains (`api.simpero.com` / `api-staging.simpero.com`)
    and CORS allowlist — see the backend handoff notes already relayed in this session's chat history if you
    haven't pasted them into a backend-repo session yet.

### Group E — first actual deploys

**Updated 2026-07-29: no manual deploys.** Vansh's explicit call — `terraform plan`/`apply` only ever run
inside `deploy.yml`, staging's first run included. There is no local-apply step anymore; the walkthrough
below is superseded by `docs/pending-on-vansh.md`'s Group E, which is the maintained version — this section
is kept only as the historical record of what this doc originally said.

15. ~~**Phase 1 (manual, staging first).**~~ Superseded — see `docs/pending-on-vansh.md` Group E, E1.
    Staging's first provisioning run now goes through `deploy.yml`'s `workflow_dispatch`
    (`environment: staging`, `run_terraform: true` — the `plan_only` input this originally described no
    longer exists, replaced by `run_terraform` under D11), not a local
    `terraform apply`. R1 (DO Node buildpack vs. pnpm 10.4.1 + the `wouter` patch) still surfaces at this
    point, just observed via the `smoke` job's deep-link check instead of a local test.
16. Merged into 15 above — the negative test (`environment: production` dispatched from `staging`,
    confirming `guard` fails) is now part of the same first run, not a separate phase.
17. **Production**, once Groups A–D are fully done for production specifically (bucket, DNS, Clerk
    production instance, environment reviewers): `workflow_dispatch` with `environment: production` from
    the `main` branch — same no-manual-apply rule.
18. **Follow-ups**, not blocking: point `E2E_API_BASE_URL` at the staging backend and flip the
    `E2E_ENABLED` repo variable once a staging backend with fixtures exists (backend repo's timeline, not
    this repo's).
