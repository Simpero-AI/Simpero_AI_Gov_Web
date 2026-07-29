# Pending on Vansh — DO Deployment Setup Walkthrough

Everything the code needs is written (`infra/`, `.github/workflows/{ci,deploy,destroy}.yml`). None of it can
run end-to-end until the steps below are done — they're all manual, DO-console/GitHub-console actions that
only someone with account access can do. Full rationale for each decision lives in
`docs/plans/2026-07-26-do-deployment-plan.md`; this doc is just the walkthrough. Style/structure mirrors the
backend repo's own `docs/PENDING_ON_VANSH.md`, which has already taken its pipeline fully live — same shared
infra, same pattern, proven to work.

Do these roughly in order — later steps depend on earlier ones. Check items off as you go; this file is
meant to be updated in place, not re-read from scratch each time.

**Status as of 2026-07-30:** Groups A and B are done, except **B3** (`APP_ID`/`LIVE_URL` variables — can't
be set until the first `terraform-apply` exists to print them). Group C is done for **staging** (Clerk key
set, allowed-origins confirmed not needed); production's Clerk key/origins are still pending on Group D's
domain work. **Nothing has been applied yet — no App Platform app exists.** The next real action is
**Group E, E1**: the first `deploy.yml` run (`environment: staging`, `run_terraform: true`), which creates
the staging App and is also where B3 finally gets filled in.

---

## 0. Housekeeping — GitHub org rename

The repo now belongs to the `Simpero-AI` GitHub org (moved from `Digitallick`). This has been updated
everywhere in code and docs this session (`infra/variables.tf`'s `github_repo` default, and every doc
reference). **One thing only you can do**, since it touches git remote config directly and that's
deliberately outside what gets changed automatically:

- [ ] **0.1. Update the local git remote**, if it still points at the old org:
  ```
  git remote set-url origin git@github-vk:Simpero-AI/Simpero_AI_Gov_Web.git
  ```
  (Current value confirmed this session: `git@github-vk:Digitallick/Simpero_AI_Gov_Web.git`.) GitHub
  usually redirects the old URL after an org rename, but don't rely on that indefinitely — update it now.

---

## Group A — infrastructure prerequisites

- [x] **A1. Authorize DigitalOcean's GitHub App — then STOP, don't finish the wizard.** **Done** 2026-07-29
  — confirmed no app was created, no charge incurred.
  DO control panel → **Apps** → **Create App** → when it asks to link a GitHub source, click through
  DigitalOcean's GitHub OAuth flow and grant it access to the `Simpero-AI` org (or at minimum the
  `Simpero_AI_Gov_Web` repo).

  **The moment the wizard asks you to pick a repo/branch, the authorization is already done** — that's
  the only thing this step needs. **Close the tab / navigate away here.** Do not continue picking a branch,
  a plan, or clicking "Create Resources": DO's Create App wizard is a general-purpose flow that defaults to
  a paid resource type/plan (confirmed 2026-07-29 — it showed a **$24/mo** estimate), which is not what
  `infra/main.tf` actually creates (a `static_site`-only component, free-tier eligible per V12). Nothing is
  created or billed until you explicitly confirm the wizard's final step, so backing out at any point before
  that is always safe. If you *did* already click through and a real app got created: delete it (that
  app → Settings → Destroy) before Phase 1 (E1) runs, so Terraform doesn't collide with an unmanaged
  duplicate (see plan doc R6).

- [x] **A2. Create the `staging` branch.** **Done** 2026-07-30.

- [x] **A3. Production Terraform-state bucket.** **Done.** Confirmed 2026-07-29 by reading (read-only) the
  backend repo's own setup runbook: `simpero-tf-state-production` exists, region `tor1`, alongside
  `simpero-tf-state-staging`.

- [x] **A4. Versioning on both state buckets.** **Done** — same confirmation. Kept here for reference in
  case you ever need to touch bucket-level settings again (versioning, lifecycle, policy): DigitalOcean
  rejects these operations from a **limited-access (bucket-scoped) key** — only your account's **full-access**
  Spaces key can call `PutBucketVersioning` and similar, even against a bucket a limited key already has
  Read/Write/Delete on. To re-check status later:
  ```
  export AWS_ACCESS_KEY_ID=<your account's full-access Spaces key>
  export AWS_SECRET_ACCESS_KEY=<its secret>

  aws s3api get-bucket-versioning \
    --bucket simpero-tf-state-staging \
    --endpoint-url https://tor1.digitaloceanspaces.com

  aws s3api get-bucket-versioning \
    --bucket simpero-tf-state-production \
    --endpoint-url https://tor1.digitaloceanspaces.com
  ```
  Both should report `"Status": "Enabled"`. This is the *only* recovery mechanism if a leaked credential or
  a stray delete from either repo ever touches state it shouldn't (see plan doc V3/R7 — the two repos'
  state shares a bucket with no way to fence them apart at the DO level).

- [x] **A5. DO region.** **Resolved: `tor1`**, not the earlier `nyc3` placeholder — confirmed against the
  backend repo's own already-verified-live setup (same shared buckets, same region, staging fully live
  end-to-end there). `infra/` here already uses `tor1` throughout — nothing left to do.

- [x] **A6. Generate separate DigitalOcean API token(s) for this repo.** **Done** 2026-07-30 — separate
  from the backend repo's, not reused.

- [x] **A7. Spaces access key pair.** **Done** 2026-07-30.

- [x] **A8. Confirm the shared DO Project names.** **Done** 2026-07-30 — confirmed directly by Vansh:
  `infra/env/staging.tfvars`'s `do_project_name = "Simpero-Staging"`, `production.tfvars`'s
  `"Simpero-Prod"`. If either was renamed in DO's console later, `terraform apply` fails cleanly on the
  project lookup (not a silent misconfiguration) rather than deploying into the wrong project.

- [x] **A9. Branch protection.** **Done** 2026-07-30 — matches the decided governance: `staging` PR-only
  (Vansh admin-bypass), `staging`→`main` and hotfixes both via PR, no separate hotfix process. CI runs on
  PR creation and is the first job in `deploy.yml` (D11 addendum).

---

## Group B — GitHub repository configuration

**No repository-level secrets at all in this model** — everything lives on one of four GitHub Environments,
mirroring the backend repo's own `-plan`/gated pair pattern exactly.

- [x] **B1. Create all four GitHub Environments.** **Done** 2026-07-30 — `staging-plan`, `staging`,
  `production-plan`, `production`, with the branch restrictions and `production`'s reviewer requirement as
  specified.

- [x] **B2. Add secrets to all four environments.** **Done** 2026-07-30 — `DO_TOKEN`,
  `SPACES_ACCESS_KEY_ID`, `SPACES_SECRET_ACCESS_KEY` on all four.

- [ ] **B3. Add `APP_ID`/`LIVE_URL` variables — not yet possible.** These go on the **gated** `staging`/
  `production` Environments only (not the `-plan` pair), as **Environment variables**, not secrets — an
  App Platform app ID isn't sensitive. They don't exist yet because nothing's been provisioned — this step
  happens in Group E, right after each environment's first `terraform-apply` prints them to the job
  summary. The only item left blocking Group E.

- [x] **B4. Branch protection.** **Done** 2026-07-30 — see A9 (branch protection was actioned once, covers
  both).

---

## Group C — values only you can supply

- [x] **C1 (staging).** **Done** — `infra/env/staging.tfvars`'s `clerk_publishable_key` is set to a real
  `pk_test_…` value.
- [ ] **C1 (production).** Still `pk_live_REPLACE_ME` in `infra/env/production.tfvars` — needs a Clerk
  **production** instance, which itself needs the custom domain from Group D first (Clerk production
  instances require their own DNS records on a custom domain).

- [x] **C2 (staging).** **Not needed** — per Vansh, staging's Clerk instance works without an explicit
  allowed-origins entry for `https://app-staging.simpero.com`. Noting the earlier concern (R5: a missing
  entry can produce a confusing CORS-shaped auth failure) in case this ever needs revisiting, but not
  blocking.
- [ ] **C2 (production).** Still to confirm once the production Clerk instance (C1) and
  `https://app.simpero.com` (Group D) both exist — production instances are typically stricter about origin
  checks than test instances, so don't assume staging's result carries over.

---

## Group D — domain and DNS

- [ ] **D1. Add DNS records for the staging app.** After Phase 1 (Group E, E1) creates the staging App, DO
  shows the CNAME/TXT records it needs for `app-staging.simpero.com` (App Platform → your app → Settings →
  Domains). Add them wherever `simpero.com`'s DNS is actually hosted.

- [ ] **D2. Add DNS records for the production app**, same process, once the production App exists
  (Group E, E2).

- [ ] **D3. Coordinate with the backend repo**, if not already done — it needs its own domains
  (`api.simpero.com` / `api-staging.simpero.com`) and a CORS allowlist including this frontend's origins.
  (Per the backend repo's own memory: its `CORS_ALLOWED_ORIGINS` env values are already set to
  `https://app-staging.simpero.com` / `https://app.simpero.com` for staging/production respectively — worth
  a quick check that this actually landed in `app/main.py`'s CORS middleware, since their own notes flagged
  it as a followup separate from the deploy pipeline itself.)

---

## Group E — first actual deploys

- [ ] **E1. Phase 1 — first provisioning run, staging, entirely through `deploy.yml`.** **No manual
  `terraform apply` from a laptop** — `terraform-plan`/`terraform-apply` and `deploy` only ever run as part
  of the gated workflow, staging included. GitHub repo → **Actions → Deploy → Run workflow**:
  1. `environment: staging`, `run_terraform: true` (the App doesn't exist yet, so this run needs to create
     it). Read the plan in the `terraform-plan` job's summary before approving `terraform-apply` — it
     should show creating one `digitalocean_app` and one `digitalocean_project_resources` assignment,
     nothing about destroying anything.
  2. Approve the `terraform-apply` gate. Once it finishes, copy `app_id`/`live_url` from its job summary
     into the `staging` Environment's `APP_ID`/`LIVE_URL` **variables** (B3) — `deploy` and `smoke` read
     these directly, not a Terraform output.
  3. The same run's `deploy` job ships the first real build. This is where you'll find out whether DO's
     Node buildpack handles pnpm 10.4.1 and the `wouter` patch correctly (plan doc's R1) — the `smoke`
     job's deep-link check (`/admin/organizations` or similar returning the app shell, not a 404) is the
     signal to watch, not a local test.
  4. For every deploy after this one, use `run_terraform: false` (the default) — it skips Terraform
     entirely and just ships the latest `staging` branch tip.
  5. Run the negative test the plan calls for: dispatch again with `environment: production` while still on
     the `staging` branch and confirm the `guard` job fails immediately with a clear error, touching
     nothing on DO.

- [ ] **E2. Phase 2 — production**, once Groups A–D are fully done for production specifically (project
  name confirmed, DNS, Clerk production instance, environment reviewer). Same process as E1 (`run_terraform:
  true` for the first run only, then `false`), dispatched only from the `main` branch — still no local
  apply.

- [ ] **E3. Phase 3 — follow-ups, not blocking.** Once a staging backend with test fixtures exists (backend
  repo's own timeline), point the `E2E_API_BASE_URL` repo variable at it and flip `E2E_ENABLED` to `"true"`
  so the Playwright job in `ci.yml` starts running.

- [ ] **E4. Know where `destroy.yml` is, hope you never need it.** GitHub repo → **Actions → Destroy
  Infrastructure → Run workflow** — tears down an environment's App via `terraform destroy`, gated the same
  way as a deploy (plan visible before approval, reviewer gate on production) plus a typed
  `confirm_environment` field you must match exactly to the `environment` you picked, as insurance against
  a fat-fingered dropdown. After a destroy, its own job summary reminds you to clear the `APP_ID`/`LIVE_URL`
  variables and remove the now-dead DNS records — do both before the next deploy to that environment.

---

## Open items, not blocking, your call whenever

- **`guard` job + standalone `smoke` job.** Two deliberate additions beyond the backend repo's own pattern
  (it relies solely on Environment branch restrictions, and inlines its health check into `deploy`). Kept
  here as defense-in-depth / cleaner separation — no action needed, just don't be surprised the two repos'
  workflows aren't byte-identical.
- **Rollback.** Not automated (plan doc, Workflow structure notes). DO retains prior deployments; a bad
  production commit gets rolled back from the DO console/API, then reverted on `main` so the next deploy
  doesn't reintroduce it. Automate only if this turns out to be needed more than once.
- **Analytics.** `VITE_ANALYTICS_ENDPOINT`/`VITE_ANALYTICS_WEBSITE_ID` are wired as optional, currently
  empty. Leave empty until an Umami (or similar) instance exists.
