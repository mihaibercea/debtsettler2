# DebtSettler (Serverless AWS) — Proposed Architecture (DynamoDB Storage)

A fully serverless web app that:
- accepts a list of participants + signed money amounts (positive/negative),
- computes a set of payments to settle balances,
- supports authentication (Cognito + optional Google),
- lets each user save and load settlement “sessions”.

This proposal uses **DynamoDB as the only database** (no S3 CSV storage).

---

## Goals

- **Fully serverless** (no EC2/ECS/EKS/RDS).
- **React SPA** frontend.
- **Cognito User Pools** authentication (+ Google optional).
- **Persist sessions per user** in DynamoDB.
- Simple, low-cost, low-ops.

---

## High-Level Architecture

+-----------------------+ +---------------------------+
| React SPA (S3) | | Cognito User Pool |
| + CloudFront CDN |<----->| Hosted UI (optional) |
+-----------+-----------+ | + Google IdP (optional) |
| +-------------+-------------+
| HTTPS (JWT)
v
+---------------------------+
| API Gateway (HTTP API) |
| JWT Authorizer (Cognito) |
+-------------+-------------+
|
v
+---------------+
| Lambda API |
| sessions + |
| settlement |
+-------+-------+
|
v
+-----------+
| DynamoDB |
| sessions |
| items |
| results |
+-----------+

---

## Core AWS Services

### Frontend
- **S3**: stores built React assets
- **CloudFront**: CDN + HTTPS + SPA routing

### Authentication
- **Cognito User Pool**
  - Email/password login
  - Optional: Google federated login via Hosted UI (OAuth2)

### API
- **API Gateway (HTTP API)** with **JWT Authorizer** (User Pool)
- **Lambda** for:
  - validation
  - session CRUD
  - settlement computation

### Database
- **DynamoDB** (single source of truth)

---

## Request Flow

### Login
1. User clicks “Sign in”
2. React redirects to Cognito Hosted UI (or uses Amplify)
3. Cognito returns JWT tokens to SPA
4. SPA calls API with `Authorization: Bearer <JWT>`

### Save Session
1. SPA sends participants + balances
2. Lambda stores input (DynamoDB)
3. Lambda returns `sessionId`

### Compute Settlement
1. SPA calls `POST /sessions/{id}/settle` (or sends list directly)
2. Lambda computes transfers
3. Lambda stores results (DynamoDB) and returns them

---

## Settlement Logic (Concept)

Input: list of `{ name, amount }`
- `amount > 0`: creditor (should receive)
- `amount < 0`: debtor (owes)

Algorithm:
1. Split into creditors and debtors
2. Match greedily:
   - debtor pays creditor `min(debtor_owes, creditor_is_owed)`
   - reduce both; move on when either hits zero
3. Output transfers:
   - `{ from: "Alice", to: "Bob", amount: 25.00 }`

---

## DynamoDB Data Model

### Option A (Recommended): Single-table design

**Table name**: `DebtSettler`

**PK**: `USER#{sub}`  
**SK**: multiple item types per session

Item types:

1) Session metadata
- PK: `USER#<cognito-sub>`
- SK: `SESSION#<sessionId>`
- Attributes:
  - `title`, `currency`, `createdAt`, `updatedAt`, `status`

2) Participant entry
- PK: `USER#<cognito-sub>`
- SK: `ITEM#<sessionId>#<itemId>`
- Attributes:
  - `name`, `amount`

3) Settlement transfer result
- PK: `USER#<cognito-sub>`
- SK: `RESULT#<sessionId>#<resultId>`
- Attributes:
  - `from`, `to`, `amount`

**Queries:**
- List sessions: Query PK, `begins_with(SK, "SESSION#")`
- Load a session: Query PK + filter `begins_with(SK, "ITEM#<sessionId>")` and `begins_with(SK, "RESULT#<sessionId>")`
- Delete a session: Query PK then batch delete all SKs for that session

**Why this works well:**
- Natural multi-tenancy: everything is partitioned by user
- Cheap queries
- Simple ownership enforcement in Lambda

---

## API Design (HTTP API)

All endpoints require JWT auth.

### Sessions
- `POST /sessions`
  - Create session (metadata + items)
- `GET /sessions`
  - List sessions for current user
- `GET /sessions/{sessionId}`
  - Get session metadata + participant items + settlement results
- `PUT /sessions/{sessionId}`
  - Update title/items
- `DELETE /sessions/{sessionId}`
  - Delete session and all related items/results

### Compute
- `POST /sessions/{sessionId}/settle`
  - Compute transfers from saved items
  - Store `RESULT#...` items
  - Return transfers

(Alternative: `POST /settle` for “compute-only” without saving.)

---

## Security / Multi-Tenancy

- API Gateway validates JWTs with Cognito.
- Lambda reads user id from JWT claims (`sub`).
- Lambda always reads/writes only under:
  - `PK = USER#{sub}`
- Users cannot access other users’ sessions unless the code is changed (and IAM allows it).

---

## Deployment Outline (Terraform/CDK)

Provision:
- S3 bucket (frontend)
- CloudFront distribution
- Cognito User Pool + App Client (+ Google IdP optional)
- API Gateway HTTP API + JWT authorizer
- Lambda function + IAM role
- DynamoDB table
- CloudWatch logs

CI/CD:
- Frontend: build → upload to S3 → CloudFront invalidation
- Backend: package Lambda → deploy infra updates

---

## MVP Scope (Recommended v1)

- Cognito auth (email/password)
- Optional Google sign-in
- Create / list / load / delete sessions
- Settlement compute + save results
- Simple React UI

---

## Future Enhancements (Optional)

- Shareable sessions (invite link / read-only)
- Team/workspace mode
- Currency + rounding rules
- Export CSV/PDF (still optional; would use S3 for exports only)
- Retention cleanup (EventBridge scheduled Lambda)
