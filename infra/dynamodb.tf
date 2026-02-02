# -----------------------------------------------------------------------------
# DynamoDB Table - Single Table Design
# -----------------------------------------------------------------------------

resource "aws_dynamodb_table" "main" {
  name         = "${var.dynamodb_table_name}-${var.environment}"
  billing_mode = var.dynamodb_billing_mode

  # Only set capacity if using PROVISIONED billing mode
  read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
  write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null

  # Primary key: Partition Key (PK) + Sort Key (SK)
  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # Global Secondary Index for querying sessions by date (optional)
  # Uncomment if needed for listing sessions sorted by creation date
  # attribute {
  #   name = "GSI1PK"
  #   type = "S"
  # }
  #
  # attribute {
  #   name = "GSI1SK"
  #   type = "S"
  # }
  #
  # global_secondary_index {
  #   name            = "GSI1"
  #   hash_key        = "GSI1PK"
  #   range_key       = "GSI1SK"
  #   projection_type = "ALL"
  # }

  # Enable point-in-time recovery for production
  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  # TTL for automatic item cleanup (optional)
  # ttl {
  #   attribute_name = "TTL"
  #   enabled        = true
  # }

  tags = merge(var.additional_tags, {
    Name = "${var.dynamodb_table_name}-${var.environment}"
  })
}
