# 1D3X Index Ecosystem Implementation Report - 2026-06-01

## Current Status

The repository has moved materially toward the target 1D3X ecosystem plan:

- npm workspace boundaries exist for platform/index apps and shared packages;
- 1D3X, UGA and Spike are separated by active tenant configuration;
- core market-data tables carry tenant/index product ownership;
- high-risk auth, survey, admin and notification findings from the Codex
  Security Deep Scan are remediated and follow-up validated;
- production validation commands pass locally;
- README and security notes are updated to reflect the current architecture and
  release gates.

This report records the latest implementation pass and the remaining gates that
still need external state or broader product decisions.

## Implemented In This Pass

### Repeatable Staging Migration Gate

The staging migration gate is now executable instead of only documented:

- `scripts/validate-staging-migrations.mjs` applies committed Prisma migrations
  to `STAGING_DATABASE_URL`;
- it can optionally restore `SOURCE_DATABASE_URL` into staging first when
  `RESET_STAGING_DATABASE=1`;
- it refuses to run against targets that do not look like staging/copy/local
  databases unless `ALLOW_NON_STAGING_TARGET=1` is explicitly set;
- it runs SQL integrity checks for tenant/index ownership across respondents,
  notification deliveries, survey tokens, price submissions, users, password
  setup tokens and basket links;
- `npm run db:validate-staging-migrations` exposes the gate as a package script.

### Auth Package Extraction

The workspace package migration now owns a concrete piece of auth/token logic
rather than only re-exporting root runtime modules:

- `packages/auth/src/respondent-survey-token.ts` contains respondent survey
  token generation and digesting;
- respondent email, Telegram and survey-access routes import survey token
  crypto through `@1d3x/auth`;
- `src/lib/respondent-survey-token.ts` remains as a compatibility re-export
  while callers migrate to workspace package imports.

### Index Engine Package Extraction

The core spot-index calculation algorithm now lives in the workspace engine
package:

- `packages/index-engine/src/index-calculation.ts` owns median calculation,
  outlier exclusion, minimum publishable respondent count and basket weighting;
- `packages/index-engine/src/index.ts` exports the calculation API from package
  code instead of re-exporting `src/lib`;
- `src/lib/index-calculation.ts` remains as a compatibility re-export so
  existing Next.js runtime modules can migrate incrementally;
- `npm run typecheck:packages` was added for repeatable package-boundary
  verification.

### Data Package Tenant Scope Extraction

The tenant context and tenant/index data-scope primitives now live in the
workspace data package:

- `packages/data/src/tenant-context.ts` owns `TenantContext`, runtime mode
  resolution and production-runtime detection;
- `packages/data/src/tenant-data-scope.ts` owns `getIndexTenantDataScope` and
  `tenantScopedWhere`;
- runtime modules import tenant context and tenant scope helpers from
  `@1d3x/data`;
- `src/lib/tenant-context.ts` and `src/lib/tenant-data-scope.ts` remain as
  compatibility re-exports for older local import paths;
- the tenant context and tenant scope unit tests now verify the package API
  directly.

### Setup-Link Onboarding Replaces Visible Temporary Password Delivery

The remaining visible temporary-password onboarding paths were converted to
one-time setup links:

- `src/app/api/internal/spike-setup/route.ts`
  - removed generated temporary-password delivery from email/Telegram helper
    flows;
  - creates password setup links through the shared setup-token flow;
  - sends setup links instead of plaintext passwords;
  - no longer exposes temporary passwords in the JSON response;
  - keeps the helper disabled in production runtime.

- `scripts/provision-spike-respondents.mjs`
  - no longer creates or prints respondent temporary passwords;
  - creates tenant/index-scoped respondent, user and auth rows;
  - rejects respondent/user collisions from another tenant/index;
  - issues digest-only password setup tokens and sends setup links when
    onboarding is enabled;
  - was updated to work with the tenant-required Prisma schema.

- Admin/respondent UI copy now refers to setup links instead of temporary
  passwords.

### Documentation Updated

- `docs/auth.md` now describes one-time setup-link onboarding.
- `docs/known-limitations.md` no longer lists visible temporary-password
  replacement as an open production gap.
- `docs/database.md`, `docs/product-brief.md` and
  `docs/implementation-plan.md` were aligned with setup-link terminology.

## Verification

Commands run successfully after the latest changes:

```bash
node --check scripts/provision-spike-respondents.mjs
node --check scripts/validate-staging-migrations.mjs
npm --workspace @1d3x/auth run typecheck
npm --workspace @1d3x/index-engine run typecheck
npm run typecheck:packages
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

Observed results:

- script syntax checks passed;
- ESLint passed with no warnings;
- Vitest: `21 passed`, `60 passed`;
- Next.js production build passed;
- production dependency audit: `found 0 vulnerabilities`.

Earlier in the same implementation cycle:

```bash
npx prisma generate
```

also completed successfully.

## Remaining Gates / Not Fully Closed

### Staging Migration Gate

The new composite tenant/index foreign keys must be tested against a copy of
historical data before production rollout.

Current blocker:

- local `.env.production.local` has an empty `DATABASE_URL`;
- `vercel env pull --environment=production` also returned an empty
  `DATABASE_URL`;
- no Vercel preview/development database URL is configured for `uga-index`.

What was verified:

- all 12 migrations apply cleanly on a fresh local PostgreSQL database when
  using an explicit local DB user;
- `npm run db:validate-staging-migrations` was smoke-tested on a fresh local
  PostgreSQL database and passed all migration and integrity checks;
- the new staging validation script is syntax-checked and wired into
  `package.json`.

What is still required:

- provide a real staging database URL, or a readable production database URL
  plus permission to dump/restore into a local staging copy;
- run `npm run db:validate-staging-migrations` against that copy;
- inspect any composite-FK failures and either fix historical rows or write a
  deliberate data-repair migration.

### Workspace Extraction Depth

Workspace packages exist and expose boundaries, but much of the concrete runtime
implementation still lives under `src/`. This is acceptable for the current
incremental migration, but the full target architecture still requires gradually
moving more implementation behind package APIs:

- calculation/publication internals into `packages/index-engine`;
- repository implementations into `packages/data`;
- auth/session/setup-token internals into `packages/auth`;
- provider adapters into `packages/integrations`;
- market-pack definitions into `packages/market-packs`.

### Remaining Product/Operations Work

The following are still product/operations gates rather than local code-only
tasks:

- final legal/methodology approval for regulated publication use;
- production backup/restore proof per database provider;
- production env/secret review and rotation;
- live provider monitoring/alert delivery outside the app;
- paid analytics/API entitlement enforcement if subscription access is launched.

## Bottom Line

The latest pass closes the remaining visible temporary-password onboarding gap
that was still present in helper/script flows. The codebase is safer and more
aligned with the original plan, but the overall production rollout remains gated
on staging migration validation against historical data and external operational
review.
