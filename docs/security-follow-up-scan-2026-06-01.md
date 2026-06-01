# Codex Security Follow-up Scan - 2026-06-01

## Scope

This follow-up validates the eight reportable findings from
`docs/security-deep-scan-2026-06-01.md` after remediation work.

Method:

- focused code tracing of each affected path;
- three read-only subagent validation passes over auth/login, respondent/admin
  tenant boundaries, and notification/token flows;
- targeted regression tests for signed sessions, tenant-scoped password setup,
  and survey token digests;
- full local release checks.

## Validation Result

All eight deep-scan findings are closed in the current working tree.

| ID | Finding | Follow-up disposition |
| --- | --- | --- |
| F1 | Unsigned legacy sessions allow forged access | Closed. Unsigned `demo.*` cookies are rejected, legacy cookies require HMAC, and signed sessions must carry matching tenant/index claims. |
| F2 | Database login not tenant scoped | Closed. User lookup is tenant/index scoped and included respondent records are explicitly checked for matching tenant/index ownership. |
| F3 | Respondent survey reads/writes not tenant-owned | Closed. Survey reads/writes scope basis, respondent, commodities, submissions and audit logs by tenant/index. |
| F4 | Admin respondent child mutations unscoped | Closed. Child mutations validate tenant/index-owned parent respondents or use relation-scoped filters. |
| F5 | Admin daily inputs can write for arbitrary respondent ids | Closed. Submitted respondent and commodity ids are validated against active tenant/index-owned records before price writes. |
| F6 | Survey tokens reusable/plaintext/unscoped | Closed. Tokens are stored as digests, selected by tenant/index, and consumed atomically with guarded `updateMany`. |
| F7 | Notification scheduling and Telegram token issuance unscoped | Closed. Recipient selection, delivery logs, schedules, and token issuance are tenant/index scoped; DB composite FKs enforce respondent ownership for deliveries/tokens. |
| F8 | Spike admin respondent preview unscoped | Closed. Preview respondent selection is tenant/index scoped. |

## Remediation Evidence

### Auth and Sessions

- `src/lib/demo-auth.ts` rejects `demo.*`, verifies legacy signatures with HMAC,
  writes `tenantId` and `indexProductId` into new session cookies, and rejects
  missing or mismatched tenant/index claims.
- `src/app/setup-password/page.tsx` no longer emits a hidden `setupSession`.
- `src/app/api/setup-password/route.ts` no longer accepts form-supplied
  sessions.
- `src/lib/password-setup.ts` validates tenant/index-owned respondents before
  respondent auth updates.
- `src/lib/demo-allowlist.ts` scopes database login queries and rejects included
  respondents whose `tenantId` or `indexProductId` does not match.

### Tenant-owned Data Paths

- `src/lib/respondent-survey.ts` scopes respondent survey read/write paths by
  tenant/index and rejects foreign respondent or commodity ids.
- `src/lib/respondent-directory.ts` validates respondent/user ownership by both
  `tenantId` and `indexProductId`; child mutations use scoped parent relation
  filters.
- `src/lib/admin-daily-inputs.ts` validates active tenant/index-owned
  respondent ids and commodities before upserting prices.
- `src/lib/respondent-prices.ts` no longer upserts respondents by global id; it
  rejects existing respondents from another tenant/index and creates scoped
  respondents otherwise.

### Tokens, Notifications, and DB Integrity

- `prisma/schema.prisma` adds tenant/index scope to `RespondentEmailSchedule`,
  `RespondentEmailDelivery`, and `RespondentSurveyToken`.
- `RespondentSurveyToken` stores `tokenDigest` instead of plaintext `token`.
- `src/app/respondent/access/[token]/route.ts` looks up tokens by digest and
  tenant/index, checks respondent tenant/index, and atomically consumes the
  token with `updateMany` guarded by `usedAt: null` and `expiresAt > now`.
- Composite FKs now enforce that `RespondentEmailDelivery`,
  `RespondentSurveyToken`, and `PriceSubmission` rows reference respondents in
  the same `tenantId` and `indexProductId`.
- `PriceSubmission` uniqueness now includes `indexProductId`, avoiding future
  same-tenant multi-product collisions.

## Database Migrations Added

- `prisma/migrations/20260601161000_tenant_scope_survey_notifications/migration.sql`
- `prisma/migrations/20260601165000_price_submission_index_product_unique/migration.sql`
- `prisma/migrations/20260601165500_respondent_notification_composite_fks/migration.sql`
- `prisma/migrations/20260601170000_price_submission_composite_respondent_fk/migration.sql`

## Regression Coverage Added

- `src/lib/demo-auth.test.ts`
  - rejects `demo.<payload>` unsigned sessions;
  - rejects legacy invalid signatures;
  - accepts current signed sessions;
  - rejects signed sessions missing tenant/index claims.
- `src/lib/password-setup.test.ts`
  - verifies admin password setup uses tenant/index-scoped lookup;
  - rejects respondent password setup for foreign respondents.
- `src/lib/respondent-survey-token.test.ts`
  - verifies survey token storage uses deterministic digest values that are not
    equal to bearer tokens.

## Verification Commands

All commands passed on 2026-06-01:

```bash
npx prisma generate
npm run test
npm run lint
npm run build
npm audit --omit=dev
```

Observed results:

- Prisma Client generated successfully.
- Vitest: `21 passed`, `60 passed`.
- ESLint: passed.
- Next.js production build: passed.
- npm audit production dependencies: `found 0 vulnerabilities`.

## Remaining Release Notes

- This follow-up scan closes the previously reportable deep-scan findings.
- Production rollout should still run migrations against a staging copy first
  because new composite FKs will fail if historical rows have inconsistent
  tenant/index ownership.
- Keep `DEMO_AUTH_SECRET`, cron secrets, and production runtime env validation
  as deployment gates.
