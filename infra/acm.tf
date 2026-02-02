# -----------------------------------------------------------------------------
# ACM Certificate (must be in us-east-1 for CloudFront)
# -----------------------------------------------------------------------------

resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = var.custom_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-certificate"
  })
}

# -----------------------------------------------------------------------------
# Certificate Validation
# -----------------------------------------------------------------------------
# Note: DNS validation records must be created manually in GoDaddy
# After running terraform apply, check the outputs for the CNAME records needed

resource "aws_acm_certificate_validation" "cloudfront" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.cloudfront.arn

  # This will wait until the certificate is validated
  # You must add the DNS records in GoDaddy for this to complete
  timeouts {
    create = "45m"
  }
}
