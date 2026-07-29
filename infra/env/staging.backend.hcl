# terraform init -backend-config=env/staging.backend.hcl
# Bucket is shared with the Simpero_AI_Gov_Alpha repo (D6/V3) — this repo
# only owns the frontend/ key prefix within it, not the bucket itself.
bucket = "simpero-tf-state-staging"
key    = "frontend/staging.tfstate"
region = "tor1"

endpoints = {
  s3 = "https://tor1.digitaloceanspaces.com"
}
