# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "debtsettler"
}

# -----------------------------------------------------------------------------
# Cognito Configuration
# -----------------------------------------------------------------------------

variable "cognito_user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
  default     = "debtsettler-users"
}

variable "enable_google_idp" {
  description = "Enable Google as an identity provider"
  type        = bool
  default     = true
}

variable "google_client_id" {
  description = "Google OAuth Client ID (required if enable_google_idp is true)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret (required if enable_google_idp is true)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "callback_urls" {
  description = "Allowed callback URLs for Cognito"
  type        = list(string)
  default     = ["http://localhost:3000/callback"]
}

variable "logout_urls" {
  description = "Allowed logout URLs for Cognito"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

# -----------------------------------------------------------------------------
# DynamoDB Configuration
# -----------------------------------------------------------------------------

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = "DebtSettler"
}

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "dynamodb_read_capacity" {
  description = "Read capacity units (only used if billing_mode is PROVISIONED)"
  type        = number
  default     = 5
}

variable "dynamodb_write_capacity" {
  description = "Write capacity units (only used if billing_mode is PROVISIONED)"
  type        = number
  default     = 5
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

# -----------------------------------------------------------------------------
# CloudFront Configuration
# -----------------------------------------------------------------------------

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100" # North America and Europe only
}

variable "custom_domain" {
  description = "Custom domain for CloudFront (optional)"
  type        = string
  default     = "debtsettler.mihaibercea.com"
}

# -----------------------------------------------------------------------------
# API Gateway Configuration
# -----------------------------------------------------------------------------

variable "allowed_origins" {
  description = "Additional allowed origins for CORS (e.g., CloudFront domain after first deployment)"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

