# terraform init -backend-config=env/production.backend.hcl
# Bucket is shared with the Simpero_AI_Gov_Alpha repo (D6/V3) — this repo
# only owns the frontend/ key prefix within it, not the bucket itself.
# NOTE: this bucket does not exist yet (V3) — Vansh still needs to create it
# before this backend config can be used.
bucket = "simpero-tf-state-production"
key    = "frontend/production.tfstate"
region = "tor1"

endpoints = {
  s3 = "https://tor1.digitaloceanspaces.com"
}
