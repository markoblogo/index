# Repo Optimization Audit

## Current shape

The repository is a single multi-tenant Next.js platform that currently serves:

- `1d3x` corporate site;
- `UGA Index`;
- `SPIKE SPOT INDEX`;
- shared admin, respondent, embed, blog, analytics and media-hub surfaces;
- emerging `everyday-index` work in progress.

This is operationally one platform, but it already behaves like a small product portfolio.

## High-impact findings

### 1. Build and deploy coupling is too high

- One build currently includes public sites, admin, embeds, respondent flow, blog, media-hub and internal setup routes.
- Local untracked source files can affect deploys if not isolated.
- This already caused real deploy failures when `everyday-index` WIP entered production builds.

### 2. Static asset payload is oversized

`public/` is over 100 MB, with multiple files between ~10 MB and ~32 MB:

- large partner decks;
- respondent presentations;
- methodology/handbook PDFs;
- several multi-megabyte PNG blog images.

This increases upload/deploy time and hurts cache churn.

### 3. Core modules are too monolithic

The repo has several oversized hotspots:

- `src/lib/weekly-ai-report.ts`
- `src/lib/ai-market-brief.ts`
- `src/lib/respondent-directory.ts`
- `src/lib/i18n/index.ts`
- `src/lib/index-platform.ts`
- `src/app/[locale]/analytics/page.tsx`

These are now in the “slow to reason about, easy to regress” zone.

### 4. Shared/tenant boundaries are under-encoded

Tenant switching is mostly configuration-driven, which is good, but the current repo still mixes:

- shared platform code;
- tenant-specific content;
- tenant-specific operational rules;
- emerging experimental products.

The separation exists conceptually more than structurally.

### 5. Test coverage is selective, not systematic

There are useful tests around calculations and several workflows, but the biggest orchestration modules still concentrate too much behavior in single files.

## Recommended phased plan

### Pass 1. Operational guardrails and audit visibility

Goals:

- stop accidental dirty deploys;
- make repo health visible with one command;
- stabilize daily work before structural changes.

Actions:

- add deploy worktree guard;
- add repo audit script;
- keep `.vercelignore` aligned with isolated WIP.

### Pass 2. Asset and delivery optimization

Goals:

- reduce deploy payload;
- reduce static asset weight;
- improve cache behavior.

Actions:

- move oversized PDFs/decks to object storage or external file host;
- convert large PNG blog/brand assets to optimized WebP/AVIF where possible;
- keep only essential preview assets in `public/`.

### Pass 2a. Implemented now: tenant-aware deploy payload trimming

Implemented:

- `scripts/deploy-vercel-project.mjs`
- tenant-aware deploy profiles wired into:
  - `deploy:1d3x`
  - `deploy:uga`
  - `deploy:spike`

Current estimated skipped upload payload by project:

- `1d3x`: ~91.5 MB
- `uga-index`: ~68.5 MB
- `spike-ua-index`: ~5.2 MB

This does not yet reduce repository size on disk, but it immediately reduces
Vercel upload/deploy weight for tenant-specific production deployments without
changing runtime behavior for the active tenant.

### Pass 2b. Implemented now: externalized heavy tenant media

Implemented:

- external asset manifest fallback layer in `src/lib/tenant-assets.ts`
- heavy binary asset branch: `asset-cdn`
- release-backed EPUB delivery: `asset-binaries-v1`

Result:

- the largest SPIKE/UGA/1D3X PDFs and PNGs no longer live in `public/files`
- handbook EPUBs no longer live in the main deploy payload
- runtime keeps working through external fallback URLs even before any
  `ASSET_*_URL` env overrides are set

Current payload result after file removal:

- `public/`: ~20 MB
- `public/files`: ~272 KB

External delivery strategy now used:

- `raw.githubusercontent.com` for oversized deck PDFs
- `jsDelivr` for medium public PDFs and PNGs
- GitHub Release assets for handbook EPUB files

### Pass 3. Tenant boundary refactor

Goals:

- reduce mental load;
- isolate tenant-specific content and rules from shared engine code.

Actions:

- split tenant configuration into smaller modules:
  - brand/site config;
  - commodity/catalog config;
  - workflow/scheduling config;
  - content copy config.
- isolate `1d3x` landing concerns from index-runtime concerns.

### Pass 4. Large-module decomposition

Goals:

- reduce regression risk;
- make work parallelizable;
- improve testability.

Targets:

- `weekly-ai-report.ts`
- `ai-market-brief.ts`
- `respondent-directory.ts`
- `i18n/index.ts`
- `index-platform.ts`
- `analytics/page.tsx`

Approach:

- split by responsibility, not by arbitrary size:
  - prompts/builders/parsers/storage;
  - selectors/formatters/io;
  - tenant config vs render config.

### Pass 5. Runtime and data-path optimization

Goals:

- reduce unnecessary data work per request;
- improve route-level performance.

Actions:

- audit dynamic vs static route choices;
- introduce more explicit caching boundaries for public read paths;
- reduce repeated derivation in public analytics and homepage data builders;
- review DB access patterns and server-only dependencies in hot paths.

## Pass 1 implemented now

This pass adds:

- `scripts/audit-repo-health.mjs`
- `scripts/check-deploy-worktree.mjs`
- deploy-script integration in `package.json`

This does not solve the full structural problem, but it prevents repeat failure modes and creates a stable base for the next passes.

## 2026-07-03 reliability and dependency hardening pass

Scope covered in this pass:

- repository health audit via `npm run audit:repo`;
- unit/regression suite via `npm run test`;
- ESLint via `npm run lint`;
- production build via `npm run build`;
- dependency vulnerability review via `npm audit --audit-level=moderate`;
- targeted source scan for common risky patterns and accidentally committed secrets.

Implemented fixes:

- removed unused `xlsx` dependency; XLSX uploads are currently treated as metadata-only materials and no code imports SheetJS;
- changed cron/internal shared authorization to fail closed when no secret is configured; previously an empty secret list authorized the request, which made misconfigured cron endpoints unsafe;
- added unit coverage for cron/admin bearer-token authorization and centralized admin Bearer auth in the shared fail-closed helper;
- switched shared cron/admin/webhook secret comparison to timing-safe string comparison and made Telegram MediaHub/respondent webhooks fail closed when their webhook secret is missing;
- added baseline security headers across all routes (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) while keeping embed-specific CSP/frame rules separate;
- narrowed `next/image` remote host policy from arbitrary `http/https` hosts to known HTTPS asset domains plus explicit `NEXT_IMAGE_ALLOWED_HOSTS` overrides;
- expanded MediaHub manual-material URL safety checks to block localhost, single-label intranet hosts, private IPv4 ranges, link-local metadata IPs and private/link-local IPv6 targets before server-side fetching;
- moved MediaHub PDF extraction's `child_process`/filesystem dependencies behind lazy imports so cron/API route tracing no longer pulls the whole project into the Turbopack NFT list;
- wrapped public latest/history API routes with structured `503` responses and `Cache-Control: no-store` on data-loading failures, preventing generic uncaught 500s from being cached by edge/CDN layers;
- disabled public AI market-brief auto-repair by default so public GET traffic cannot trigger OpenAI spend unless `SPIKE_AI_BRIEF_PUBLIC_AUTO_REPAIR=1` is explicitly enabled;
- added a shared hashed in-memory request rate limiter and applied it to public contact and password-reset request endpoints, reducing email/workflow spam risk while avoiding storage of raw IP/email keys;
- extended the same hashed request limiter to password reset completion and password setup POST endpoints to reduce token/password brute-force attempts;
- added an abort timeout to the legacy Last30Days JSON MediaHub source so one slow external JSON endpoint cannot stall report-source collection;
- added a shared external fetch timeout helper and applied it to OpenAI report/brief generation, AI Telegram delivery and Resend contact delivery calls;
- extended the shared external fetch timeout to Resend respondent schedule, respondent onboarding, password reset and Spike admin invite emails;
- extended the shared external fetch timeout to Telegram delivery paths for SSI auto-publish fallback, respondent survey/confirmation messages, MediaHub report publishing and Telegram target smoke tests;
- extended the shared external fetch timeout to MediaHub Telegram webhook API calls, including `getFile`, file download, bot status/setup calls and access-denied/submission replies;
- extended the shared external fetch timeout to weekly AI report OpenAI cover/text generation and weekly Telegram `sendPhoto`/`sendMessage` delivery calls;
- extended the shared external fetch timeout to the internal Spike setup onboarding email and Telegram re-onboarding delivery calls;
- extended the shared external fetch timeout to SSI WhatsApp MediaHub webhook delivery calls;
- extended the shared external fetch timeout to MediaHub manual-material OpenAI visual summarization calls;
- extended the shared external fetch timeout to UGA demo-mode sync reads from the public SPIKE API;
- extended the shared external fetch timeout to Telegram channel HTML source collection used by report-source collector jobs;
- added a shared grammY-based Telegram connector for MediaHub/index Telegram work, including `message`/`channel_post` normalization, media/link/caption/forward extraction, `telegram:{chat_id}:{message_id}` idempotency keys, read/post policy checks and outbound `sendMessage`/`sendPhoto`/`sendDocument`/`copyMessage`/`forwardMessage` helpers;
- split MediaHub PDF/Poppler extraction into a lazy `media-hub-pdf-extraction` module so scheduler/reporting imports of manual materials no longer carry `child_process`, temporary filesystem and Poppler preview code unless a PDF is actually ingested;
- added npm overrides for vulnerable transitive tooling packages:
  - `@prisma/dev@0.24.14`;
  - `esbuild@^0.28.1`;
  - `@hono/node-server@^1.19.13`;
- expanded the production environment checker into a project-aware preflight for `1d3x`, `spike-ua-index` and `uga-index`, including critical cron/webhook/WhatsApp/tenant-mode validation without printing secret values;
- extended the production environment checker with Telegram connector safety checks: warning on unrestricted MediaHub Telegram ingestion and failure when manual autopost approval is disabled without explicit post target allowlist;
- upgraded `next` and `eslint-config-next` to `16.2.10`;
- migrated ESLint config from `FlatCompat` to the native Next flat-config exports;
- fixed Next 16 route-wrapper compatibility by making alias cron routes export `dynamic = "force-dynamic"` directly instead of re-exporting route segment config;
- fixed React compiler lint findings:
  - theme toggles now initialize from DOM state lazily instead of setting state synchronously in mount effects;
  - currency toggle initializes from local storage lazily;
  - MediaHub distribution chart precomputes donut slices without mutating render-local cursor state;
- removed unused `dedupeKey` helper from MediaHub RSS ingestion.

Verification status after the pass:

- `npm run test`: 24 test files, 132 tests passed;
- `npm run lint`: passed;
- `npm run build`: passed on Next `16.2.10`;
- `npm audit --audit-level=moderate`: only the upstream Next bundled `postcss@8.4.31` advisory remains. The app also has top-level `postcss@8.5.16`, but Next currently vendors its own copy under `node_modules/next/node_modules/postcss`. The documented `npm audit fix --force` path would downgrade Next and is not acceptable.

Residual risks and follow-up:

- PDF preview extraction still depends on host Poppler utilities (`pdftotext`/`pdftoppm`) when previews are enabled. The dependency is now isolated behind lazy PDF ingestion, but production hosts without Poppler will still fall back to byte-level text extraction/no previews.
- The remaining `postcss` audit item should be rechecked when a Next release vendors `postcss >= 8.5.10`; do not apply `npm audit fix --force` because it proposes a breaking downgrade.
- Production env verification still requires actual deployment secrets (`DATABASE_URL`, cron secrets, Telegram/Resend keys, etc.) and cannot be proven from a clean local shell.
