# Index Platform

Index Platform is a multi-brand Next.js platform for publishing bilingual Ukrainian commodity market indices.

The repository is no longer a single UGA-only project. It contains the shared index engine, public website, internal workflows, embeds, API routes and database model used by multiple branded index instances.

Current tenants:

- `uga-ua` - UGA Index for the Ukrainian Grain Association.
- `spike-ua` - SPIKE Spot Commodity Index Ukraine for Spike Brokers.

The active tenant is selected by environment variables. The same codebase can therefore power domains such as `uga-ua.index.com`, `spike-ua.index.com` or temporary deployment domains like `spike-index.cr0pto.com`.

## Platform Model

Shared platform code:

- index calculation rules;
- public bilingual website structure;
- admin daily input workflow;
- respondent survey workflow;
- publication and audit workflow;
- public API routes;
- embeddable cards and chart widgets;
- Prisma/PostgreSQL data model;
- common UI components.

Tenant-specific configuration:

- brand name and legal owner;
- public domain;
- logo and visual theme;
- commodity list;
- delivery bases and baskets;
- respondent/partner pool;
- methodology PDF;
- contact details;
- feature flags, for example whether external indicatives are enabled.

Tenant configuration lives in:

```txt
src/lib/index-platform.ts
```

The active site config is exposed through:

```txt
src/lib/constants.ts
```

## Current Tenants

### UGA Index

Tenant id:

```bash
uga-ua
```

Scope:

- public UGA-branded spot export price index;
- FOB Black Sea basis;
- Ukrainian and English locales;
- respondent submissions;
- admin calculation and publication;
- Spike Brokers external indicative comparison enabled.

### SPIKE Spot Commodity Index Ukraine

Tenant id:

```bash
spike-ua
```

Scope:

- Spike Brokers branded spot commodity index;
- CPT Odesa export positions;
- CPT parity Odesa processing positions;
- Ukrainian and English locales;
- respondent/partner submissions;
- admin calculation and publication;
- no additional Spike Brokers external indicative, because Spike is the index publisher.

Current Spike public positions:

- Corn - CPT Odesa, Ukraine, export;
- Wheat 11.5% protein - CPT Odesa, Ukraine, export;
- Feed wheat - CPT Odesa, Ukraine, export;
- GMO soybean - CPT parity Odesa, Ukraine, processing, VAT included;
- Sunflower seed - CPT parity Odesa, Ukraine, processing, VAT included.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL-ready data model
- Vitest
- ESLint

## Local Setup

Install dependencies:

```bash
npm install
```

Start the default UGA tenant:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Start the Spike tenant:

```bash
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run dev
```

If you want another port:

```bash
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run dev -- --port 3100
```

## Environment

Typical variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/index_platform?schema=public"
NEXT_PUBLIC_SITE_URL="https://uga-ua.index.com"
INDEX_TENANT="uga-ua"
NEXT_PUBLIC_INDEX_TENANT="uga-ua"
ALLOWED_EMBED_ORIGINS="https://uga-ua.index.com https://spike-ua.index.com http://localhost:* http://127.0.0.1:*"
DEMO_AUTH_SECRET="replace-with-a-long-random-secret"
```

For Spike:

```bash
NEXT_PUBLIC_SITE_URL="https://spike-index.cr0pto.com"
INDEX_TENANT="spike-ua"
NEXT_PUBLIC_INDEX_TENANT="spike-ua"
```

Notes:

- `INDEX_TENANT` is used by server-side code, seed scripts and build-time logic.
- `NEXT_PUBLIC_INDEX_TENANT` is available to client/build-time code.
- `DATABASE_URL` is required for Prisma-backed persistence and seeding.
- `NEXT_PUBLIC_SITE_URL` is used for absolute public URLs and embed snippets.
- `ALLOWED_EMBED_ORIGINS` controls the frame allowlist for `/embed/*`.
- `DEMO_AUTH_SECRET` signs the simple demo session cookie.

## Routes

Public:

- `/`
- `/uk`, `/en`
- `/uk/about`, `/en/about`
- `/uk/methodology`, `/en/methodology`
- `/uk/analytics`, `/en/analytics`
- `/uk/privacy`, `/en/privacy`
- `/uk/terms`, `/en/terms`
- `/uk/risk-disclosure`, `/en/risk-disclosure`

Internal:

- `/login`
- `/logout`
- `/admin`
- `/admin/daily-inputs`
- `/admin/calculate`
- `/respondent`
- `/member`

Embeds:

- `/embed/cards`
- `/embed/chart`
- `/embed/uga-index.js`

Public API:

- `GET /api/health`
- `GET /api/public/latest`
- `GET /api/public/history`
- `GET /api/public/fx-rates`

## Demo Login

The demo uses an allowlist in:

```txt
src/lib/demo-allowlist.ts
```

Users do not select their role in the login form.

Primary credentials:

- Admin: `admin@uga.ua` / `admin`
- Respondent: `bunge@uga-index.demo` / `respondent`

Presentation shortcuts:

- `admin` / `admin`
- `respondent` / `respondent`

Post-login routing:

- Admin users go to `/admin/daily-inputs`.
- Respondent users go to `/respondent`.
- Member users go to `/member`.

Production auth is documented in:

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

For production-style migration flow after migrations are committed:

```bash
npx prisma migrate deploy
npm run db:seed
```

The seed is tenant-aware:

- UGA seed creates FOB Black Sea commodities, respondents, demo users, mock submissions, Spike external indicatives and published demo indices.
- Spike seed creates CPT Odesa export and CPT parity Odesa processing positions, partner respondents, demo users, mock submissions and published demo indices without Spike external indicatives.

More detail is in:

```txt
docs/database.md
```

## Index Calculation

The shared calculation engine is in:

```txt
src/lib/index-calculation.ts
```

Rules:

- collect respondent prices by date, commodity and delivery basis;
- calculate the median;
- exclude prices deviating more than +/-2% from the median;
- calculate the arithmetic average of the cleaned sample;
- require at least 5 included respondent prices for `publishable`;
- keep official published values in USD/t;
- support future weighted baskets while current demo baskets use weight `1`.

Unit tests:

```txt
src/lib/index-calculation.test.ts
src/lib/admin-calculate.test.ts
```

## Embeds

Use `NEXT_PUBLIC_SITE_URL` when preparing embed snippets.

Cards iframe example:

```html
<iframe
  src="https://uga-ua.index.com/embed/cards?locale=en&theme=light&layout=cards"
  title="Commodity Index"
  loading="lazy"
  style="width: 100%; height: 420px; border: 0; display: block;"
></iframe>
```

JavaScript loader example:

```html
<div id="commodity-index-widget"></div>
<script
  src="https://uga-ua.index.com/embed/uga-index.js"
  data-target="#commodity-index-widget"
  data-locale="en"
  data-theme="light"
  data-layout="cards"
></script>
```

More detail is in:

```txt
docs/embed.md
```

## Validation

Run before committing:

```bash
npm run lint
npm test
npm run build
```

Validate Spike build:

```bash
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run build
```

## Deployment

The project is prepared for Vercel deployment.

Recommended setup:

1. Create one deployment per tenant.
2. Set `INDEX_TENANT` and `NEXT_PUBLIC_INDEX_TENANT` per deployment.
3. Set `NEXT_PUBLIC_SITE_URL` to the tenant domain.
4. Use tenant-specific database/environment settings where data must be isolated.
5. Configure `ALLOWED_EMBED_ORIGINS` for the tenant domains and trusted host sites.
6. Run Prisma setup against the target PostgreSQL database.
7. Run validation before deployment.

Example domains:

- `uga-ua.index.com`
- `spike-ua.index.com`
- temporary Spike domain: `spike-index.cr0pto.com`

Health check:

```bash
curl https://YOUR_DOMAIN/api/health
```

More detail is in:

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

Source reference materials are stored under:

```txt
docs/source/
```

## Current TODO

- Finish tenant-specific copy for About, Methodology, Analytics and legal pages.
- Rename legacy UGA-specific embed loader route when a neutral public embed URL is agreed.
- Replace demo auth with production auth, password setup and hashed credentials.
- Decide whether each tenant uses a separate database or shared database with tenant scoping.
- Replace remaining mock fallback paths with durable database workflows where required.
- Finalize production legal text with legal counsel.
- Add production observability, backups and operational runbooks.
