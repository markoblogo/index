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
- expanded MediaHub manual-material URL safety checks to block localhost, single-label intranet hosts, private IPv4 ranges, link-local metadata IPs and private/link-local IPv6 targets before server-side fetching;
- moved MediaHub PDF extraction's `child_process`/filesystem dependencies behind lazy imports so cron/API route tracing no longer pulls the whole project into the Turbopack NFT list;
- wrapped public latest/history API routes with structured `503` responses and `Cache-Control: no-store` on data-loading failures, preventing generic uncaught 500s from being cached by edge/CDN layers;
- added a shared hashed in-memory request rate limiter and applied it to public contact and password-reset request endpoints, reducing email/workflow spam risk while avoiding storage of raw IP/email keys;
- added npm overrides for vulnerable transitive tooling packages:
  - `@prisma/dev@0.24.14`;
  - `esbuild@^0.28.1`;
  - `@hono/node-server@^1.19.13`;
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

- Turbopack emits an NFT tracing warning for `src/lib/media-hub-manual-materials.ts` because PDF preview extraction uses server-only filesystem and child-process operations (`pdftotext`/`pdftoppm`) in MediaHub ingestion routes. Build succeeds, but this path should be split so upload extraction helpers are isolated from cron/reporting hot paths.
- The remaining `postcss` audit item should be rechecked when a Next release vendors `postcss >= 8.5.10`; do not apply `npm audit fix --force` because it proposes a breaking downgrade.
- Production env verification still requires actual deployment secrets (`DATABASE_URL`, cron secrets, Telegram/Resend keys, etc.) and cannot be proven from a clean local shell.
