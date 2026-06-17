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
