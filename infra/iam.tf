# -----------------------------------------------------------------------------
# Lambda Execution Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-lambda-role-${var.environment}"
  })
}

# -----------------------------------------------------------------------------
# Lambda Basic Execution Policy (CloudWatch Logs)
# -----------------------------------------------------------------------------

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# -----------------------------------------------------------------------------
# DynamoDB Access Policy
# -----------------------------------------------------------------------------

resource "aws_iam_policy" "lambda_dynamodb" {
  name        = "${var.project_name}-lambda-dynamodb-${var.environment}"
  description = "Allow Lambda to access DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      }
    ]
  })

  tags = var.additional_tags
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = aws_iam_policy.lambda_dynamodb.arn
}

# -----------------------------------------------------------------------------
# X-Ray Tracing Policy (Optional)
# -----------------------------------------------------------------------------

resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# -----------------------------------------------------------------------------
# Cognito Access Policy (for token validation if needed)
# -----------------------------------------------------------------------------

resource "aws_iam_policy" "lambda_cognito" {
  name        = "${var.project_name}-lambda-cognito-${var.environment}"
  description = "Allow Lambda to access Cognito for token validation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CognitoReadOnly"
        Effect = "Allow"
        Action = [
          "cognito-idp:GetUser",
          "cognito-idp:ListUsers"
        ]
        Resource = aws_cognito_user_pool.main.arn
      }
    ]
  })

  tags = var.additional_tags
}

resource "aws_iam_role_policy_attachment" "lambda_cognito" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = aws_iam_policy.lambda_cognito.arn
}
