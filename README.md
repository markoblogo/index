# Index Platform

![1d3x logo](public/brand/1d3x-logo.png)

Index Platform is a shared Next.js/TypeScript platform for Ukrainian commodity
market indices. The codebase is intentionally organized as one index engine with
tenant-specific brands, content, styling, commodities, respondents, integrations
and deployment settings.

The platform now also includes the 1d3x corporate landing site. 1d3x is the
umbrella brand for local commodity index launches built with institutional
partners and market leaders.

The current live products are:

| Tenant | Public Product | Domain | Runtime Status |
| --- | --- | --- | --- |
| `1d3x` | 1d3x | [1d3x.com](https://1d3x.com) | Corporate landing site and partnership entry point |
| `uga-ua` | UGA Index | [uga.1d3x.com](https://uga.1d3x.com) | Production-style deployment |
| `spike-ua` | SPIKE SPOT INDEX | [spike.1d3x.com](https://spike.1d3x.com) | Production-style deployment, active development |

This is not a mixed "UGA plus Spike" app. It is a multi-brand index platform
where UGA and Spike are two clients running on the same calculation,
publication, respondent and analytics foundation.

Legacy `cr0pto.com` domains are configured as permanent redirects:

- [index-uga.cr0pto.com](https://index-uga.cr0pto.com) redirects to
  [uga.1d3x.com](https://uga.1d3x.com);
- [spike-ua.cr0pto.com](https://spike-ua.cr0pto.com) redirects to
  [spike.1d3x.com](https://spike.1d3x.com).

## What The Platform Does

Shared capabilities:

- English 1d3x landing page with live UGA and Spike embeds;
- Resend-backed 1d3x partnership contact form;
- bilingual public sites with `/uk` and `/en` routes;
- tenant-specific logo, favicon, colors, copy, methodology documents and legal
  pages;
- public index cards with currency switching;
- NBU FX-based conversion for USD, UAH and EUR display;
- DB-backed respondent directory, submissions, calculations and published
  values;
- admin daily input matrix, respondent management and publication workflow;
- respondent cabinet and secure survey links;
- embed routes for partner websites;
- public JSON APIs for latest values, history and FX rates;
- analytics pages with historical values, spreads, movers, volatility and
  scenario views;
- Vercel cron endpoints for scheduled imports, notifications and publication.

UGA-specific features:

- UGA Index brand and content;
- 4 public commodities: corn, wheat 11.5% protein, feed wheat, GMO soybean;
- UGA Black Sea export basis language;
- UGA embed package for the association website;
- email-oriented respondent workflow and UGA member-area/product positioning;
- Neon PostgreSQL production database.

Spike-specific features:

- SPIKE SPOT INDEX brand and visual system;
- 5 public positions: corn, wheat 11.5% protein, feed wheat, GMO soybean,
  sunflower seed;
- CPT Odesa / CPT parity Odesa export and processing basis language;
- MN7R Monitor import as an automatic respondent;
- Telegram-first respondent workflow through `@spike_spot_bot`;
- admin and respondent password onboarding with temporary credentials;
- auto-publication if no manual publish happens before the evening cut-off;
- public blog with mixed-language posts and language filtering;
- Supabase PostgreSQL production database.

## Product Status

Both products are live as demo/production-style versions. They are suitable for
reviewing real workflows, validating integrations and iterating with users.
They are still under active development and should not be treated as final
regulated market-data products until legal, security, backup and operational
reviews are completed.

Current production-oriented state:

- hosting: Vercel;
- platform domain: `https://1d3x.com`;
- UGA domain: `https://uga.1d3x.com`;
- Spike domain: `https://spike.1d3x.com`;
- legacy redirects: `https://index-uga.cr0pto.com` and
  `https://spike-ua.cr0pto.com`;
- UGA database: Neon Postgres;
- Spike database: Supabase Postgres;
- runtime mode: `UGA_INDEX_RUNTIME_MODE=production` for production-style
  deployments;
- demo seed history can be disabled with `SEED_DEMO_HISTORY=0`;
- demo admin password seeding can be disabled with
  `SEED_DEMO_ADMIN_PASSWORD=0`;
- health check: `GET /api/health`;
- latest public values: `GET /api/public/latest`.

Production deployments must have `DATABASE_URL` configured. Without a database,
local development can fall back to seeded/static demo data, but production
runtime should be DB-backed.

## Methodology

The shared calculation engine lives in:

```txt
src/lib/index-calculation.ts
```

Core rules:

- collect respondent prices by tenant, date, commodity and basis;
- ignore invalid, missing, zero and negative prices;
- calculate the median of valid submitted prices;
- exclude outliers where `abs(price - median) / median > 0.02`;
- calculate the arithmetic average of the cleaned sample;
- require the configured minimum number of included respondents before a value
  is fully publishable;
- store official values in `USD/t`;
- preserve raw precision internally and round public display values;
- keep publication locks/audit context after publishing.

Spike MN7R import normalizes monitor values into the same respondent-price
pipeline. If MN7R returns UAH or EUR, the value is converted to USD using the
NBU FX rate for the trade date and the original currency/value is saved in
metadata. Positions with `monitorPrice == null` or `quality == "no_data"` are
cleared/skipped rather than published as fake values.

Relevant tests:

```txt
src/lib/index-calculation.test.ts
src/lib/admin-calculate.test.ts
src/lib/mn7r-monitor-import.test.ts
```

## Spike Operating Model

Spike currently uses a hybrid real/demo model:

- MN7R Monitor is the first automatic respondent.
- Manual/admin-entered respondent prices can be added in the admin matrix.
- Real respondent submissions can be collected through the respondent cabinet or
  Telegram WebApp links.
- Public values are calculated from whatever valid real submissions exist for
  the day.
- Demo data remains available only for demo/fallback modes and must stay
  separated from production calculations.

Scheduled Spike processes:

- MN7R import: `/api/cron/mn7r-monitor-prices`;
- respondent Telegram notifications: `/api/cron/respondent-telegram`;
- auto-publish: `/api/cron/spike-auto-publish`;
- admin invite/onboarding helper: `/api/cron/spike-admin-invites`.

Current `vercel.json` cron schedule:

```json
[
  { "path": "/api/cron/respondent-emails", "schedule": "30 14 * * 1-5" },
  { "path": "/api/cron/respondent-telegram", "schedule": "0 13 * * 1-5" },
  { "path": "/api/cron/mn7r-monitor-prices", "schedule": "0 14 * * *" },
  { "path": "/api/cron/spike-auto-publish", "schedule": "0 16 * * *" }
]
```

Times are UTC in Vercel. The application code applies Kyiv-time business rules
where needed.

Telegram respondent UX:

- weekday request around 16:00 Kyiv;
- reminders around 17:00 and 18:00 Kyiv when no submission exists;
- secure WebApp/survey token opens the daily form;
- respondent sees a success summary and can return to edit the submission;
- admin/super-admin can inspect submissions in the admin matrix.

## Architecture

Core stack:

- Next.js App Router;
- React;
- TypeScript;
- Tailwind CSS;
- Prisma;
- PostgreSQL;
- Vitest;
- ESLint;
- Vercel.

Important modules:

```txt
src/lib/index-platform.ts          tenant configuration
src/lib/constants.ts               active site config
src/lib/public-index-data.ts       public homepage and analytics data
src/lib/admin-daily-inputs.ts      admin daily matrix data/actions
src/lib/admin-calculate.ts         calculation and publication workflow
src/lib/respondent-directory.ts    respondent directory and auth metadata
src/lib/respondent-prices.ts       respondent price upsert/clear helpers
src/lib/mn7r-monitor-import.ts     MN7R Monitor import
src/lib/respondent-telegram.ts     Telegram respondent notifications
src/lib/fx-rates.ts                NBU FX data layer
src/lib/demo-auth.ts               session/auth helpers
src/lib/demo-allowlist.ts          tenant-aware fallback users
```

Tenant configuration controls:

- brand name, public title, logo and favicon;
- public domain;
- commodity list and basis labels;
- respondent pool and baskets;
- contact details;
- methodology PDF path;
- localization/copy;
- whether external indicative comparison is shown;
- public pages, embeds and product positioning.

## Local Setup

Install dependencies:

```bash
npm install
```

Run UGA locally:

```bash
INDEX_TENANT=uga-ua NEXT_PUBLIC_INDEX_TENANT=uga-ua npm run dev
```

Run Spike locally:

```bash
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run dev
```

Run the 1d3x landing site locally:

```bash
INDEX_TENANT=1d3x NEXT_PUBLIC_INDEX_TENANT=1d3x npm run dev
```

Use another port if needed:

```bash
npm run dev -- --port 3100
```

## Environment

Common required variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/index_platform?schema=public"
NEXT_PUBLIC_SITE_URL="https://TENANT_DOMAIN"
INDEX_TENANT="1d3x-or-uga-ua-or-spike-ua"
NEXT_PUBLIC_INDEX_TENANT="1d3x-or-uga-ua-or-spike-ua"
ALLOWED_EMBED_ORIGINS="https://TENANT_DOMAIN http://localhost:* http://127.0.0.1:*"
DEMO_AUTH_SECRET="replace-with-a-long-random-secret"
UGA_INDEX_RUNTIME_MODE="production"
CRON_SECRET="replace-with-a-long-random-cron-secret"
```

1d3x production example:

```bash
NEXT_PUBLIC_SITE_URL="https://1d3x.com"
INDEX_TENANT="1d3x"
NEXT_PUBLIC_INDEX_TENANT="1d3x"
RESEND_API_KEY="set-in-vercel"
PLATFORM_CONTACT_FROM_EMAIL="1d3x <partnerships@1d3x.com>"
PLATFORM_CONTACT_TO_EMAIL="a.biletskiy@gmail.com"
```

UGA production example:

```bash
NEXT_PUBLIC_SITE_URL="https://uga.1d3x.com"
INDEX_TENANT="uga-ua"
NEXT_PUBLIC_INDEX_TENANT="uga-ua"
ALLOWED_EMBED_ORIGINS="https://uga.ua https://www.uga.ua https://1d3x.com https://www.1d3x.com https://uga.1d3x.com https://index-uga.cr0pto.com"
RESEND_API_KEY="set-in-vercel"
RESPONDENT_EMAIL_CRON_SECRET="set-in-vercel"
```

Spike production example:

```bash
NEXT_PUBLIC_SITE_URL="https://spike.1d3x.com"
INDEX_TENANT="spike-ua"
NEXT_PUBLIC_INDEX_TENANT="spike-ua"
ALLOWED_EMBED_ORIGINS="https://spike.broker https://www.spike.broker https://1d3x.com https://www.1d3x.com https://spike.1d3x.com https://spike-ua.cr0pto.com"
MN7R_API_URL="https://mn7r.com"
MN7R_INDEX_EXPORT_TOKEN="set-in-vercel"
MN7R_INDEX_RESPONDENT_CODE="MN7R_MONITOR"
MN7R_IMPORT_CRON_SECRET="set-in-vercel"
SPIKE_AUTO_PUBLISH_CRON_SECRET="set-in-vercel"
SPIKE_ADMIN_INVITE_SECRET="set-in-vercel"
SPIKE_ADMIN_INVITE_SENDER="set-in-vercel"
SPIKE_ADMIN_INVITE_REPLY_TO="set-in-vercel"
SPIKE_TELEGRAM_BOT_TOKEN="set-in-vercel"
SPIKE_TELEGRAM_SMOKE_CHAT_ID="optional-smoke-chat-id"
RESPONDENT_TELEGRAM_CRON_SECRET="set-in-vercel"
```

Do not commit production secrets, connection strings or bot tokens. Use Vercel
Environment Variables or an untracked local `.env` file for operational
commands.

## Database

Generate Prisma client:

```bash
npm run db:generate
```

Apply migrations:

```bash
npx prisma migrate deploy
```

Seed UGA:

```bash
INDEX_TENANT=uga-ua NEXT_PUBLIC_INDEX_TENANT=uga-ua npm run db:seed
```

Seed Spike in production-style mode:

```bash
UGA_INDEX_RUNTIME_MODE=production \
SEED_DEMO_HISTORY=0 \
SEED_DEMO_ADMIN_PASSWORD=0 \
INDEX_TENANT=spike-ua \
NEXT_PUBLIC_INDEX_TENANT=spike-ua \
npm run db:seed
```

The seed is tenant-aware:

- UGA seed creates UGA commodities, respondents, contacts, baskets, fallback
  submissions, external indicatives and published values for demo/review.
- Spike seed creates Spike commodities, CPT Odesa/CPT parity Odesa bases, MN7R
  Monitor, Spike respondent directory entries and auth accounts. Demo history is
  controlled by `SEED_DEMO_HISTORY`.

More detail:

```txt
docs/database.md
```

## Routes

Public:

- `/` for the 1d3x landing site, or locale redirect for index tenants
- `/uk`, `/en`
- `/uk/about`, `/en/about`
- `/uk/methodology`, `/en/methodology`
- `/uk/analytics`, `/en/analytics`
- `/uk/subscription`, `/en/subscription`
- `/uk/blog`, `/en/blog`
- `/uk/privacy`, `/en/privacy`
- `/uk/terms`, `/en/terms`
- `/uk/risk-disclosure`, `/en/risk-disclosure`

Internal:

- `/login`
- `/logout`
- `/setup-password`
- `/admin`
- `/admin/daily-inputs`
- `/admin/respondents`
- `/admin/calculate`
- `/admin/embed`
- `/respondent`
- `/respondent/access/[token]`
- `/member`

Embeds:

- `/embed/cards`
- `/embed/chart`
- `/embed/site`
- `/embed/uga-index.js`

Public API:

- `GET /api/health`
- `GET /api/public/latest`
- `GET /api/public/history`
- `GET /api/public/fx-rates`

Cron/internal API:

- `GET /api/cron/respondent-emails`
- `GET /api/cron/respondent-telegram`
- `GET /api/cron/mn7r-monitor-prices`
- `GET /api/cron/spike-auto-publish`
- `GET /api/cron/spike-admin-invites`

## Embedding

The platform supports compact widgets and full-site iframe embeds.

UGA full-site iframe example:

```html
<iframe
  src="https://uga.1d3x.com/embed/site?locale=uk&theme=light&view=index"
  title="UGA Index"
  loading="lazy"
  style="width:100%;height:860px;border:0;"
  allowfullscreen
></iframe>
```

UGA JS loader example:

```html
<div
  id="uga-index"
  data-locale="uk"
  data-theme="light"
  data-layout="site"
></div>
<script src="https://uga.1d3x.com/embed/uga-index.js" async></script>
```

For new integrations, prefer the `1d3x.com` subdomains. Legacy `cr0pto.com`
embed URLs remain available through redirects for compatibility.

Full details:

```txt
docs/embed.md
```

## Auth

Current auth model:

- Spike admins use email/password accounts with temporary password onboarding.
- Spike respondents use email/password accounts with temporary password setup.
- Spike super-admin can access both admin and respondent areas for control.
- Respondent Telegram links use short-lived survey tokens.
- UGA still supports preview/demo users for development and demonstrations.

Production deployments should avoid generic `admin/admin` or
`respondent/respondent` access. Temporary passwords should be rotated through
the onboarding flow and never committed to source control.

More detail:

```txt
docs/auth.md
```

## Validation

Run before committing code changes:

```bash
npm run lint
npm run test
npm run build
```

Validate tenant builds explicitly:

```bash
INDEX_TENANT=1d3x NEXT_PUBLIC_INDEX_TENANT=1d3x npm run build
INDEX_TENANT=uga-ua NEXT_PUBLIC_INDEX_TENANT=uga-ua npm run build
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run build
```

Optional browser smoke tests:

```bash
npx playwright install chromium
npm run test:e2e
```

For README-only changes, at minimum run:

```bash
git diff --check
```

## Deployment

Recommended setup per tenant:

1. Create a separate Vercel project per tenant.
2. Set `INDEX_TENANT` and `NEXT_PUBLIC_INDEX_TENANT`.
3. Set `NEXT_PUBLIC_SITE_URL` to the tenant domain.
4. Use tenant-specific database/environment settings.
5. Configure `ALLOWED_EMBED_ORIGINS`.
6. Run `npx prisma migrate deploy` against the target database.
7. Run the tenant seed with production-safe flags.
8. Configure cron secrets and integration secrets.
9. Redeploy Vercel.
10. Confirm `GET /api/health` and public pages.

Deployment docs:

```txt
docs/deployment.md
```

## Documentation

Project docs:

- `docs/product-brief.md`
- `docs/implementation-plan.md`
- `docs/database.md`
- `docs/auth.md`
- `docs/deployment.md`
- `docs/embed.md`
- `docs/demo-script.md`
- `docs/known-limitations.md`
- `docs/legal.md`
- `docs/source-analysis.md`
- `docs/variant-design-analysis.md`

Source reference materials:

```txt
docs/source/
```

## Current Next Work

- Finish production security hardening for auth, sessions, role checks and
  secret rotation.
- Keep real and demo data strictly separated in analytics, publication and
  admin views.
- Add backup/restore runbooks for Neon and Supabase databases.
- Add observability for cron runs, MN7R imports, auto-publication and Telegram
  delivery failures.
- Finalize legal text, risk disclosure and methodology PDFs with the project
  owners.
- Add subscription/access-control rules for paid analytics, history exports and
  API access.
- Expand respondent onboarding beyond the first Spike real respondent.
- Continue polishing the 1d3x landing page, partnership copy and live project
  presentation.
