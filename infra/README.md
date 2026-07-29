# infra/

Terraform for this repo's DigitalOcean App Platform static sites (staging + production). Full design
context, decisions (D1–D9), and open dependencies (V1–V13) live in
`docs/plans/2026-07-26-do-deployment-plan.md` — read that first, this file is just the how-to-run.

## One-time bootstrap order

Nothing here works until, in this order:

1. **V2** — the DO team is OAuth-linked to the GitHub org (DO console, App Platform → GitHub). Terraform
   cannot do this; `digitalocean_app` will fail to create without it.
2. **V3** — the Spaces state bucket for the target environment exists and is versioned. Both
   `simpero-tf-state-staging` and `simpero-tf-state-production` are confirmed to already exist and be
   versioned (2026-07-29, cross-checked against the backend repo's own already-live setup — same shared
   buckets, region `tor1`).
3. The `staging` branch exists in GitHub (required before the staging App can track it).
4. **D10** — the target DO Project exists (`"Simpero-Staging"` for staging, `"Simpero-Prod"` for production).
   `main.tf` looks it up by name and assigns the App into it; `terraform apply` fails cleanly on that
   lookup if the name in `env/<env>.tfvars`'s `do_project_name` doesn't match an existing project.

## No manual applies — `plan` and `apply` only run inside `deploy.yml`

There is no local `terraform apply` path for this module, staging included. Every provisioning run —
first one and every one after — goes through `.github/workflows/deploy.yml`'s `workflow_dispatch`, gated by
branch↔environment enforcement (D5) and, for `apply`, a GitHub Environment reviewer gate. See the plan
doc's "Workflow structure" and "Implementation phases" sections for the full job graph and rollout order.

Local `terraform init`/`plan`/`fmt`/`validate` are still fine for inspection and debugging — read-only,
never mutate real infra:

```bash
cd infra
export DIGITALOCEAN_TOKEN=...        # read-only DO token is enough for this
export AWS_ACCESS_KEY_ID=...         # Spaces key pair, scoped to the state bucket
export AWS_SECRET_ACCESS_KEY=...

terraform init -backend-config=env/staging.backend.hcl      # or production.backend.hcl
terraform plan  -var-file=env/staging.tfvars                # or production.tfvars — inspect only, do not apply
```

Switching environments means re-running `init` with the other `.backend.hcl` (or `terraform init -reconfigure
-backend-config=...`) — the two environments are deliberately not workspaces (D7), so there's no
`terraform workspace select` to get wrong.

`env/*.tfvars` `clerk_publishable_key` values are placeholders (`REPLACE_ME`) until V10 is resolved — the
workflow's own `plan` step will show this plainly in the diff if they're still unset when a real run
happens.
