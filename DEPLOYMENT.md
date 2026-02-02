# DebtSettler Deployment Guide

This guide covers deploying the DebtSettler application to AWS.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   CloudFront    │────▶│   S3 (Frontend)  │     │   Cognito   │
│      CDN        │     │   React SPA      │     │  User Pool  │
└────────┬────────┘     └──────────────────┘     └──────┬──────┘
         │                                              │
         │ /api/*                                       │ JWT
         ▼                                              ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  API Gateway    │────▶│     Lambda       │────▶│  DynamoDB   │
│   HTTP API      │     │   (Node.js)      │     │   Table     │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

## Prerequisites

- AWS CLI configured with profile `mishu-websites`
- Terraform >= 1.0
- Node.js >= 20
- npm >= 9

## Directory Structure

```
debtsettler2/
├── infra/           # Terraform infrastructure
├── backend/         # Lambda API (Node.js)
├── frontend/        # React SPA
├── README.md        # Architecture documentation
└── DEPLOYMENT.md    # This file
```

---

## 1. Infrastructure Setup (Terraform)

### First-time Setup

```bash
cd infra

# Create secrets file
cp secrets.tfvars.example secrets.tfvars
# Edit secrets.tfvars with your values:
# - google_client_id
# - google_client_secret

# Initialize Terraform
terraform init

# Review changes
terraform plan -var-file="secrets.tfvars"

# Deploy infrastructure
terraform apply -var-file="secrets.tfvars"
```

### After Deployment

Terraform will output important values:
- `frontend_bucket_name` - S3 bucket for frontend
- `cloudfront_distribution_id` - CloudFront distribution ID
- `cloudfront_distribution_domain` - CloudFront domain
- `api_invoke_url` - API Gateway endpoint
- `cognito_user_pool_id` - Cognito User Pool ID
- `godaddy_dns_records` - DNS records for GoDaddy

View outputs anytime:
```bash
cd infra
terraform output
```

---

## 2. DNS Setup (GoDaddy)

Add these CNAME records in GoDaddy DNS for `mihaibercea.com`:

### ACM Certificate Validation
```
Type:  CNAME
Name:  _xxxx.debtsettler
Value: _xxxx.acm-validations.aws
```
(Get exact values from `terraform output godaddy_dns_records`)

### CloudFront Alias
```
Type:  CNAME
Name:  debtsettler
Value: dxxxxx.cloudfront.net
```
(Get exact value from `terraform output cloudfront_distribution_domain`)

---

## 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

2. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: `DebtSettler`

3. Add **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   https://debtsettler.mihaibercea.com
   ```

4. Add **Authorized redirect URIs**:
   ```
   https://debtsettler-prod-vilkue82.auth.eu-central-1.amazoncognito.com/oauth2/idpresponse
   ```

5. Copy Client ID and Client Secret to `infra/secrets.tfvars`

6. Re-apply Terraform:
   ```bash
   cd infra
   terraform apply -var-file="secrets.tfvars"
   ```

---

## 4. Backend Deployment

### Build and Deploy Lambda

```bash
cd backend

# Install dependencies
npm install

# Build, package, and deploy
npm run deploy
```

Or manually:
```bash
# Build
npm run build

# Package
npm run package

# Deploy
AWS_PROFILE=mishu-websites aws lambda update-function-code \
  --function-name debtsettler-api-prod \
  --zip-file fileb://lambda.zip \
  --region eu-central-1
```

### Verify Lambda

```bash
# Check logs
AWS_PROFILE=mishu-websites aws logs tail /aws/lambda/debtsettler-api-prod \
  --since 5m --region eu-central-1

# Test health endpoint
curl https://eib7e1j2z8.execute-api.eu-central-1.amazonaws.com/api/health
```

---

## 5. Frontend Deployment

### Build and Deploy

```bash
cd frontend

# Install dependencies
npm install

# Build
npm run build

# Upload to S3
AWS_PROFILE=mishu-websites aws s3 sync dist/ \
  s3://debtsettler-frontend-prod-ppit75g5 --delete

# Invalidate CloudFront cache
AWS_PROFILE=mishu-websites aws cloudfront create-invalidation \
  --distribution-id E1X4ZM6K5AKIL9 --paths '/*'
```

### Local Development

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## 6. Quick Reference

### URLs

| Resource | URL |
|----------|-----|
| Website | https://debtsettler.mihaibercea.com |
| API | https://eib7e1j2z8.execute-api.eu-central-1.amazonaws.com/api |
| Cognito Hosted UI | https://debtsettler-prod-vilkue82.auth.eu-central-1.amazoncognito.com |

### AWS Resources

| Resource | Name/ID |
|----------|---------|
| S3 Bucket | `debtsettler-frontend-prod-ppit75g5` |
| CloudFront | `E1X4ZM6K5AKIL9` |
| Lambda | `debtsettler-api-prod` |
| DynamoDB | `DebtSettler-prod` |
| Cognito User Pool | `eu-central-1_wBTAQOGSU` |

### Deploy Commands Cheatsheet

```bash
# Infrastructure
cd infra && terraform apply -var-file="secrets.tfvars"

# Backend
cd backend && npm run deploy

# Frontend
cd frontend && npm run build && \
  AWS_PROFILE=mishu-websites aws s3 sync dist/ s3://debtsettler-frontend-prod-ppit75g5 --delete && \
  AWS_PROFILE=mishu-websites aws cloudfront create-invalidation --distribution-id E1X4ZM6K5AKIL9 --paths '/*'
```

---

## Troubleshooting

### Lambda 500 Errors
Check CloudWatch logs:
```bash
AWS_PROFILE=mishu-websites aws logs tail /aws/lambda/debtsettler-api-prod \
  --since 10m --region eu-central-1
```

### CloudFront Not Updating
Invalidate cache:
```bash
AWS_PROFILE=mishu-websites aws cloudfront create-invalidation \
  --distribution-id E1X4ZM6K5AKIL9 --paths '/*'
```

### DNS Not Resolving
Check DNS propagation:
```bash
dig debtsettler.mihaibercea.com
nslookup debtsettler.mihaibercea.com
```

### CORS Errors
Ensure the domain is in `allowed_origins` in `infra/terraform.tfvars`:
```hcl
allowed_origins = [
  "https://debtsettler.mihaibercea.com"
]
```
Then re-apply Terraform.
