# Index Platform

Index Platform is a multi-brand Next.js platform for bilingual Ukrainian commodity market indices.

The repository is organized as a shared index platform, not as a single UGA-only website. UGA Index and SPIKE Spot Commodity Index Ukraine are two tenant instances built on the same calculation engine, internal workflows, API routes, database model and deployment pattern.

## Live Demo Deployments

The project is currently deployed in two working demo versions and remains under active refinement:

- UGA Index: https://index-uga.cr0pto.com
- SPIKE Spot Commodity Index Ukraine: https://spike-ua.cr0pto.com

Both deployments are Vercel projects connected to this repository. The same codebase is built with tenant-specific environment variables.

## Tenants

### `uga-ua`

UGA Index for the Ukrainian Grain Association.

- Public bilingual website in Ukrainian and English.
- FOB Black Sea export index workflow.
- Respondent submissions and admin daily input matrix.
- Admin calculation and publication workflow.
- Spike Brokers external indicative comparison is enabled.
- Public analytics, methodology, legal pages, embeds and API routes.

### `spike-ua`

SPIKE Spot Commodity Index Ukraine for Spike Brokers.

- Public bilingual website in Ukrainian and English.
- CPT Odesa export positions and CPT parity Odesa processing positions.
- Partner respondent submissions and admin daily input matrix.
- No separate Spike indicative comparison in daily input, because Spike is the index publisher.
- Separate Spike visual style for the public site, login and internal pages.
- Public analytics, methodology, legal pages, embeds and API routes.

Current Spike public positions:

- Corn - CPT Odesa, Ukraine, export.
- Wheat 11.5% protein - CPT Odesa, Ukraine, export.
- Feed wheat - CPT Odesa, Ukraine, export.
- GMO soybean - CPT parity Odesa, Ukraine, processing, VAT included.
- Sunflower seed - CPT parity Odesa, Ukraine, processing, VAT included.

## Recent Platform Updates

- Reorganized the codebase into a tenant-based index platform.
- Added the `spike-ua` tenant with Spike-specific branding, content, logo, favicon and deployment config.
- Added Spike commodity positions and partner respondent pool.
- Adapted About, Methodology, Analytics and legal copy for Spike.
- Added separate Spike public homepage design with animated commodity cards and currency switching.
- Added Spike-styled login, admin and respondent screens.
- Updated demo auth to use tenant-specific allowlists and credentials.
- Changed admin daily input matrix for both tenants: respondents are now vertical rows, commodities are horizontal columns.
- Removed Spike/Diff/Deviation comparison and high-deviation warning cells from Spike daily input.
- Kept Spike external indicative comparison in the UGA admin workflow.
- Added deployed temporary demo domains for UGA and Spike.

## Architecture

Shared platform code includes:

- index calculation rules;
- public bilingual site structure;
- tenant-aware branding and copy;
- admin daily input workflow;
- respondent survey workflow;
- calculation and publication workflow;
- demo authentication;
- public API routes;
- embeddable cards and chart widgets;
- Prisma/PostgreSQL data model;
- shared UI components.

Tenant-specific configuration includes:

- brand name and legal owner;
- public domain;
- logo, favicon and visual theme;
- commodity list;
- delivery bases and baskets;
- respondent or partner pool;
- methodology PDF;
- contact details;
- feature flags such as external indicative comparison.

Main tenant config:

```txt
src/lib/index-platform.ts
```

Runtime site config:

```txt
src/lib/constants.ts
```

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL-ready data model
- Vitest
- ESLint
- Vercel

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
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run dev -- --port 3100
```

## Environment

Typical UGA environment:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/index_platform?schema=public"
NEXT_PUBLIC_SITE_URL="https://index-uga.cr0pto.com"
INDEX_TENANT="uga-ua"
NEXT_PUBLIC_INDEX_TENANT="uga-ua"
ALLOWED_EMBED_ORIGINS="https://index-uga.cr0pto.com https://spike-ua.cr0pto.com http://localhost:* http://127.0.0.1:*"
DEMO_AUTH_SECRET="replace-with-a-long-random-secret"
```

Typical Spike environment:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/index_platform?schema=public"
NEXT_PUBLIC_SITE_URL="https://spike-ua.cr0pto.com"
INDEX_TENANT="spike-ua"
NEXT_PUBLIC_INDEX_TENANT="spike-ua"
ALLOWED_EMBED_ORIGINS="https://index-uga.cr0pto.com https://spike-ua.cr0pto.com http://localhost:* http://127.0.0.1:*"
DEMO_AUTH_SECRET="replace-with-a-long-random-secret"
```

Notes:

- `INDEX_TENANT` is used by server-side code, seed scripts and build-time logic.
- `NEXT_PUBLIC_INDEX_TENANT` is available to client/build-time code.
- `DATABASE_URL` enables Prisma-backed persistence and seeding.
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

Demo users are tenant-aware and live in:

```txt
src/lib/demo-allowlist.ts
```

UGA demo credentials:

- Admin: `admin@uga.ua` / `admin`
- Respondent: `bunge@uga-index.demo` / `respondent`

Spike demo credentials:

- Admin: `admin@spike-ua.demo` / `admin`
- Respondent: `respondent-1@spike-ua.demo` / `respondent`

Short aliases work for the active tenant:

- `admin` / `admin`
- `respondent` / `respondent`

Post-login routing:

- Admin users go to `/admin/daily-inputs`.
- Respondent users go to `/respondent`.
- Member users go to `/member`.

Production auth notes are documented in:

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

Production-style migration flow after migrations are committed:

```bash
npx prisma migrate deploy
npm run db:seed
```

The seed is tenant-aware:

- UGA seed creates FOB Black Sea commodities, respondents, demo users, mock submissions, Spike external indicatives and published demo indices.
- Spike seed creates CPT Odesa export and CPT parity Odesa processing positions, partner respondents, demo users, mock submissions and published demo indices without Spike external indicatives.

More detail:

```txt
docs/database.md
```

## Index Calculation

Shared calculation engine:

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

## Validation

Run before committing:

```bash
npm run lint
npm run test
npm run build
```

Validate Spike build:

```bash
INDEX_TENANT=spike-ua NEXT_PUBLIC_INDEX_TENANT=spike-ua npm run build
```

Validate UGA build explicitly:

```bash
INDEX_TENANT=uga-ua NEXT_PUBLIC_INDEX_TENANT=uga-ua npm run build
```

## Deployment

The repository currently backs two Vercel projects:

- UGA production demo: https://index-uga.cr0pto.com
- Spike production demo: https://spike-ua.cr0pto.com

Recommended setup per tenant:

1. Create a separate Vercel project per tenant.
2. Set `INDEX_TENANT` and `NEXT_PUBLIC_INDEX_TENANT` per project.
3. Set `NEXT_PUBLIC_SITE_URL` to the tenant domain.
4. Use tenant-specific database/environment settings where data must be isolated.
5. Configure `ALLOWED_EMBED_ORIGINS` for tenant domains and trusted host sites.
6. Run Prisma setup against the target PostgreSQL database.
7. Run validation before deployment.

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

Source reference materials are stored under:

```txt
docs/source/
```

## Current TODO

- Replace demo auth with production auth, password setup and hashed credentials.
- Decide whether each tenant uses a separate database or a shared database with tenant scoping.
- Replace remaining mock fallback paths with durable database workflows where required.
- Rename legacy UGA-specific embed loader route when a neutral public embed URL is agreed.
- Finalize production legal text with legal counsel.
- Add production observability, backups and operational runbooks.
