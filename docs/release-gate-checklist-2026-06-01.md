# Pre-Production Staging Migration Gate

Date: 
Ticket/Reference: 
Environment: 
Lead: 

## Scope
- Tenant targets: `1d3x`, `uga-ua`, `spike-ua`
- Gate purpose: validate new tenant/index composite constraints and FK ownership against historical data in a staging/copy database before production rollout.

## Pre-conditions
- [ ] Access to staging/copy PostgreSQL database URL.
- [ ] Access to historical source DB (optional, for restore) with at least read/pg_dump rights.
- [ ] Running branch is the release candidate with latest migration bundle.
- [ ] Ensure `prisma/migrations` and lockfiles are committed.

## Commands

### 1) Validate on existing staging copy

```bash
STAGING_DATABASE_URL="<staging-copy-url>" \
npm run db:validate-staging-migrations
```

### 2) Validate against production-copy restore (recommended)

```bash
SOURCE_DATABASE_URL="<production-read-url>" \
STAGING_DATABASE_URL="<staging-copy-url>" \
RESET_STAGING_DATABASE=1 \
npm run db:validate-staging-migrations
```

Optional report output:

```bash
MIGRATION_VALIDATION_REPORT=./docs/reports/staging-migration-gate-<tenant>-<timestamp>.json \
SOURCE_DATABASE_URL="..." \
STAGING_DATABASE_URL="..." \
RESET_STAGING_DATABASE=1 \
npm run db:validate-staging-migrations
```

## Expected checks in gate script
- `prisma migrate deploy` runs to the latest migration.
- `prisma validate` passes.
- Integrity checks return zero rows for:
  - RespondentEmailDelivery tenant/index ownership
  - RespondentSurveyToken tenant/index ownership
  - PriceSubmission respondent ownership
  - PriceSubmission commodity ownership
  - PriceSubmission delivery basis ownership
  - User-respondent ownership
  - PasswordSetupToken-user ownership
  - BasketRespondent-basket/respondent ownership

## Pass/Fail outcome
- PASS: All queries return `0` and script exits `0`.
- FAIL: Any non-zero query count. No production deployment until repaired.
- Reconciliation action: fix historical rows or add explicit data repair migration.

## Evidence
- Gate script run log: 
- Report JSON path: 
- Final command exit code: 
- Approver: 
