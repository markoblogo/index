# Everyday Index Implementation Plan

## Current Status

This document describes the current Everyday Index scaffold already present in the repo. It is not a full product plan for all future features. It records what exists now, what is intentionally unsupported, and the safest phased path forward.

Brand:

- Everyday Index

Domain target:

- `day.1d3x.com`

Current language scope:

- English only

Current UX rule:

- country-first view at `/`

Current publication rule:

- no fake production values
- unsupported sources must stay explicit
- no admin panel
- no manual data entry

Intended publication policy text in scaffold:

- `Checked daily. Published weekly or when verified source data changes.`

Current preview status text:

- `Manual preview publish. Intended policy: Checked daily. Published weekly or when verified source data changes.`

## Existing Repo Architecture

This repo is one Next.js App Router codebase serving multiple site modes:

- `1d3x`: corporate platform landing site
- `uga-ua`: UGA Index
- `spike-ua`: SPIKE SPOT INDEX

Relevant architecture seams:

- root route behavior: `src/app/page.tsx`
- root metadata and theme wiring: `src/app/layout.tsx`
- site/tenant resolution: `src/lib/platform-site.ts`
- UGA/SPIKE tenant config: `src/lib/index-platform.ts`
- public APIs: `src/app/api/public/*`
- shared business logic: `src/lib/*`
- persistence: `prisma/schema.prisma`

UGA and SPIKE already have substantial respondent/admin/publication workflows. Everyday Index should stay isolated from those flows.

## Tenant / Site Architecture

### Existing mode selection

The repo is currently env-selected, not host-aware.

Current runtime selection uses:

- `INDEX_TENANT`
- `NEXT_PUBLIC_INDEX_TENANT`

That means the current Everyday Index scaffold is enabled by environment selection, not by inspecting the incoming hostname at runtime.

### Current Everyday mode

`src/lib/platform-site.ts` now recognizes:

- `platform`
- `everyday-index`
- `index`

The new Everyday mode is triggered when the requested tenant matches one of:

- `day`
- `day-1d3x`
- `everyday-index`

This is a minimal extension of the existing env-driven site split. It is not yet a host-aware `day.1d3x.com` resolver.

## How The Current Everyday Index Mode Works

### Root route behavior

`src/app/page.tsx` now has three behaviors:

- if platform mode: render the 1d3x corporate landing page
- if everyday-index mode: render the Everyday Index dashboard directly at `/`
- otherwise: preserve the existing locale redirect behavior for UGA/SPIKE

This keeps the existing UGA and SPIKE locale-based public experience intact when the tenant is not set to Everyday Index.

### Root layout behavior

`src/app/layout.tsx` now adds:

- Everyday-specific metadata title/description
- Everyday-specific `metadataBase` fallback of `https://day.1d3x.com`
- `data-index="day"` on the body when Everyday mode is active
- forced light theme behavior for the Everyday mode

No locale shell, admin shell, or respondent shell was added for Everyday Index.

## Current Everyday Routes And Components

### Public page route

- `/`

When the env-selected site mode is Everyday Index, `/` renders the new country-first dashboard.

### Public API route

- `GET /api/public/everyday-index`

This route returns:

- `data`
- `architecture`
- `generatedAt`

### UI component

- `src/components/everyday-index/dashboard.tsx`

Current dashboard contents:

- hero section
- country selector
- Burger card
- Latte empty state card
- iPhone empty state card
- rebased-to-100 chart shell
- rankings section
- methodology section
- disclaimer footer

Important limitation:

- there is no separate iPhone Workdays card yet; that concept exists in data types and chart/ranking scaffolding, not as a dedicated visible card

## Current Public API Endpoint

Current route:

- `src/app/api/public/everyday-index/route.ts`

Current behavior:

- reads optional `country` query param
- reads edge/request geolocation headers:
  - `x-vercel-ip-country`
  - `cf-ipcountry`
  - `cloudfront-viewer-country`
  - `x-country`
  - `x-country-code`
- calls `getEverydayIndexDashboard`
- returns cacheable JSON with the same cache policy as the existing public APIs

Important safeguards in the current response shape:

- unsupported products are returned as unsupported
- unsupported overlay series are returned with empty arrays
- USA/New York burger reference is not returned as available
- the route does not claim Latte, iPhone, iPhone workdays, WTI, Brent, or Gold are live

## Current `src/lib/everyday-index` Module Structure

Current files:

- `src/lib/everyday-index/types.ts`
- `src/lib/everyday-index/config.ts`
- `src/lib/everyday-index/validation.ts`
- `src/lib/everyday-index/big-mac-adapter.ts`
- `src/lib/everyday-index/adapters.ts`
- `src/lib/everyday-index/dashboard.ts`
- `src/lib/everyday-index/dashboard.test.ts`

Responsibilities:

- `types.ts`: scaffold types for consumer indices, adapters, dashboard state, rankings, chart modes
- `config.ts`: product locks, supported countries, update policy text, safe country fallback map, source registry
- `validation.ts`: validation and quarantine gates
- `big-mac-adapter.ts`: current real burger source adapter
- `adapters.ts`: registry plus unsupported-source stubs
- `dashboard.ts`: country selection, card assembly, rankings, chart data shaping
- `dashboard.test.ts`: scaffold behavior tests

## Current Big Mac Adapter Behavior

Current adapter:

- `economistBigMacAdapter` in `src/lib/everyday-index/big-mac-adapter.ts`

Current source:

- The Economist structured Big Mac CSV dataset from the public GitHub repository

What it does now:

1. fetches the CSV via `fetch`
2. hashes the raw payload
3. parses rows by country ISO3
4. returns the latest row for the requested country
5. marks the observation as `verified` when a row exists
6. marks the observation as `unavailable` when the country is missing

What it does not do:

- it does not fetch or infer a New York, NY retail price
- it does not publish a US/New York reference
- it does not claim to be a direct retail McDonald’s New York source

Current user-facing implication:

- burger values can be shown for non-US covered countries from the structured dataset
- burger index vs USA/New York remains withheld
- US burger state remains explicit unsupported/unavailable pending a real NYC-specific source

## Burger-only ingestion and publish pipeline

This repo now includes a burger-only persistence and publish pass for Everyday Index.

Current service:

- `src/lib/everyday-index/burger-publish.ts`

Current responsibilities:

1. fetch the Economist structured Big Mac dataset through the existing adapter or accept a CSV override for tests
2. compute and persist a source snapshot/content hash
3. normalize burger rows
4. validate normalized burger observations
5. persist parsed observations
6. publish verified burger values
7. leave previous published values in place when a new observation fails validation
8. revalidate the Everyday root page and public Everyday API path after a successful import

Current manual entrypoint:

- `npm run everyday:import:burger`

This uses:

- `scripts/import-everyday-big-mac.ts`

Current protected operator entrypoint:

- `POST /api/internal/everyday-index/import-burger`

This route:

- accepts `POST` only
- requires `Authorization: Bearer <EVERYDAY_INDEX_INGEST_SECRET>`
- triggers only the existing burger import/publish service
- does not accept manual price values
- does not trigger Latte, iPhone, workdays, or overlays
- does not publish USA/New York reference values

No public ingestion endpoint and no cron entry were added in this pass.

### What gets persisted

The current burger import persists into the existing consumer-index schema slice:

- `ConsumerIndexDefinition`
  - burger index definition
- `ConsumerProductLock`
  - Big Mac product lock
- `ConsumerSourceDefinition`
  - Economist dataset source definition
- `ConsumerCountry`
  - country rows for parsed burger countries
- `ConsumerRawSnapshot`
  - source URL
  - content type
  - snapshot/content hash
  - fetched timestamp
  - metadata
- `ConsumerParsedObservation`
  - country
  - effective/source date
  - local price
  - USD price
  - currency
  - parser version
  - validation status
  - source status
  - source metadata
- `ConsumerPublishedValue`
  - published burger values by country and date
  - local price
  - USD price
  - source status
  - source attribution metadata
  - note that New York reference remains unavailable
- `EverydayIngestionRun`
  - run key
  - trigger
  - status
  - snapshot hash
  - parser version
  - parsed/validated/published/rejected counts
  - dataset date metadata

### Idempotency

The burger import is designed to be idempotent for the same source dataset:

- it reuses an existing `ConsumerRawSnapshot` when the same source/hash pair already exists
- it updates an existing parsed observation for the same source/snapshot/country/date instead of creating a duplicate
- it upserts published burger values by:
  - index definition
  - country
  - published date
- rerunning the same dataset does not duplicate published burger values

### Public read path

The Everyday dashboard/API read path is now persistence-first for burger:

- persisted burger published values are used when available
- if no burger published values exist in the database, burger returns an explicit unavailable state
- unsupported products and overlays remain unsupported
- the public API still does not trigger ingestion as a side effect

### Economist dataset vs New York reference

The Economist Big Mac dataset may contain source-defined comparisons against a US dataset row.

That is not the same as the requested:

- USA / New York, NY consumer retail burger reference

Current rule:

- source-defined dataset comparisons may be stored as source metadata
- they may be surfaced only as source-defined dataset comparisons
- they must not be labeled as New York
- the UI field for `Index vs USA / New York` stays unavailable/pending until a real New York retail source exists

## What remains unavailable after the burger persistence pass

Still intentionally unsupported:

- Latte
- iPhone
- iPhone workdays
- Brent
- WTI
- Gold
- cron publishing
- admin/manual data entry

Still intentionally unavailable:

- USA/New York burger reference
- any New York-labeled burger comparison

## Current Validation Gates

Current validation lives in:

- `src/lib/everyday-index/validation.ts`

Current gates:

- currency must match expected source currency when configured
- parsed product variant must match the configured product lock
- iPhone observations reject trade-in, subsidy, installment, carrier, and `"from"` style pricing markers
- latte observations reject delivery-platform style pricing markers
- suspicious jumps are quarantined:
  - burger/latte: above 30%
  - iPhone/iPhone workdays: above 20%
- low/none confidence is rejected

Current state note:

- the validator is broader than the currently live product surface
- only the burger adapter is actually publishing real data right now

## Current Prisma Schema Additions

Current schema additions are in `prisma/schema.prisma`.

New enums:

- `ConsumerSourceStatus`
- `ConsumerValidationStatus`

New models:

- `ConsumerIndexDefinition`
- `ConsumerProductLock`
- `ConsumerCountry`
- `ConsumerSourceDefinition`
- `ConsumerRawSnapshot`
- `ConsumerParsedObservation`
- `ConsumerFxRate`
- `ConsumerWageObservation`
- `ConsumerPublishedValue`
- `MarketOverlaySeries`
- `EverydayIngestionRun`

Intent:

- keep consumer-index persistence separate from the agricultural commodity/respondent schema
- avoid forcing Everyday Index into UGA/SPIKE submission/publication tables

## Database and migration policy

### What the repo currently appears to use

The repo appears to use a hybrid Prisma workflow:

- local development docs still mention `npx prisma db push`
- production-oriented docs say to use committed migrations with `npx prisma migrate deploy`
- committed SQL migration folders already exist in `prisma/migrations/`

Based on the repo evidence, the intended long-term policy is:

- committed Prisma migrations for production
- Prisma schema as the source model definition
- `db push` only as a legacy/local-development shortcut, not as the preferred production workflow

### Whether migrations are committed

Yes. The repo commits migration SQL files under `prisma/migrations/`.

Current committed migration directories include:

- `20260522113000_production_foundation`
- `20260525170000_price_submission_metadata`
- `20260526190000_respondent_telegram_contacts`
- `20260603162000_ai_market_briefs`
- `20260608190000_add_telegram_request_collection_mode`
- `20260608194500_add_password_reset_tokens`
- `20260612100000_everyday_index_scaffold`

That is strong evidence that the repo expects committed migrations to stay in version control.

### Whether `migration_lock.toml` is expected

Yes.

For a standard Prisma Migrate workflow, `prisma/migrations/migration_lock.toml` is expected alongside the migration directory and should match the datasource provider.

This repo’s datasource provider is:

- `postgresql`

The file was missing before this iteration, which is why the migration history was only partially standardized even though committed SQL migrations already existed.

### What was changed in this iteration

To normalize the Prisma migration policy without broadening product scope:

1. added `prisma/migrations/migration_lock.toml`
   - provider set to `postgresql`
2. kept the existing Everyday migration at:
   - `prisma/migrations/20260612100000_everyday_index_scaffold/migration.sql`
3. verified the Everyday migration SQL covers the already-added schema slice:
   - enums
   - tables
   - indexes
   - foreign keys
4. updated `prisma.config.ts` to accept optional:
   - `SHADOW_DATABASE_URL`

This does not change Everyday product behavior. It only makes the repo more compatible with standard Prisma migration tooling when a suitable local environment is available.

### Whether the Everyday migration SQL needed changes

No schema-model changes were needed in this iteration.

The existing Everyday migration SQL appears complete for the already-added consumer-index schema slice:

- `ConsumerSourceStatus`
- `ConsumerValidationStatus`
- consumer-index tables
- indexes
- foreign keys

No second migration was created.

### How future Everyday Index schema changes should be made

Future Everyday schema changes should follow the production-oriented Prisma Migrate path, not ad hoc `db push` alone.

Recommended future flow:

1. edit `prisma/schema.prisma`
2. keep changes scoped to the intended schema slice
3. create or update a committed migration for that schema change
4. keep `migration_lock.toml` committed and aligned with the datasource provider
5. validate the migration against the schema before submission
6. run app-level verification after Prisma changes

For Everyday Index specifically:

- keep the consumer-index schema separate from UGA/SPIKE respondent/publication tables
- do not add fake seed publication data
- do not mix consumer-index persistence into admin/manual-entry workflows

### Commands to run before submitting future Prisma changes

Minimum checks:

```bash
npx prisma format
npx prisma validate
npx vitest run src/lib/everyday-index/dashboard.test.ts src/app/api/public/everyday-index/route.test.ts
npm run build
```

When working on migration authoring or migration/history validation, also provide:

- `DATABASE_URL`
- `SHADOW_DATABASE_URL`

Then use non-destructive migration tooling such as:

```bash
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
npx prisma migrate status
```

### Remaining caveats

There are still a few repo-level caveats:

1. local docs still mention `db push`, so the workflow is not fully unified yet
2. `prisma migrate status` requires a reachable database
3. `prisma migrate diff --from-migrations ...` requires `SHADOW_DATABASE_URL` in the local environment
4. this iteration normalized the missing lock-file/config pieces, but it did not rewrite the repo’s earlier migration history
5. `npx tsc --noEmit` remains a weak signal in this repo when `.next/types` is stale; `npm run build` is the reliable gate

## What Is Intentionally Unsupported Right Now

The following are intentionally not live in the current scaffold:

- Latte
- iPhone
- iPhone workdays
- Brent
- WTI
- Gold
- cron publishing
- admin/manual data entry

More specifically:

- Latte uses an unsupported scaffold source definition only
- iPhone uses an unsupported scaffold source definition only
- iPhone workdays uses an unsupported scaffold source definition only
- WTI/Brent/Gold are explicit disabled overlay adapter stubs
- no cron route was added for Everyday Index
- no admin route was added for Everyday Index
- no respondent/manual-entry route was added for Everyday Index

## Consistency Review Notes

### Existing 1d3x / UGA / SPIKE behavior

The intended preservation point is:

- platform mode still renders the 1d3x landing page
- non-Everyday index mode still uses the previous locale redirect path

No new admin/manual-entry surface was added for Everyday Index.

### Fake production data

Current scaffold avoids fake production values by:

- using the Economist structured dataset only for burger
- rendering unsupported states for other products/series
- not publishing a US/New York burger reference from the Economist data

### Empty and unsupported states

Current scaffold is explicit:

- Latte card: unsupported/scaffolded
- iPhone card: unsupported/scaffolded
- chart overlay series: unsupported for non-burger series
- US burger reference: unavailable/pending NYC-specific source

## Risks And Open Decisions

1. Runtime selection is still env-driven.
   - `day.1d3x.com` is the intended domain, but the app is not yet host-aware.

2. The current burger source is not the required US/New York reference source.
   - the scaffold correctly withholds NYC-based comparisons, but a real source decision is still required.

3. Prisma workflow is now more standardized, but still hybrid in the docs.
   - production docs prefer committed migrations
   - local docs still mention `db push`
   - migration validation commands require real `DATABASE_URL` and `SHADOW_DATABASE_URL`

4. The current dashboard is intentionally narrow.
   - only burger has real source wiring
   - Latte, iPhone, iPhone workdays, and overlays remain explicit placeholders

5. The current page is mounted at `/`.
   - that is correct for the env-selected Everyday deployment
   - if future host-aware routing is introduced, this seam should be revisited instead of creating parallel routes

6. Preview deployment is currently safer than public launch, but still manual.
   - burger import requires a real `DATABASE_URL`
   - no Everyday cron exists in `vercel.json`
   - preview copy must not imply automated daily checks are already live

## Deployment Readiness For `day.1d3x.com`

### Recommended preview strategy

Preferred option for this repo right now:

- Option A: separate Vercel project for `day.1d3x.com`

Why Option A is safer in the current codebase:

- the repo already deploys separate Vercel projects per tenant/domain
- tenant resolution is env-driven, not host-aware
- no routing refactor is needed before preview
- existing `1d3x`, `uga-index`, and `spike-ua-index` deployments remain isolated

Preview env values for the Everyday deployment:

```bash
INDEX_TENANT=day
NEXT_PUBLIC_INDEX_TENANT=day
NEXT_PUBLIC_SITE_URL=https://day.1d3x.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/index_platform?schema=public
```

Optional but recommended for migration authoring and validation in local/dev environments:

```bash
SHADOW_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/index_platform_shadow?schema=public
```

### Option comparison

Option A: separate Vercel project with env-selected tenant

- matches current repo deployment conventions
- keeps rollout blast radius small
- does not require host parsing or middleware changes
- is the recommended choice for the first preview deployment

Option B: host-aware tenant resolution in the shared app

- would reduce env coupling long-term
- would require routing/runtime review across `1d3x`, UGA, and SPIKE
- is not needed for the first preview
- should be handled as a later dedicated routing-hardening pass

### Required environment variables

Required for preview deployment:

- `INDEX_TENANT=day`
- `NEXT_PUBLIC_INDEX_TENANT=day`
- `NEXT_PUBLIC_SITE_URL=https://day.1d3x.com`
- `DATABASE_URL=...`
- `EVERYDAY_INDEX_INGEST_SECRET=...`

Environment variables that remain irrelevant for this preview pass:

- no Everyday cron secret is needed because no Everyday cron route exists
- no manual admin/data-entry env vars are needed because no such flow exists

### First preview deployment commands

From a clean environment linked to the intended Vercel project:

```bash
npx prisma format
npx prisma validate
npx prisma migrate deploy
npm run everyday:import:burger
INDEX_TENANT=day NEXT_PUBLIC_INDEX_TENANT=day NEXT_PUBLIC_SITE_URL=https://day.1d3x.com npm run build
```

Then deploy the separately linked Vercel project:

```bash
cat .vercel/project.json
vercel link --yes --project <day-vercel-project> --scope abvcreative
vercel --prod
```

If you want the same local guard used by other tenants, verify the linked project first:

```bash
node scripts/verify-vercel-project.mjs --project <day-vercel-project>
```

No `deploy:day` script was added in this iteration because the actual Vercel project name is not yet part of the repo contract.

### Protected operator import endpoint

Current internal route:

- `POST /api/internal/everyday-index/import-burger`

Required header:

```http
Authorization: Bearer <EVERYDAY_INDEX_INGEST_SECRET>
```

Example trigger:

```bash
curl -X POST https://day.1d3x.com/api/internal/everyday-index/import-burger \
  -H "Authorization: Bearer $EVERYDAY_INDEX_INGEST_SECRET"
```

Expected use:

- trusted operator trigger against the deployed Everyday environment
- server-side execution with Vercel-provided `DATABASE_URL`
- burger-only import and publish of the existing Economist dataset flow

Not supported by this route:

- manual price submission
- Latte ingestion
- iPhone ingestion
- iPhone workdays ingestion
- WTI, Brent, or Gold overlays
- cron scheduling

Difference between current operator choices:

- `npm run everyday:import:burger`
  - runs locally or from an operator shell where `DATABASE_URL` is already available
  - still the safest fallback when Vercel runtime limits or transient network issues are a concern
- `POST /api/internal/everyday-index/import-burger`
  - runs inside the deployed Everyday environment
  - avoids exposing `DATABASE_URL` on the operator machine
  - still requires a trusted bearer secret
- future cron
  - not implemented yet
  - should only be added after burger operator flow is stable and operationally verified

Runtime caveat:

- the burger import fetches one remote CSV, parses it, writes snapshots/observations/published rows, and revalidates the Everyday page and API
- this is reasonably small for a protected on-demand serverless run, but it still depends on remote dataset latency and database latency
- if preview operations show serverless timeout risk, keep the route available as a convenience trigger but prefer `npm run everyday:import:burger` as the production fallback until a more durable automation path is introduced

### Preview verification checklist

Verify the public API:

```bash
curl -s "https://day.1d3x.com/api/public/everyday-index?country=DE"
```

Confirm in the JSON response:

- `data.cards` contains a real burger card only where persisted data exists
- `data.cards` keeps latte and iPhone as `unsupported`
- `data.chartSeries` keeps `iphone_workdays`, `wti_oil`, `brent_oil`, and `gold` as `unsupported`
- `data.updatePolicy` says the preview is manual and does not imply automation is live

Verify the operator endpoint:

- missing `EVERYDAY_INDEX_INGEST_SECRET` fails closed
- wrong bearer token returns `401`
- valid bearer token returns burger-only counts and a run status
- response does not mention Latte, iPhone, overlays, or New York retail reference availability

Verify the dashboard at `https://day.1d3x.com/`:

- the page renders Everyday Index directly at `/`
- the top status box says `Preview status`, not `Update policy`
- unsupported cards remain explicit and visible
- no admin/manual-entry controls appear

Verify unsupported states explicitly:

- Latte remains unavailable and scaffold-only
- iPhone remains unavailable and scaffold-only
- iPhone workdays remains unavailable
- Brent, WTI, and Gold remain unsupported in the chart coverage section

Verify the US/New York rule:

- select `United States`
- burger remains unavailable / pending New York reference
- no API or UI label claims the Economist US row is a New York retail reference
- no USA/New York index comparison is published

Verify existing deployments are unaffected:

- `1d3x.com` still renders the corporate landing page
- `index.uga.ua` remains on the UGA runtime
- `spike.1d3x.com` remains on the SPIKE runtime
- `vercel.json` contains no Everyday cron schedule

### Rollback notes

If the preview deploy is wrong or mapped to the wrong project:

1. stop and check `.vercel/project.json`
2. relink to the correct Vercel project
3. redeploy the previous stable commit for that project
4. if the issue is Everyday-only data quality, avoid publishing new source values and rerun no imports until the data issue is understood

Because Everyday preview is env-selected, rollback is operationally simple:

- remove or correct `INDEX_TENANT`
- remove or correct `NEXT_PUBLIC_INDEX_TENANT`
- restore the previous deployment on the dedicated Everyday Vercel project

### Caveats before public launch

This preview is not yet ready for a broader public launch because:

1. tenant selection is still env-driven rather than host-aware
2. burger import is still a manual runbook step
   - the protected operator endpoint exists, but cron still does not
3. the US/New York burger reference is still missing
4. latte, iPhone, iPhone workdays, Brent, WTI, and Gold are still unsupported
5. no Everyday cron or queued automation path exists yet

## Phased Checklist From Here

### Phase 0: stabilize current scaffold

- [x] add env-selected Everyday site mode
- [x] add root Everyday page scaffold
- [x] add public Everyday API route
- [x] add burger-only structured dataset adapter
- [x] keep unsupported states explicit
- [x] keep NYC reference unavailable until real source exists
- [x] add separate consumer-index schema slice
- [x] add focused scaffold tests
- [x] add implementation documentation

### Phase 1: persistence and migration hygiene

- [x] restore `migration_lock.toml` for Prisma Migrate metadata
- [x] document current migration policy and caveats
- [ ] unify repo docs around migration-first workflow vs legacy `db push`
- [ ] seed or ingest only real consumer-index reference metadata, not fake published values
- [ ] decide whether burger observations should be runtime-fetched only or persisted

### Phase 2: burger productionization

- [x] add burger-only persistence/publish flow from the Economist structured dataset
- [ ] add a real US/New York burger reference source
- [ ] publish burger index vs USA only after NYC source validation exists
- [ ] decide whether to keep burger import script-only or add a protected future automation entrypoint

### Phase 3: routing hardening

- [ ] decide whether site selection remains env-based or becomes host-aware for `day.1d3x.com`
- [ ] document Vercel project/domain mapping for the Everyday deployment
- [x] document the separate-project preview deployment strategy for `day.1d3x.com`

### Phase 4: later product expansion

- [ ] official Latte source automation
- [ ] verified iPhone retail source automation
- [ ] verified wage/tax automation for iPhone workdays
- [ ] legally safe market overlay sources
- [ ] cron ingestion/publishing only after real-source validation is ready

## Safest Next Coding Step

The safest next step after this pass is a burger-only hardening step, not a broader product feature:

- add a protected burger publish/import entrypoint or documented operator runbook refinement without enabling cron yet
- keep the import scoped to the existing Economist dataset plus persisted publish flow
- then focus specifically on the real New York burger reference problem

No Latte, iPhone, overlay, cron, admin, or manual-entry scope should be added before that.
