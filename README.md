# Index Platform

Index Platform is a Next.js/TypeScript platform for bilingual Ukrainian commodity market indices. The current primary tenant is **UGA Index** for the Ukrainian Grain Association. The codebase also contains a Spike tenant configuration that reuses the same calculation engine, internal workflows, public APIs and embed infrastructure.

## Live Deployments

- UGA Index: [https://index-uga.cr0pto.com](https://index-uga.cr0pto.com)
- Spike tenant preview: [https://spike-ua.cr0pto.com](https://spike-ua.cr0pto.com)

Both deployments are Vercel projects built from the same repository with tenant-specific environment variables.

## Production Status

The UGA Index production deployment is currently connected to a Neon PostgreSQL database.

Current production state:

- Hosting: Vercel
- Domain: `https://index-uga.cr0pto.com`
- Runtime mode: `UGA_INDEX_RUNTIME_MODE=production`
- Database provider: Neon Postgres
- Database region: `aws-eu-central-1`
- Prisma migration status: baseline migration applied
- Seed status: UGA seed applied
- Health check: `GET /api/health` returns `database: "ok"`
- Public latest API: `GET /api/public/latest` returns DB-backed published index values

Seeded production data currently includes:

- 4 commodities
- 12 respondent directory companies
- 12 respondent contacts
- 28 published index rows

Respondent email delivery is configured through Resend, but real sending should only be triggered after replacing seeded demo respondent emails with real recipient addresses and setting the administrator reply-to email in `/admin/respondents`.

## Current UGA Product

UGA Index publishes a daily Ukrainian spot export price benchmark for key grain and oilseed commodities.

Current public commodities:

- Corn / Кукурудза
- Wheat 11.5% protein / Пшениця 11.5pro
- Feed wheat / Пшениця фураж
- GMO soybean / Соя ГМО

Current UGA basis language:

- Hero and methodology reference: `CPT Black Sea Panamax Ports (POC)`
- Index cards, respondent forms and tables: `CPT UA Black Sea`
- Delivery period: `T+30`
- Official currency: `USD/t`
- Optional display conversions: `UAH/t` and `EUR/t` using NBU FX rates with fallback demo rates

The public site includes:

- Ukrainian and English localization with `/uk` and `/en` routes
- automatic root locale redirect using locale cookie and country header
- public homepage with current index cards and currency switching
- About, Methodology, Analytics, Cooperation/Subscription and legal pages
- compact footer with UGA contacts, disclaimer and legal links
- embeddable cards, chart and full-site views for the UGA website
- public JSON API routes for latest values, history and FX rates

## Internal Workflows

The internal area is a working preview of the intended operational flow.

Admin routes:

- `/admin` - internal landing page
- `/admin/daily-inputs` - daily respondent price input matrix
- `/admin/respondents` - respondent directory, contacts, login email, temporary passwords and collection mode
- `/admin/calculate` - calculation preview and publication workflow
- `/admin/embed` - embed preview and copyable embed code for the UGA website

Respondent route:

- `/respondent` - focused daily survey for the logged-in respondent company

Current admin behavior:

- respondent companies are maintained in the respondent directory;
- active respondent count is used in public index cards and analytics displays;
- respondent contacts can include multiple people per company;
- each respondent has a login email and temporary password status;
- collection mode indicates whether the company fills the site form or requires manual outreach;
- daily input compares respondent prices against an external benchmark reference;
- calculation uses respondent prices only and does not silently publish benchmark fallback values;
- published values are treated as locked and audit-visible.

## Calculation Methodology

Shared calculation engine:

```txt
src/lib/index-calculation.ts
```

Rules:

- collect respondent prices by date, commodity and delivery basis;
- ignore invalid, missing, zero and negative prices;
- calculate the median of valid submitted prices;
- exclude prices where `abs(price - median) / median > 0.02`;
- calculate the arithmetic average of the cleaned sample;
- require at least 5 included respondent prices for `publishable`;
- round public values to one decimal place while preserving raw precision internally;
- keep official published values in `USD/t`;
- support future weighted baskets while current preview baskets use weight `1`.

Unit tests:

```txt
src/lib/index-calculation.test.ts
src/lib/admin-calculate.test.ts
```

## Architecture

Core stack:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL-ready schema
- Vitest
- ESLint
- Vercel

Important modules:

```txt
src/lib/index-platform.ts       tenant configuration
src/lib/constants.ts            runtime site config
src/lib/mock-data.ts            commodity and public fallback data
src/lib/respondent-directory.ts DB-backed respondent directory with local fallback
src/lib/admin-daily-inputs.ts   admin matrix data/actions
src/lib/admin-calculate.ts      admin calculation/publication workflow
src/lib/public-index-data.ts    homepage/analytics public data
src/lib/fx-rates.ts             NBU FX server-side data layer
src/lib/demo-auth.ts            allowlist/session helper
src/lib/demo-allowlist.ts       tenant-aware allowlist users
```

Tenant-specific configuration controls:

- brand name, logo and favicon;
- public domain;
- commodity list;
- delivery basis labels and baskets;
- respondent pool;
- methodology PDF;
- contact details;
- public copy and localization;
- whether external benchmark comparison is shown in admin workflows.

## Local Setup

Install dependencies:

```bash
npm install
```

Start the default UGA tenant:

```bash
npm run dev
```

Start the Spike tenant:

```bash
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run dev
```

Use another port if needed:

```bash
npm run dev -- --port 3100
```

## Environment

UGA example:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/index_platform?schema=public"
NEXT_PUBLIC_SITE_URL="https://index-uga.cr0pto.com"
INDEX_TENANT="uga-ua"
NEXT_PUBLIC_INDEX_TENANT="uga-ua"
ALLOWED_EMBED_ORIGINS="https://uga.ua https://www.uga.ua https://index-uga.cr0pto.com http://localhost:* http://127.0.0.1:*"
DEMO_AUTH_SECRET="replace-with-a-long-random-secret"
UGA_INDEX_RUNTIME_MODE="production"
RESEND_API_KEY="set-in-vercel-or-local-env"
RESPONDENT_EMAIL_CRON_SECRET="replace-with-a-long-random-cron-secret"
CRON_SECRET="same-value-for-vercel-cron"
```

Spike example:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/index_platform?schema=public"
NEXT_PUBLIC_SITE_URL="https://spike-ua.cr0pto.com"
INDEX_TENANT="spike-ua"
NEXT_PUBLIC_INDEX_TENANT="spike-ua"
ALLOWED_EMBED_ORIGINS="https://spike-ua.cr0pto.com http://localhost:* http://127.0.0.1:*"
DEMO_AUTH_SECRET="replace-with-a-long-random-secret"
```

Environment notes:

- `NEXT_PUBLIC_SITE_URL` is used for absolute public URLs and embed code generation.
- `INDEX_TENANT` is used by server-side code, seed scripts and build-time logic.
- `NEXT_PUBLIC_INDEX_TENANT` is available to client/build-time code.
- `DATABASE_URL` enables Prisma-backed persistence and is required in production runtime.
- `ALLOWED_EMBED_ORIGINS` controls frame policy for `/embed/*`.
- `UGA_INDEX_RUNTIME_MODE=production` disables silent mock fallback when database reads fail.
- `DEMO_AUTH_SECRET` signs the preview session cookie.
- `RESEND_API_KEY` enables respondent survey email delivery through Resend. Do not commit the real key.
- `RESPONDENT_EMAIL_CRON_SECRET` / `CRON_SECRET` protect the scheduled email endpoint.
- `MN7R_API_URL` points to MN7R Monitor for protected daily BID/OFFER exports.
- `MN7R_INDEX_EXPORT_TOKEN` is sent as the Bearer token for MN7R Monitor export requests.
- `MN7R_INDEX_RESPONDENT_CODE` identifies the monitor import respondent, currently `MN7R_MONITOR`.
- `MN7R_IMPORT_CRON_SECRET` / `CRON_SECRET` protect the scheduled MN7R import endpoint.

## Routes

Public:

- `/`
- `/uk`, `/en`
- `/uk/about`, `/en/about`
- `/uk/methodology`, `/en/methodology`
- `/uk/analytics`, `/en/analytics`
- `/uk/subscription`, `/en/subscription`
- `/uk/privacy`, `/en/privacy`
- `/uk/terms`, `/en/terms`
- `/uk/risk-disclosure`, `/en/risk-disclosure`

Internal:

- `/login`
- `/logout`
- `/admin`
- `/admin/daily-inputs`
- `/admin/respondents`
- `/admin/calculate`
- `/admin/embed`
- `/respondent`
- `/member`

Embeds:

- `/embed/cards`
- `/embed/chart`
- `/embed/site`
- `/embed/uga-index.js`

Public API:

- `GET /api/health`
- `GET /api/cron/mn7r-monitor-prices`
- `GET /api/cron/respondent-emails`
- `GET /api/public/latest`
- `GET /api/public/history`
- `GET /api/public/fx-rates`

## Embedding on UGA Website

The project supports both compact widgets and a full-site iframe experience.

Full-site iframe example:

```html
<iframe
  src="https://index-uga.cr0pto.com/embed/site?locale=uk&theme=light&view=index"
  title="UGA Index"
  loading="lazy"
  style="width:100%;height:860px;border:0;"
  allowfullscreen
></iframe>
```

JS loader example:

```html
<div
  id="uga-index"
  data-locale="uk"
  data-theme="light"
  data-layout="site"
></div>
<script src="https://index-uga.cr0pto.com/embed/uga-index.js" async></script>
```

Full details:

```txt
docs/embed.md
```

## Login Preview

Preview users are tenant-aware. With `DATABASE_URL`, respondent users are read from the respondent directory/auth tables; without a database, local fallback users are used for development.

```txt
src/lib/demo-allowlist.ts
```

UGA credentials:

- Admin: `admin@uga.ua` / `admin`
- Respondent: `bunge@uga-index.demo` / `respondent`

Spike credentials:

- Admin: `admin@spike-ua.demo` / `admin`
- Respondent: `respondent-1@spike-ua.demo` / `respondent`

Short aliases work for the active tenant:

- `admin` / `admin`
- `respondent` / `respondent`

Production auth plan:

```txt
docs/auth.md
```

## Database Setup

Generate Prisma client:

```bash
npm run db:generate
```

For a local PostgreSQL database:

```bash
npx prisma db push
npm run db:seed
```

Seed the Spike tenant:

```bash
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run db:seed
```

Seed the Spike tenant for production without demo price history or the `admin`
temporary password:

```bash
UGA_INDEX_RUNTIME_MODE=production \
SEED_DEMO_HISTORY=0 \
SEED_DEMO_ADMIN_PASSWORD=0 \
INDEX_TENANT=spike-ua \
NEXT_PUBLIC_INDEX_TENANT=spike-ua \
npm run db:seed
```

Production-style migration flow after migrations are committed:

```bash
npx prisma migrate deploy
npm run db:seed
```

Current UGA production database:

- A Neon Postgres database has been provisioned for `index-uga.cr0pto.com`.
- `DATABASE_URL` is set in Vercel Production.
- `npx prisma migrate deploy` has been run successfully against the Neon database.
- `npm run db:seed` has been run successfully against the Neon database.
- Vercel has been redeployed with `UGA_INDEX_RUNTIME_MODE=production`.

Current Spike production database:

- Supabase project `spike-ua-index` has been provisioned in `ABV_Creative`.
- Project ref: `meupvomzqqxwpuworyhc`.
- Region: `eu-central-1`.
- Production still requires `DATABASE_URL` to be set in the Vercel
  `spike-ua-index` project before real MN7R imports, publication, admin invites
  and analytics persistence can work.

Do not commit the production connection string. Use Vercel Environment Variables or a local untracked `.env` file for operational commands.

The seed is tenant-aware:

- UGA seed creates CPT UA Black Sea basis, commodities, respondent directory contacts, login accounts, notification settings, respondent submissions, external benchmark indicatives and published index values.
- Spike seed creates CPT Odesa export and CPT parity Odesa processing positions, partner respondents and preview users. Demo submissions and published values are seeded only when `SEED_DEMO_HISTORY` is enabled. The demo `admin` temporary password is seeded only when `SEED_DEMO_ADMIN_PASSWORD` is enabled.

More detail:

```txt
docs/database.md
```

## Validation

Run before committing:

```bash
npm run lint
npm run test
npm run build
```

Optional browser smoke tests:

```bash
npx playwright install chromium
npm run test:e2e
```

Validate tenant builds explicitly:

```bash
INDEX_TENANT=uga-ua NEXT_PUBLIC_INDEX_TENANT=uga-ua npm run build
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run build
```

## Deployment

Recommended setup per tenant:

1. Create a separate Vercel project per tenant.
2. Set `INDEX_TENANT` and `NEXT_PUBLIC_INDEX_TENANT` per project.
3. Set `NEXT_PUBLIC_SITE_URL` to the tenant domain.
4. Use tenant-specific database/environment settings where data must be isolated.
5. Configure `ALLOWED_EMBED_ORIGINS` for tenant domains and trusted host sites.
6. Run Prisma setup against the target PostgreSQL database.
7. Run validation before deployment.
8. Configure the Vercel cron secret and Resend API key for respondent emails.

Respondent survey email delivery:

- Admins configure status, workdays, Kyiv send time, sender, reply-to admin email, subject, survey URL and template in `/admin/respondents`.
- Manual sending is available from the same page and ignores the schedule toggle.
- Scheduled sending is exposed at `/api/cron/respondent-emails`; `vercel.json` runs it once per weekday at 14:30 UTC. The server still checks the configured Kyiv send time and sends at most once per day.
- Replies go to the configured reply-to admin email.

Health check:

```bash
curl https://YOUR_DOMAIN/api/health
```

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

## Current TODO

- Replace preview auth with production auth, password setup emails and hashed credentials.
- Decide whether each tenant uses a separate database or a shared database with strict tenant scoping.
- Remove remaining development-only fallback stores from production deployments.
- Replace temporary password display in admin with one-time setup links before production launch.
- Replace seeded demo respondent email addresses with real recipients before triggering Resend delivery.
- Finalize production legal text with legal counsel.
- Finalize paid analytics/API subscription terms.
- Add production observability, backups and operational runbooks.
