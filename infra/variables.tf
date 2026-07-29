variable "app_name" {
  description = "DigitalOcean App Platform app name (simpero-web-staging / simpero-web-production)."
  type        = string
}

variable "github_repo" {
  description = "owner/repo the App Platform static site builds from."
  type        = string
  default     = "Simpero-AI/Simpero_AI_Gov_Web"
}

variable "github_branch" {
  description = "Branch this App tracks. staging App tracks 'staging', production App tracks 'main' (D5)."
  type        = string
}

variable "region" {
  description = "DigitalOcean region for the App. Confirmed to match the backend repo's droplet and the shared Terraform state buckets' actual region (V5)."
  type        = string
  default     = "tor1"
}

variable "do_project_name" {
  description = "Name of the existing, shared DO Project this App gets assigned into (staging: \"Simpero\", production: \"Simpero-Prod\"). No default — required per environment."
  type        = string
}

variable "clerk_publishable_key" {
  description = "Clerk VITE_CLERK_PUBLISHABLE_KEY for this environment. Public key, not a secret (D1's env var note)."
  type        = string
  sensitive   = false
}

variable "api_base_url" {
  description = "Backend API origin for VITE_API_BASE_URL (cross-origin per D9, e.g. https://api.simpero.com)."
  type        = string
}

variable "analytics_endpoint" {
  description = "VITE_ANALYTICS_ENDPOINT. Empty until an analytics instance exists."
  type        = string
  default     = ""
}

variable "analytics_website_id" {
  description = "VITE_ANALYTICS_WEBSITE_ID. Empty until an analytics instance exists."
  type        = string
  default     = ""
}

variable "custom_domain" {
  description = "Primary custom domain for this App (app.simpero.com / app-staging.simpero.com)."
  type        = string
}
