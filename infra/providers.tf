terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket  = "498976383585-tfstates"
    key     = "debtsettler/terraform.tfstate"
    region  = "eu-central-1"
    encrypt = true
    profile = "mishu-websites"
  }
}

provider "aws" {
  region  = "eu-central-1"
  profile = "mishu-websites"

  default_tags {
    tags = {
      App       = "debtsettler"
      managedBy = "terraform"
    }
  }
}

# Provider for CloudFront ACM certificate (must be us-east-1)
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = "mishu-websites"

  default_tags {
    tags = {
      App       = "debtsettler"
      managedBy = "terraform"
    }
  }
}
