# -----------------------------------------------------------------------------
# Frontend Outputs
# -----------------------------------------------------------------------------

output "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "ARN of the S3 bucket for frontend assets"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "website_url" {
  description = "Website URL"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

# -----------------------------------------------------------------------------
# API Outputs
# -----------------------------------------------------------------------------

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.main.id
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_invoke_url" {
  description = "Full API invoke URL"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/api"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.api.arn
}

# -----------------------------------------------------------------------------
# Cognito Outputs
# -----------------------------------------------------------------------------

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool Domain"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_hosted_ui_url" {
  description = "Cognito Hosted UI URL for login"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_issuer_url" {
  description = "Cognito JWT Issuer URL"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

# -----------------------------------------------------------------------------
# DynamoDB Outputs
# -----------------------------------------------------------------------------

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.main.arn
}

# -----------------------------------------------------------------------------
# Lambda Artifacts Bucket
# -----------------------------------------------------------------------------

output "lambda_artifacts_bucket" {
  description = "S3 bucket for Lambda deployment artifacts"
  value       = aws_s3_bucket.lambda_artifacts.id
}

# -----------------------------------------------------------------------------
# Frontend Configuration (for React app)
# -----------------------------------------------------------------------------

output "frontend_config" {
  description = "Configuration object for frontend application"
  value = {
    region              = var.aws_region
    userPoolId          = aws_cognito_user_pool.main.id
    userPoolWebClientId = aws_cognito_user_pool_client.web.id
    cognitoDomain       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
    apiEndpoint         = "${aws_apigatewayv2_api.main.api_endpoint}/api"
  }
}

# -----------------------------------------------------------------------------
# Deployment Commands (Helper)
# -----------------------------------------------------------------------------

output "deployment_commands" {
  description = "Helpful deployment commands"
  value = {
    sync_frontend    = "aws s3 sync ./build s3://${aws_s3_bucket.frontend.id} --delete"
    invalidate_cache = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.frontend.id} --paths '/*'"
    update_lambda    = "aws lambda update-function-code --function-name ${aws_lambda_function.api.function_name} --zip-file fileb://lambda.zip"
  }
}

# -----------------------------------------------------------------------------
# DNS Records for GoDaddy (Manual Configuration Required)
# -----------------------------------------------------------------------------

output "godaddy_dns_records" {
  description = "DNS records to create in GoDaddy"
  value = {
    acm_validation = {
      description = "Add this CNAME record in GoDaddy to validate the SSL certificate"
      records = [
        for dvo in aws_acm_certificate.cloudfront.domain_validation_options : {
          type  = dvo.resource_record_type
          name  = trimsuffix(dvo.resource_record_name, ".mihaibercea.com.")
          value = trimsuffix(dvo.resource_record_value, ".")
        }
      ]
    }
    cloudfront_alias = {
      description = "Add this CNAME record in GoDaddy to point your domain to CloudFront"
      type        = "CNAME"
      name        = "debtsettler"
      value       = aws_cloudfront_distribution.frontend.domain_name
    }
  }
}
