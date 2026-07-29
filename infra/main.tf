resource "digitalocean_app" "web" {
  spec {
    name   = var.app_name
    region = var.region

    static_site {
      name = "web"

      github {
        repo   = var.github_repo
        branch = var.github_branch
        # Deployments are gated (D4) — a deploy is only ever created
        # explicitly via `doctl apps create-deployment` in deploy.yml, never
        # implicitly by a push to the tracked branch.
        deploy_on_push = false
      }

      build_command    = "corepack enable && pnpm install --frozen-lockfile && pnpm build"
      output_dir       = "dist"
      environment_slug = "node-js"
      # Without this, every deep link (wouter client-side route) 404s on a
      # hard refresh — this is the entire reason App Platform (D1) was
      # chosen over Spaces+CDN, which cannot do a 200-status catch-all.
      catchall_document = "index.html"

      env {
        key   = "VITE_CLERK_PUBLISHABLE_KEY"
        value = var.clerk_publishable_key
        scope = "BUILD_TIME"
        type  = "GENERAL"
      }

      env {
        key   = "VITE_API_BASE_URL"
        value = var.api_base_url
        scope = "BUILD_TIME"
        type  = "GENERAL"
      }

      env {
        key   = "VITE_ANALYTICS_ENDPOINT"
        value = var.analytics_endpoint
        scope = "BUILD_TIME"
        type  = "GENERAL"
      }

      env {
        key   = "VITE_ANALYTICS_WEBSITE_ID"
        value = var.analytics_website_id
        scope = "BUILD_TIME"
        type  = "GENERAL"
      }
    }

    domain {
      name = var.custom_domain
      type = "PRIMARY"
    }

    # TODO: verify this block's exact shape against the installed provider's
    # docs at implementation/first-apply time (`terraform providers schema
    # -json` or the registry docs) — could not confirm against a live schema
    # from this sandbox. App-level alert rules (as opposed to per-component
    # rules like CPU_UTILIZATION) are documented as DEPLOYMENT_FAILED,
    # DEPLOYMENT_LIVE, DOMAIN_FAILED, DOMAIN_LIVE.
    alert {
      rule = "DEPLOYMENT_FAILED"
    }
  }
}

# Looks up the pre-existing, shared DO Project (created manually, shared
# across the frontend/backend/services repos) — not creating one.
data "digitalocean_project" "target" {
  name = var.do_project_name
}

# Assigns this App into that Project so it shows up alongside the backend's
# resources instead of DO's default "first team project" bucket.
resource "digitalocean_project_resources" "web" {
  project   = data.digitalocean_project.target.id
  resources = [digitalocean_app.web.urn]
}
