# Local Security Scan - 2026-06-01

## Scope

This report covers a local repository-wide security review for the 1D3X Index
Ecosystem hardening branch. It is not the full Codex Security Deep Scan: that
workflow requires explicit authorization to run subagents/parallel agents.

Reviewed surfaces:

- tenant-scoped Prisma schema and migrations;
- public, admin, respondent, internal and cron API routes;
- auth setup-token flow and remaining demo auth boundaries;
- global and embed-specific security headers;
- rate limiting and cron authorization;
- dependency and secret-pattern scans;
- existing test, build and Playwright tenant smoke evidence.

## Evidence

Commands run locally on 2026-06-01:

```bash
npm audit --omit=dev
```

Result: `found 0 vulnerabilities`.

```bash
rg -n --hidden -g '!node_modules' -g '!.next' -g '!test-results' \
  -g '!package-lock.json' \
  "(AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|DATABASE_URL=.*://|CRON_SECRET=|RESEND_API_KEY=|TELEGRAM_BOT_TOKEN=|MN7R_INDEX_EXPORT_TOKEN=)" \
  .
```

Result: no committed private keys or live provider token patterns were found.
Matches were documentation placeholders in `README.md`, `docs/*.md` and
`.env.example`.

Previously verified on this branch:

- `npm run lint` passed;
- `npm run test` passed: 19 files, 54 tests;
- `npm run build` passed;
- `npm run test:e2e:tenants` passed with the tenant matrix:
  - platform: 2 passed, 4 skipped;
  - UGA: 5 passed, 1 skipped;
  - Spike: 4 passed, 2 skipped.

## Implemented Controls Reviewed

- Cron endpoints call `isCronRequestAuthorized`; production without configured
  secret fails closed.
- Login, setup-password, platform-contact and survey-token entrypoints use
  request-keyed rate limiting.
- Global security headers are configured for all routes, with a stricter
  embed-specific CSP for `/embed/*`.
- Password setup links use random tokens and stored SHA-256 digests; completed
  setup clears temporary password fields and consumes outstanding setup tokens.
- `Tenant`, `Market`, `IndexProduct` and tenant-scoped market data fields are
  modeled in Prisma.
- Core market-data tables require `tenantId` and `indexProductId`, with scoped
  unique constraints.
- Public data, respondent submissions, calculations, publications and audit
  export use tenant-scoped access helpers.
- `/api/internal/spike-setup` is disabled in production runtime.
- `/api/cron/uga-spike-demo-sync` returns Gone in production and was removed
  from Vercel cron scheduling.
- `/api/health` and `/api/ops/alerts` expose production readiness and operational
  alert surfaces.

## Findings

### No High/Critical Findings In Local Scan

The local scan did not identify committed live secrets, dependency advisories,
or a new high/critical issue in the reviewed hardening surfaces.

### Medium: Deep Security Scan Still Gated

The full Codex Security Deep Scan with subagents has not been run because this
thread has not received explicit subagent authorization. Treat that scan as a
required release gate before regulated production rollout.

Recommended next action: explicitly authorize the repository-wide Codex Security
Deep Scan with subagents, then archive its markdown and HTML reports alongside
this local report.

### Medium: Local Production Env Requires Out-of-Repo Review

Only `.env.example` is tracked. Local production env files, if present on an
operator machine or in Vercel, must be reviewed and rotated outside the repo.
Do not commit real `DATABASE_URL`, cron, email, Telegram or MN7R tokens.

Recommended next action: inventory production env vars in Vercel, confirm secret
length/rotation policy, and rotate any values that were ever shared in chat,
docs, screenshots or local machines outside the deployment boundary.

### Low: Demo Auth Compatibility Remains Isolated But Present

Demo temporary-password compatibility remains in demo/local auth helpers and in
the production-disabled Spike setup route. This is acceptable only while demo
mode remains explicit and production routes do not depend on demo API naming.

Recommended next action: schedule removal of demo temporary-password compatibility
after all respondent/admin onboarding uses setup links.

## File Evidence

- `src/lib/cron-auth.ts`
- `src/lib/rate-limit.ts`
- `next.config.ts`
- `src/lib/password-setup-token.ts`
- `src/lib/tenant-data-scope.ts`
- `src/lib/public-api-data.ts`
- `src/lib/respondent-prices.ts`
- `src/lib/admin-calculate.ts`
- `src/lib/audit-export.ts`
- `src/app/api/internal/spike-setup/route.ts`
- `src/app/api/cron/uga-spike-demo-sync/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/ops/alerts/route.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260601120000_tenant_market_foundation/migration.sql`
- `prisma/migrations/20260601133000_password_setup_tokens/migration.sql`
- `prisma/migrations/20260601143000_require_tenant_scope/migration.sql`
- `prisma/migrations/20260601150000_tenant_scoped_market_uniqueness/migration.sql`
- `playwright.config.ts`

## Release Gate

Before production rollout:

1. Run the full Codex Security Deep Scan with explicit subagent authorization.
2. Re-run `npm audit --omit=dev`, `npm run lint`, `npm run test`,
   `npm run build` and `npm run test:e2e:tenants`.
3. Review production env in Vercel and rotate any stale or shared secrets.
4. Confirm backup/restore runbook execution for each production database.
