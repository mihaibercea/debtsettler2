#!/usr/bin/env bash
# Deploy script for DebtSettler
# Usage (from WSL):
#   ./deploy.sh          - deploy both backend and frontend
#   ./deploy.sh backend  - deploy backend only
#   ./deploy.sh frontend - deploy frontend only

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
INFRA_DIR="$SCRIPT_DIR/infra"

AWS_PROFILE="mishu-websites"
LAMBDA_FUNCTION="debtsettler-api-prod"
AWS_REGION="eu-central-1"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[done]${NC}   $1"; }
fail() { echo -e "${RED}[error]${NC}  $1"; exit 1; }

deploy_backend() {
  log "Building backend..."
  cd "$BACKEND_DIR"

  npm install --silent
  npx esbuild src/index.ts --bundle --platform=node --target=node20 --outfile=dist/index.js --format=cjs

  log "Packaging Lambda zip..."
  cd dist
  zip -r ../lambda.zip . > /dev/null
  cd ..

  log "Uploading to Lambda ($LAMBDA_FUNCTION)..."
  AWS_PROFILE=$AWS_PROFILE aws lambda update-function-code \
    --function-name "$LAMBDA_FUNCTION" \
    --zip-file fileb://lambda.zip \
    --region "$AWS_REGION" \
    --output text --query 'LastModified' > /dev/null

  ok "Backend deployed."
}

deploy_frontend() {
  log "Building frontend..."
  cd "$FRONTEND_DIR"

  npm install --silent
  npx tsc -b
  npx vite build

  log "Reading Terraform outputs..."
  cd "$INFRA_DIR"
  BUCKET=$(terraform output -raw frontend_bucket_name 2>/dev/null) || fail "Could not read frontend_bucket_name from Terraform. Run 'terraform init && terraform apply' first."
  DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null) || fail "Could not read cloudfront_distribution_id from Terraform."

  log "Syncing to S3 (s3://$BUCKET)..."
  AWS_PROFILE=$AWS_PROFILE aws s3 sync "$FRONTEND_DIR/dist/" "s3://$BUCKET" --delete

  log "Invalidating CloudFront cache ($DIST_ID)..."
  AWS_PROFILE=$AWS_PROFILE aws cloudfront create-invalidation \
    --distribution-id "$DIST_ID" \
    --paths '/*' \
    --output text --query 'Invalidation.Id' > /dev/null

  ok "Frontend deployed."
}

TARGET="${1:-all}"

case "$TARGET" in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  all)
    deploy_backend
    deploy_frontend
    ;;
  *)
    echo "Usage: $0 [backend|frontend|all]"
    exit 1
    ;;
esac

ok "All done!"
