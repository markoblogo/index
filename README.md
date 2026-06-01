# 1D3X Index Ecosystem

Shared Next.js/TypeScript platform for launching commodity spot index products
under the 1D3X umbrella. The repository contains the public 1D3X site, current
UGA and Spike index products, and the reusable foundation for future country or
territory market packs.

## Products

| Tenant | Product | Domain | Role |
| --- | --- | --- | --- |
| `1d3x` | 1D3X | `https://1d3x.com` | Umbrella brand, landing site, partnership entry point |
| `uga-ua` | UGA Index | `https://uga.1d3x.com` | Ukrainian grain/oilseed index product |
| `spike-ua` | SPIKE SPOT INDEX | `https://spike.1d3x.com` | Ukrainian spot index product with MN7R and Telegram workflows |

1D3X is not an index tenant. It is the umbrella platform. UGA, Spike and future
country products are market/index tenants that share the same engine,
repositories, security model and operational patterns.

## Architecture

The repository is an npm workspace monorepo with a root Next.js runtime and
package boundaries for the reusable platform pieces:

```txt
apps/platform-web       1D3X umbrella site wrapper
apps/index-web          UGA/Spike index site wrapper
packages/index-engine   calculation/publication engine boundary
packages/data           tenant-scoped data access boundary
packages/auth           auth/session/setup-token boundary
packages/integrations   external provider boundary
packages/market-packs   tenant/market pack boundary
packages/ui             tenant-neutral UI boundary
src/                    current Next.js app/runtime implementation
prisma/                 schema, migrations, seed
docs/                   operational, security and product documentation
```

The active tenant is selected with:

```bash
INDEX_TENANT=uga-ua
NEXT_PUBLIC_INDEX_TENANT=uga-ua
```

Supported runtime tenants are `1d3x`, `uga-ua` and `spike-ua`.

## Tenant Model

Market-data code is tenant scoped. The required context is:

```ts
{
  tenantId: "uga-ua" | "spike-ua",
  marketId?: string,
  indexProductId: string,
  runtimeMode: "development" | "demo" | "production"
}
```

Core market tables include explicit tenant/index product ownership. Sensitive
flows enforce this in code and, where needed, with database constraints:

- commodities, delivery bases, baskets and respondents are tenant/index owned;
- submissions, calculations, publications and audit logs are tenant/index owned;
- user login, setup links and sessions are bound to the active tenant/index;
- survey tokens are digest-only, tenant/index scoped and one-time use;
- notification deliveries, survey tokens and price submissions reference
  respondents through composite tenant/index foreign keys.

This supports separate production databases per client today and a shared
database topology later without allowing tenant data to mix.

## Core Capabilities

- bilingual public index sites;
- public latest/history/FX APIs;
- embeddable widgets and iframe views;
- admin daily-input, calculation and publication workflows;
- respondent directory, respondent cabinet and survey links;
- UGA email-oriented respondent workflow;
- Spike MN7R import and Telegram-first respondent workflow;
- NBU FX conversion;
- tenant-scoped health checks, audit logs and operational alerts.

## Local Development

Install dependencies:

```bash
npm install
```

Run the 1D3X site:

```bash
npm run dev:platform
```

Run UGA:

```bash
npm run dev:uga
```

Run Spike:

```bash
npm run dev:spike
```

Use a different port when needed:

```bash
npm run dev:spike -- --port 3100
```

## Database

Generate Prisma client:

```bash
npm run db:generate
```

Apply committed migrations:

```bash
npx prisma migrate deploy
```

Seed a tenant:

```bash
INDEX_TENANT=uga-ua NEXT_PUBLIC_INDEX_TENANT=uga-ua npm run db:seed
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run db:seed
```

Production-style seeding should avoid demo history and demo admin passwords:

```bash
UGA_INDEX_RUNTIME_MODE=production \
SEED_DEMO_HISTORY=0 \
SEED_DEMO_ADMIN_PASSWORD=0 \
INDEX_TENANT=spike-ua \
NEXT_PUBLIC_INDEX_TENANT=spike-ua \
npm run db:seed
```

Before production rollout, run migrations against a staging copy first. Recent
security migrations add composite tenant/index ownership constraints and will
correctly fail if historical rows contain inconsistent ownership.

Repeatable staging validation:

```bash
STAGING_DATABASE_URL="postgresql://..." npm run db:validate-staging-migrations
```

To restore production data into a staging database first:

```bash
SOURCE_DATABASE_URL="postgresql://production-read-url" \
STAGING_DATABASE_URL="postgresql://staging-copy-url" \
RESET_STAGING_DATABASE=1 \
npm run db:validate-staging-migrations
```

## Environment

Common production variables:

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SITE_URL="https://tenant-domain"
INDEX_TENANT="1d3x-or-uga-ua-or-spike-ua"
NEXT_PUBLIC_INDEX_TENANT="1d3x-or-uga-ua-or-spike-ua"
UGA_INDEX_RUNTIME_MODE="production"
DEMO_AUTH_SECRET="long-random-secret"
CRON_SECRET="long-random-secret"
ALLOWED_EMBED_ORIGINS="https://tenant-domain"
```

Optional integrations depend on the tenant:

- platform contact form: `RESEND_API_KEY`, contact from/to emails;
- UGA respondent email: `RESPONDENT_EMAIL_CRON_SECRET`;
- Spike MN7R: `MN7R_API_URL`, `MN7R_INDEX_EXPORT_TOKEN`,
  `MN7R_IMPORT_CRON_SECRET`;
- Spike Telegram: `SPIKE_TELEGRAM_BOT_TOKEN`,
  `RESPONDENT_TELEGRAM_CRON_SECRET`;
- Spike auto-publish: `SPIKE_AUTO_PUBLISH_CRON_SECRET`.

Do not commit production secrets, database URLs, API tokens or bot tokens.

## Validation

Run before merging code changes:

```bash
npx prisma generate
npm run typecheck:packages
npm run test
npm run lint
npm run build
npm audit --omit=dev
```

Tenant build matrix:

```bash
npm run build:platform
npm run build:uga
npm run build:spike
npm run build:tenants
```

Playwright smoke tests are available when browser verification is needed:

```bash
npx playwright install chromium
npm run test:e2e:tenants
```

For documentation-only changes, at minimum run:

```bash
git diff --check
```

## Security Status

Security reports are tracked in `docs/`:

- `docs/security-scan-2026-06-01.md`
- `docs/security-deep-scan-2026-06-01.md`
- `docs/security-follow-up-scan-2026-06-01.md`
- `docs/security-audit-notes.md`
- `docs/implementation-report-2026-06-01.md`

The full Codex Security Deep Scan found eight reportable findings. The follow-up
scan validates that those findings are fixed in the current codebase.

Current security gates before regulated production rollout:

1. Run migrations on staging data and confirm tenant/index ownership constraints
   apply cleanly with `npm run db:validate-staging-migrations`.
2. Run the validation command set above.
3. Verify production env with `npm run check:production-env`.
4. Confirm `GET /api/health` is healthy for each tenant deployment.
5. Review production secrets and rotate any shared or stale credentials.

## Deployment

Each tenant should run as a separate Vercel project with tenant-specific
environment variables, database, domain and cron secrets.

Guarded deploy scripts:

```bash
npm run deploy:1d3x
npm run deploy:uga
npm run deploy:spike
```

Rollout checklist:

1. Confirm the Vercel project mapping.
2. Set tenant env and integration secrets.
3. Run `npx prisma migrate deploy`.
4. Seed only when needed, with production-safe flags.
5. Deploy.
6. Check `/api/health`.
7. Smoke public pages, login, admin flows, respondent flows and embeds.

More detail: `docs/deployment.md` and `docs/operations-runbook.md`.

## Public Interfaces

Public routes:

- `/`
- `/uk`, `/en`
- `/uk/about`, `/en/about`
- `/uk/methodology`, `/en/methodology`
- `/uk/analytics`, `/en/analytics`
- `/uk/blog`, `/en/blog`
- `/uk/privacy`, `/en/privacy`
- `/uk/terms`, `/en/terms`
- `/uk/risk-disclosure`, `/en/risk-disclosure`

Workflows:

- `/login`
- `/logout`
- `/setup-password`
- `/admin`
- `/admin/daily-inputs`
- `/admin/respondents`
- `/admin/calculate`
- `/admin/audit`
- `/respondent`
- `/respondent/access/[token]`
- `/member`

Embeds:

- `/embed/cards`
- `/embed/chart`
- `/embed/site`
- `/embed/uga-index.js`

Public APIs:

- `GET /api/health`
- `GET /api/public/latest`
- `GET /api/public/history`
- `GET /api/public/fx-rates`

Cron/internal APIs:

- `GET /api/cron/respondent-emails`
- `GET /api/cron/respondent-telegram`
- `GET /api/cron/mn7r-monitor-prices`
- `GET /api/cron/spike-auto-publish`
- `GET /api/cron/uga-spike-demo-sync`
- `GET /api/cron/spike-admin-invites`

## Creating A New Market Pack

A new country or territory index should start as a market pack, not as a fork.
Define:

- tenant, market and index product ids;
- brand, domain, theme, locales and copy;
- commodities and delivery bases;
- methodology, legal and risk-disclosure assets;
- respondent collection mode;
- integration adapters;
- deployment env requirements;
- seed data and smoke checks.

The reusable engine, auth, data access, integrations and UI packages should stay
tenant-neutral.

## Documentation

Most operational detail lives outside the README:

- `docs/tenant-architecture.md`
- `docs/database.md`
- `docs/auth.md`
- `docs/deployment.md`
- `docs/operations-runbook.md`
- `docs/embed.md`
- `docs/product-brief.md`
- `docs/legal.md`
