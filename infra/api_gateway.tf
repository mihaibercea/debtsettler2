# -----------------------------------------------------------------------------
# API Gateway HTTP API
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api-${var.environment}"
  description   = "DebtSettler HTTP API"
  protocol_type = "HTTP"

  # CORS configuration
  # Note: CloudFront domain will be added to allow_origins after deployment
  # For production with custom domain, set var.custom_domain
  cors_configuration {
    allow_origins = concat(
      ["http://localhost:3000", "http://localhost:5173"],
      var.custom_domain != "" ? ["https://${var.custom_domain}"] : [],
      var.allowed_origins
    )
    allow_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers  = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    expose_headers = ["*"]
    max_age        = 300
  }

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-api-${var.environment}"
  })
}

# -----------------------------------------------------------------------------
# JWT Authorizer (Cognito)
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  name             = "cognito-jwt-authorizer"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

# -----------------------------------------------------------------------------
# Lambda Integration
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# -----------------------------------------------------------------------------
# API Routes
# -----------------------------------------------------------------------------

# Sessions routes
resource "aws_apigatewayv2_route" "create_session" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/sessions"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_sessions" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/sessions"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_session" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/sessions/{sessionId}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_session" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/sessions/{sessionId}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_session" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /api/sessions/{sessionId}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Settlement route
resource "aws_apigatewayv2_route" "settle" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/sessions/{sessionId}/settle"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Health check (no auth required)
resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/health"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# -----------------------------------------------------------------------------
# API Gateway Stage
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  # Access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      protocol         = "$context.protocol"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
      errorMessage     = "$context.error.message"
    })
  }

  # Throttling settings
  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-api-stage-${var.environment}"
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for API Gateway
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-api-${var.environment}"
  retention_in_days = var.lambda_log_retention_days

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-api-gateway-logs-${var.environment}"
  })
}
