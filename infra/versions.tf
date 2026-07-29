terraform {
  # use_lockfile (native S3-backend state locking, see backend block below)
  # requires Terraform >= 1.11.0, which supersedes the >= 1.6.3 floor
  # skip_s3_checksum alone needed. Installed locally: 1.14.0, CI pins 1.14.0
  # (deploy.yml) — both satisfy this.
  required_version = ">= 1.11.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  # Partial config: bucket/key/region/endpoints come from -backend-config at
  # `terraform init` time (env/<env>.backend.hcl, D7) so staging and
  # production can never share a state file by accident. The flags below are
  # constant across environments, so they live here instead of being
  # duplicated in both .backend.hcl files.
  #
  # DO Spaces speaks S3 but isn't AWS, hence the skip_* / use_path_style
  # flags — confirmed against the S3 backend schema for Terraform 1.14.0;
  # re-verify if the pinned Terraform version changes, these attribute names
  # have moved across Terraform releases before (e.g. force_path_style ->
  # use_path_style, endpoint -> endpoints.s3).
  backend "s3" {
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
    # Native S3-backend state locking (GA since 1.11, hence the version
    # floor above). Two repos share these buckets, and a workflow
    # concurrency group doesn't stop a stray local `terraform apply`.
    use_lockfile = true
  }
}

provider "digitalocean" {
  # Token comes from the DIGITALOCEAN_TOKEN environment variable (secrets.DO_TOKEN,
  # duplicated across each environment's <env>-plan and <env> GitHub Environment
  # secrets — see deploy.yml/destroy.yml), never a var here.
}
