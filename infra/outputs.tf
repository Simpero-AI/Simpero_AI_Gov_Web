output "app_id" {
  description = "App Platform app ID, consumed by deploy.yml for doctl apps create-deployment."
  value       = digitalocean_app.web.id
}

output "live_url" {
  description = "Public URL App Platform reports for this App (custom domain once DNS/cert are live)."
  value       = digitalocean_app.web.live_url
}

output "default_ingress" {
  description = "App Platform's own *.ondigitalocean.app hostname, useful before the custom domain resolves."
  value       = digitalocean_app.web.default_ingress
}
