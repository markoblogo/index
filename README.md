# Index Platform

![1d3x logo](public/brand/1d3x-logo.webp)

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
| `uga-ua` | UGA Index | [index.uga.ua](https://index.uga.ua) | Production-style deployment |
| `spike-ua` | SPIKE SPOT INDEX | [spike.1d3x.com](https://spike.1d3x.com) | Production-style deployment, active development |

This is not a mixed "UGA plus Spike" app. It is a multi-brand index platform
where UGA and Spike are two clients running on the same calculation,
publication, respondent and analytics foundation.

SPIKE publishes public benchmark snapshots for Ukrainian grain and oilseed spot
conditions to keep pricing visibility consistent across partner and operator updates.

The Spike public pages now publish daily reference snapshots for selected CPT and
FCA spot benchmarks from supported respondents.

For agent-facing public positioning, partnership language, evidence surfaces, and claim boundaries, read [`docs/product-context.md`](docs/product-context.md) before marketing, analytics, SEO, or recurring review work.

UGA Index is also available on the 1d3x mirror domain
[uga.1d3x.com](https://uga.1d3x.com). This mirror stays active and must not
redirect to the UGA-owned domain. Legacy `cr0pto.com` domains are configured as
permanent redirects:

- [index-uga.cr0pto.com](https://index-uga.cr0pto.com) redirects to
  [index.uga.ua](https://index.uga.ua) once the UGA DNS cutover is complete;
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
- Context pages for daily, weekly and monthly market-news context on 1D3X and
  SPIKE;
- Context browser extraction policy that prefers Obscura for DOM/text/assets
  extraction and keeps Playwright/Chromium for e2e, screenshots and fallback;
- Vercel cron endpoints for scheduled imports, notifications and publication.

## 1D3X Cortex

<img src="public/brand/1d3x-cortex.png" alt="1D3X Cortex" width="2140">

`1D3X Cortex` is the cross-product AI layer for this ecosystem:

- Collects and curates evidence from Index, Spike, MN7R, MediaHub and related
  product workflows.
- Unifies raw/derived data, publications, files, code changes and manuals into
  append-only evidence packs with source/version metadata.
- Runs OpenAI handoff through governed packet contracts and does not change
  existing production delivery in default mode.
- Keeps risky decisions and quality gates in shadow-first workflows: governances,
  integrity checks, artifact evaluation and promotion readiness.
- Stores operationally constrained runtime contracts in docs:
  [`docs/commodity-intelligence-layer.md`](docs/commodity-intelligence-layer.md),
  [`docs/cortex-evidence-synthesis-contract.md`](docs/cortex-evidence-synthesis-contract.md).
- Uses an optional local skill-quality pipeline for Cortex/operator protocols:
  [`docs/skill-quality-pipeline.md`](docs/skill-quality-pipeline.md).

UGA-specific features:

- UGA Index brand and content;
- 4 public commodities: corn, wheat 11.5% protein, feed wheat, GMO soybean;
- UGA Black Sea export basis language;
- UGA embed package for the association website;
- email-oriented respondent workflow and UGA member-area/product positioning;
- Neon PostgreSQL production database.

Spike-specific features:

- SPIKE SPOT INDEX brand and visual system;
- Weekly public market-commentary snapshots now track changes in local grain and oilseed spot context alongside benchmark values;
- 13 public positions grouped into `Grains Export`, `Oilseeds Export`, and
  `Oilseeds Crush`;
- Grains Export: corn CPT Port, corn FCA Chop, wheat 11.5% CPT Port, feed wheat
  CPT Port;
- Oilseeds Crush: sunflower, GMO soybean, non-GMO rapeseed;
- Oilseeds Export: GMO soybean CPT Port/FCA Chop, non-GMO soybean CPT
  Port/FCA Chop, non-GMO rapeseed CPT Port/FCA Chop;
- CPT Port / CPT parity Odesa / FCA Chop export, processing and border basis
  language with category switching on the public Spike homepage;
- MN7R Monitor import as an automatic respondent;
- Telegram-first respondent workflow through `@spike_spot_bot`;
- admin and respondent password onboarding with temporary credentials;
- auto-publication if no manual publish happens before the evening cut-off;
- SSI Context: unified Ukrainian/English source pool, Ukrainian and English
  public localizations, and Ukrainian Telegram distribution;
- public blog with mixed-language posts and language filtering;
- SSI public manual at `/uk/manual` and `/en/manual`, plus admin manual at
  `/admin/manual`;
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
- UGA domain: `https://index.uga.ua`;
- UGA 1d3x mirror domain: `https://uga.1d3x.com`;
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
- respondent Telegram notifications: `/api/cron/respondent-telegram`
  (`16:00` Kyiv initial request, `17:00` Kyiv reminder for SSI);
- auto-publish: `/api/cron/spike-auto-publish`;
- admin invite/onboarding helper: `/api/cron/spike-admin-invites`.

SSI manual maintenance rule:

- update `src/lib/ssi-manual-content.ts` whenever SSI functionality, naming,
  UI, schedules, publication logic, respondent workflow, Context behavior or
  admin operations change;
- update contextual help blocks in the same commit when the affected screen has
  a manual/help entry;
- public user/respondent behavior belongs in the public manual, operator
  behavior belongs in the admin manual.

Scheduled UGA processes:

- respondent Telegram notifications: `/api/cron/respondent-telegram`;
- respondent email notifications remain available as a backup channel:
  `/api/cron/respondent-emails`;
- temporary Spike-to-UGA demo sync exists at `/api/cron/uga-spike-demo-sync`, but
  is disabled by default and must stay disabled for real UGA respondent testing.

Current `vercel.json` cron schedule:

```json
[
  { "path": "/api/cron/respondent-emails", "schedule": "30 14 * * 1-5" },
  { "path": "/api/cron/respondent-telegram", "schedule": "0 13 * * 1-5" },
  { "path": "/api/cron/mn7r-monitor-prices", "schedule": "0 14 * * 1-5" },
  { "path": "/api/cron/mn7r-monitor-prices", "schedule": "0 15 * * 1-5" },
  { "path": "/api/cron/spike-auto-publish", "schedule": "0 16 * * 1-5" },
  { "path": "/api/cron/spike-auto-publish", "schedule": "0 17 * * 1-5" },
  { "path": "/api/cron/uga-spike-demo-sync", "schedule": "30 16 * * 1-5" }
]
```

Times are UTC in Vercel. The application code applies Kyiv-time business rules
where needed, so MN7R import and Spike auto-publish are intentionally scheduled
in both DST-adjacent UTC slots and then filtered again by Kyiv local hour in the
route logic.

UGA Spike fallback status:

- UGA production should not copy or fall back to Spike Spot Index values.
- `UGA_SPIKE_DEMO_SYNC_ENABLED` must be `disabled` unless a temporary demo sync
  is explicitly requested again.
- UGA daily inputs and public values are now expected to come from admin-entered
  values, respondent submissions, and UGA publication workflow only.

Telegram respondent UX:

- weekday request around 16:00 Kyiv;
- reminders around 17:00 and 18:00 Kyiv when no submission exists;
- secure WebApp/survey token opens the daily form;
- respondent sees a success summary and can return to edit the submission;
- UGA uses `@uga_index_bot`; Spike uses `@spike_spot_bot`;
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
src/lib/commodity-intelligence-layer.ts  1D3X Cortex registry/context contract
src/lib/cortex-source-scanner.ts  1D3X Cortex local source-manifest scanner
src/lib/commodity-intelligence-ledger.ts  1D3X Cortex context-pack audit ledger
src/lib/cortex-ecosystem-evidence.ts  append-only cross-product evidence ledger
src/lib/media-hub-llm-report.ts  OpenAI report path with Cortex context pack
src/lib/media-hub-publication-scheduler.ts  Context report persistence with Cortex audit snapshot
src/app/api/internal/cortex/context-packs/route.ts  internal Cortex ledger read API
src/app/api/internal/cortex/ecosystem-evidence/route.ts  internal ecosystem evidence API
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
NEXT_PUBLIC_SITE_URL="https://index.uga.ua"
INDEX_TENANT="uga-ua"
NEXT_PUBLIC_INDEX_TENANT="uga-ua"
ALLOWED_EMBED_ORIGINS="https://uga.ua https://www.uga.ua https://index.uga.ua https://1d3x.com https://www.1d3x.com https://uga.1d3x.com https://index-uga.cr0pto.com"
RESEND_API_KEY="set-in-vercel"
RESPONDENT_EMAIL_CRON_SECRET="set-in-vercel"
RESPONDENT_TELEGRAM_CRON_SECRET="set-in-vercel"
TELEGRAM_CONFIRMATION_CRON_SECRET="set-in-vercel"
UGA_TELEGRAM_BOT_TOKEN="set-in-vercel"
UGA_TELEGRAM_ADMIN_CHAT_ID="set-in-vercel"
UGA_SPIKE_PUBLIC_API_BASE="https://spike.1d3x.com"
UGA_SPIKE_DEMO_SYNC_ENABLED="disabled"
UGA_SPIKE_DEMO_SYNC_CRON_SECRET="set-in-vercel"
```

UGA admin provisioning:

```bash
UGA_ADMIN_EMAIL="admin@example.ua" \
UGA_ADMIN_NAME="Імʼя Прізвище" \
UGA_ADMIN_TEMPORARY_PASSWORD="temporary-password" \
npm run provision:uga-admin
```

The provisioned admin signs in with the temporary password and is redirected to
`/setup-password` to set a permanent password.

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
SPIKE_DAILY_CATCHUP_SECRET="set-in-vercel"
SPIKE_ADMIN_INVITE_SECRET="set-in-vercel"
SPIKE_ADMIN_INVITE_SENDER="set-in-vercel"
SPIKE_ADMIN_INVITE_REPLY_TO="set-in-vercel"
SPIKE_RESPONDENT_ONBOARDING_SENDER="set-in-vercel-or-fallback-to-admin-invite-sender"
SPIKE_RESPONDENT_ONBOARDING_REPLY_TO="set-in-vercel-or-fallback-to-admin-invite-reply-to"
SPIKE_TELEGRAM_BOT_TOKEN="set-in-vercel"
MEDIA_HUB_TELEGRAM_BOT_TOKEN="optional-dedicated-media-hub-bot-token"
MEDIA_HUB_TELEGRAM_WEBHOOK_URL="https://spike.1d3x.com/api/telegram/media-hub"
ID3X_TELEGRAM_BOT_TOKEN="optional-1d3x-media-hub-bot-token"
TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET="optional-media-hub-telegram-webhook-secret"
MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_USER_IDS="optional-space-separated-user-ids"
MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_CHAT_IDS="optional-space-separated-chat-ids"
MEDIA_HUB_CORPORATE_TELEGRAM_PEER_ID="1865902381"
MEDIA_HUB_CORPORATE_TELEGRAM_CHAT_ID="-1001865902381"
MEDIA_HUB_MANUAL_MATERIAL_MAX_MB="20"
SPIKE_TELEGRAM_SMOKE_CHAT_ID="optional-smoke-chat-id"
RESPONDENT_TELEGRAM_CRON_SECRET="set-in-vercel"
SPIKE_RESPONDENT_TELEGRAM_INITIAL_HOUR="17"
SPIKE_RESPONDENT_TELEGRAM_REMINDER_HOURS="18,19"
OPENAI_API_KEY="set-in-vercel-for-media-hub-and-internal-ai-briefs"
MEDIA_HUB_SCHEDULE_TIMEZONE="Europe/Kyiv"
MEDIA_HUB_DAILY_REPORT_TIME="20:00"
MEDIA_HUB_WEEKLY_REPORT_TIME="15:00"
MEDIA_HUB_TELEGRAM_CHAT_ID="optional-shared-media-hub-chat-id"
SPIKE_AI_BRIEF_MODEL="gpt-4.1-mini"
SPIKE_AI_BRIEF_CRON_SECRET="set-in-vercel-if-ai-api-post-is-used"
SPIKE_AI_TELEGRAM_CHAT_ID="optional-admin-telegram-chat-id"
SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID="optional-spike-media-hub-chat-id"
ID3X_MEDIA_HUB_TELEGRAM_CHAT_ID="optional-1d3x-media-hub-chat-id"
SPIKE_AI_INPUT_USD_PER_1M="0.4"
SPIKE_AI_OUTPUT_USD_PER_1M="1.6"
```

Context manual material intake is documented in
[`docs/media-hub-manual-materials.md`](docs/media-hub-manual-materials.md).
Browser-runtime policy for future Context source extraction lives in
[`docs/media-hub-browser-runtime.md`](docs/media-hub-browser-runtime.md).
Optional SERP/search discovery policy lives in
[`docs/media-hub-search-discovery.md`](docs/media-hub-search-discovery.md).
Shared Index/Context terminology lives in
[`docs/media-hub-domain-model.md`](docs/media-hub-domain-model.md), and
risk-sensitive workflow changes should be checked against
[`docs/media-hub-review-checklist.md`](docs/media-hub-review-checklist.md).
Use `@idex_grains_bot` for links/files that should be added to SSI or 1D3X
reports; the respondent bot is not used for this workflow. These materials are
part of the 1D3X Cortex evidence layer: Cortex assembles the bounded report
context pack first, OpenAI API drafts the SSI/1D3X report from that approved
context, and Index stores the Cortex snapshot for audit in the report artifact
and `CortexContextPackLedger`.
Cortex is also scoped to raw and calculated ecosystem data, not only finished
reports: Context raw monitored items, SSI respondent/admin/imported inputs,
SSI calculation ledgers, MN7R broker/operator inputs and cross-product
correlation signals are protected Cortex sources. They can be analyzed inside
Cortex, but external model prompts receive only redacted, approved context.
The first SSI DB slice is active through `src/lib/cortex-index-db-evidence.ts`,
which exports redacted `PriceSubmission` and calculation-ledger evidence into
Context report context assembly.
Context RSS/runtime snapshots also carry raw monitoring metadata for Cortex:
source URL, relevance score and accepted/fallback processing state.
`src/lib/media-hub-monitoring-ledger.ts` persists accepted, discarded and
unsafe-rejected monitoring candidates for protected Cortex audit.
Internal agents and related ecosystem products can read saved Cortex context
packs through `GET /api/internal/cortex/context-packs` with
`CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET`; use `includePack=1` only for
authorized internal context assembly.
They can read the shared source registry, freshness and bounded operational
events through `GET /api/internal/cortex/ecosystem-evidence`. The existing
`POST /api/internal/cortex/context-pack` builder merges eligible ecosystem
events with artifact-backed retrieval before an assistant or external model
receives context; protected events remain excluded unless an approved caller
sets `allowProtected`.
For the repeatable local artifact flow across Index, MN7R and Cr0pto, use
[`docs/cortex-artifact-pipeline.md`](docs/cortex-artifact-pipeline.md).
Run `npm run cortex:source-scan` to write `.cortex/source-manifest.json`, the
first local ingestion artifact for repo/docs/manuals/code/plans coverage. Add
other local ecosystem roots with arguments such as
`-- --root=mn7r:mn7r-monitor:/Volumes/Work/Work/MN7R:protected`.
For the local agro-commodity workspace, `npm run cortex:source-scan -- --preset=ecosystem-local --out=.cortex/ecosystem-source-manifest.json`
scans Index, MN7R and Cr0pto when those roots exist. Override paths with
`CORTEX_INDEX_ROOT`, `CORTEX_MN7R_ROOT` and `CORTEX_CROPTO_ROOT`.
Run `npm run cortex:source-ingest` to write both
`.cortex/ecosystem-source-manifest.json` and `.cortex/source-ledger.json`; the
ledger compares the previous manifest with the new scan and queues added or
changed sources for the next chunking/RAG stage.
Run `npm run cortex:source-chunk -- --all` for the first full local chunk
manifest, or `npm run cortex:source-chunk` after ingest to process only queued
changes into `.cortex/chunk-manifest.json`.
Run `npm run cortex:artifact-publish -- --manifest=.cortex/chunk-manifest.runtime.json`
with `CORTEX_ARTIFACT_UPLOAD_URL` and `CORTEX_ARTIFACT_UPLOAD_TOKEN` to promote
a validated runtime artifact to controlled storage; configure its read URL as
`CORTEX_CHUNK_MANIFEST_URL`.
Run `npm run cortex:mn7r-snapshot-chunk -- --snapshot=.cortex/mn7r-source-snapshot.json --base=.cortex/chunk-manifest.json --out=.cortex/chunk-manifest.with-mn7r.json`
after MN7R exports its protected source snapshot. This converts raw
broker/operator/user inputs, business/lifecycle traces and bid/offer
correlation signals into protected Cortex chunks and can merge them with the
base Index/MN7R/Cr0pto memory artifact.
Run `npm run cortex:cropto-source-chunk -- --manifest=.cortex/cropto-source-manifest.json --base=.cortex/chunk-manifest.json --out=.cortex/chunk-manifest.with-cropto.json`
after Cr0pto exports its source manifest. This normalizes approved Cr0pto docs,
public surfaces, code, runbooks and plans into the standard Cortex chunk
pipeline.
Run `npm run cortex:memory-search -- --query="SSI report context"` to search
local Cortex chunks with owner, kind and visibility filters before a vector
store is introduced.
Run `npm run cortex:context-pack -- --query="SSI report context" --purpose=market-report`
to turn matching memory chunks into a bounded context pack for an internal
assistant or an external model call. Add `--allow-protected` only for approved
internal workflows.
Internal products can request the same pack over
`POST /api/internal/cortex/context-pack` with `CORTEX_INTERNAL_API_SECRET` or
`CRON_SECRET`; the server reads the chunk manifest from
`CORTEX_CHUNK_MANIFEST_URL`, `CORTEX_CHUNK_MANIFEST_PATH`, or the default
`.cortex/chunk-manifest.json`, in that order. Use
`CORTEX_CHUNK_MANIFEST_BEARER_TOKEN` when the hosted artifact needs a bearer
token. The endpoint never accepts a client-provided manifest path or URL.
Corporate Context sources are also documented there, including MN7R Blog,
Spike Spot Index Blog, 1D3X Blog, MN7R Bluesky and the corporate Telegram group
peer/chat-id handling.

Do not commit production secrets, connection strings or bot tokens. Use Vercel
Environment Variables or an untracked local `.env` file for operational
commands.

## Context

Context is the shared news/context layer for `1d3x` and `spike-ua`.
It is separate from index analytics:

- analytics pages explain published index values, history, volatility and
  spreads;
- Context monitors market news, Telegram channels, API/search providers, RSS
  feeds and editor-submitted links/files;
- uploaded PDFs/images/files are decomposed into `MediaHubManualMaterialAsset`
  rows: original material, extracted text, preview image slots and visual
  summaries for report grounding/admin review;
- daily reports are published on business days;
- weekly reports replace daily reports on weekly publication days;
- monthly reports replace weekly reports on monthly publication days;
- reports are persisted in `MediaHubReport` and rendered on public Context
  pages;
- Telegram publication uses the same persisted report text, with SSI keeping
  the deterministic index table before the Context report.

1D3X Context covers global grains, oilseeds, vegetable oils, crop-weather,
trade-policy and ag-logistics signals in English. SSI Context uses a unified
Ukrainian/English source pool for Ukraine-focused market context and renders
localized reports on the Ukrainian and English Spike sites. Empty source-backed
sections are omitted instead of publishing placeholder text.

Operational pieces:

- public pages: `/media-hub` for 1D3X and `/{uk,en}/media-hub` for Spike;
- admin shell: `/admin/media-hub`, `/admin/media-hub/materials`,
  `/admin/media-hub/sources`;
- monitoring cron: `/api/cron/media-hub-monitoring`;
- publishing cron: `/api/cron/media-hub-publish`;
- manual/Telegram intake: `/api/telegram/media-hub`;
- forced smoke endpoint: `/api/admin/media-hub/smoke-test`;
- docs: [`docs/media-hub-manual-materials.md`](docs/media-hub-manual-materials.md).

`AiMarketBrief` remains an internal SPIKE index-data helper for admin/index-card
context, but the public market-news product is Context.

Context and Index workflow changes should name the affected state explicitly:
`collect`, `normalize`, `generate`, `validate`, `publish-site` or
`send-channel`. Site publication and external channel delivery are separate
approval-sensitive actions; keep them separable in code, docs, endpoints and
tests.

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
- Spike seed creates Spike commodities, CPT Odesa/CPT parity Odesa/FCA Chop
  bases, all three Spike index categories, MN7R Monitor, Spike respondent
  directory entries and auth accounts.
  Demo history is controlled by `SEED_DEMO_HISTORY`.

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
- `POST /api/admin/spike-daily-catchup`
- `GET /api/cron/uga-spike-demo-sync`
- `GET /api/cron/spike-admin-invites`

Manual catch-up endpoints:

```bash
curl -X POST 'https://spike.1d3x.com/api/admin/spike-daily-catchup?force=1&date=2026-06-25' \
  -H 'Authorization: Bearer <SPIKE_DAILY_CATCHUP_SECRET>'

curl -X POST 'https://spike.1d3x.com/api/admin/spike-daily-catchup?force=1&date=2026-06-25&mediaHub=1' \
  -H 'Authorization: Bearer <SPIKE_DAILY_CATCHUP_SECRET>'
```

## Embedding

The platform supports compact widgets and full-site iframe embeds.

UGA full-site iframe example:

```html
<iframe
  src="https://index.uga.ua/embed/site?locale=uk&theme=light&view=index"
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
<script src="https://index.uga.ua/embed/uga-index.js" async></script>
```

For UGA integrations, prefer `https://index.uga.ua` once DNS is configured.
The `https://uga.1d3x.com` mirror remains available in parallel and should not
redirect. Legacy `cr0pto.com` embed URLs remain available through redirects for
compatibility.

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

Local runner note:

```bash
# one-time in a clean checkout
npm ci

# run test suite through local tooling
npm exec -- vitest run

# run TypeScript typecheck through local tsconfig
npm exec -- tsc --noEmit -p tsconfig.json
```

If you still see `vitest/config`/`vite` resolver issues, it usually means
`node_modules` was not installed in that session.

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
- `docs/uga-domain-cutover.md`
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
