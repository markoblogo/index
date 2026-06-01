# Operations Runbook

## Pre-Deploy Checks

Run for each deployment tenant:

```bash
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

Validate tenant builds explicitly:

```bash
INDEX_TENANT=1d3x NEXT_PUBLIC_INDEX_TENANT=1d3x npm run build
INDEX_TENANT=uga-ua NEXT_PUBLIC_INDEX_TENANT=uga-ua npm run build
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run build
```

## Health Checks

Use `GET /api/health` after deploy. It reports:

- active tenant context;
- market pack metadata;
- database readiness;
- required production env gaps;
- cron secret presence;
- provider readiness.
- operational alerts.

Production health is unhealthy when a required database/env check fails.

Use `GET /api/ops/alerts` with `Authorization: Bearer <OPS_ALERTS_SECRET or CRON_SECRET>`
from external monitoring. It reports missing production env, missing cron
secret, insufficient respondents and stale/no published values.

## Backup And Restore

For each production database:

1. Confirm provider-level automated backups are enabled.
2. Record database provider, project name, region and retention window.
3. Before migrations, create a manual backup or restore point.
4. Test restore into a non-production database before destructive migrations.
5. Run `npx prisma migrate deploy` only after restore verification.

UGA and Spike can remain in separate production databases. If they move into a
shared database, tenant-scoped constraints must be applied first.

## Alerts

Create alerts for:

- failed cron requests or unauthorized cron bursts;
- MN7R import failures;
- respondent notification failures;
- insufficient respondent counts before publication window;
- stale public values after expected publication time;
- database health check failures;
- missing required production env in `/api/health`.

The first implementation surface is `/api/ops/alerts`; provider-specific alert
delivery can subscribe to that endpoint.

## Audit Export

Admins can review recent audit events at `/admin/audit` and export tenant-scoped
CSV or JSON from `/api/admin/audit-export`.

Supported query parameters:

- `format=csv|json`
- `dateFrom=YYYY-MM-DD`
- `dateTo=YYYY-MM-DD`
- `action=<audit action>`
- `limit=<max rows up to 1000>`

## Security Scan

Before regulated production rollout, run the full Codex Security repository scan
with subagents enabled and keep both markdown and HTML reports with the release
artifacts.

Dependency audit notes are tracked in `docs/security-audit-notes.md`.
