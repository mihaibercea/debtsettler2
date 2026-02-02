# -----------------------------------------------------------------------------
# Lambda Function
# -----------------------------------------------------------------------------

# Placeholder zip for initial deployment
# Replace with actual deployment package from CI/CD
data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda_placeholder.zip"

  source {
    content  = <<-EOF
      exports.handler = async (event) => {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
          },
          body: JSON.stringify({
            message: 'DebtSettler API - Placeholder',
            timestamp: new Date().toISOString()
          })
        };
      };
    EOF
    filename = "index.js"
  }
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api-${var.environment}"
  description   = "DebtSettler API Lambda function"
  role          = aws_iam_role.lambda_execution.arn

  # Use placeholder for initial deployment
  # CI/CD should update this with actual code
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  handler = "index.handler"
  runtime = var.lambda_runtime

  memory_size = var.lambda_memory_size
  timeout     = var.lambda_timeout

  # Environment variables
  environment {
    variables = {
      NODE_ENV                            = var.environment
      DYNAMODB_TABLE                      = aws_dynamodb_table.main.name
      COGNITO_USER_POOL_ID                = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID                   = aws_cognito_user_pool_client.web.id
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }

  # X-Ray tracing
  tracing_config {
    mode = var.environment == "prod" ? "Active" : "PassThrough"
  }

  # Reserved concurrency (optional - uncomment to limit)
  # reserved_concurrent_executions = 100

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-api-${var.environment}"
  })

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_dynamodb,
    aws_cloudwatch_log_group.lambda
  ]
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-api-${var.environment}"
  retention_in_days = var.lambda_log_retention_days

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-api-logs-${var.environment}"
  })
}

# -----------------------------------------------------------------------------
# Lambda Permission for API Gateway
# -----------------------------------------------------------------------------

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# Lambda Function URL (Optional - for direct invocation testing)
# -----------------------------------------------------------------------------

# resource "aws_lambda_function_url" "api" {
#   function_name      = aws_lambda_function.api.function_name
#   authorization_type = "NONE"
#
#   cors {
#     allow_origins     = ["*"]
#     allow_methods     = ["*"]
#     allow_headers     = ["*"]
#     expose_headers    = ["*"]
#     max_age           = 3600
#   }
# }
