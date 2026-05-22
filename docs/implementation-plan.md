# UGA Index Implementation Plan

## Current Architecture

UGA Index is a Next.js App Router application with TypeScript, Tailwind CSS, Prisma and PostgreSQL. The UGA tenant is production-priority; the Spike tenant remains a reusable configuration.

Core routes:

- Public: `/uk`, `/en`, `/[locale]/about`, `/[locale]/methodology`, `/[locale]/analytics`, `/[locale]/subscription`, legal pages.
- Internal: `/login`, `/admin/daily-inputs`, `/admin/respondents`, `/admin/calculate`, `/admin/embed`, `/respondent`.
- Embed: `/embed/cards`, `/embed/chart`, `/embed/site`, `/embed/uga-index.js`.
- API: `/api/health`, `/api/public/latest`, `/api/public/history`, `/api/public/fx-rates`.

## Data Model

Prisma models cover:

- commodities, delivery bases and baskets;
- respondent companies, contacts, login accounts and email schedule;
- users and role-based access;
- respondent/admin price submissions;
- external benchmark indicatives;
- calculations and calculation items;
- locked published indices with optional benchmark blend metadata;
- audit log events.

Production runtime requires `DATABASE_URL`. Local development may use mock fallback when `UGA_INDEX_RUNTIME_MODE` is not `production`.

## Operational Flow

1. Admin manages respondent directory, contacts, login emails, temporary password state and collection mode.
2. Respondent signs in and saves draft or submits daily CPT UA Black Sea prices.
3. Admin reviews same-day inputs and benchmark references in the daily matrix.
4. Historical published dates are read-only. Same-day values can be corrected until the end of the Kyiv trade date.
5. Publish UGA Index calculates all commodities, optionally applies explicit benchmark blend per commodity, and publishes all eligible values in one locked batch.
6. Public pages and APIs read latest published values and active respondent counts from the database.

## Acceptance Criteria

- `npm run lint`, `npm run test` and `npm run build` pass.
- Public UGA pages use current basis terminology and no stale partner attribution.
- Respondent count on public cards/API reflects active respondent records.
- Admin and respondent routes require a valid session.
- Published historical dates are locked.
- Benchmark values are references unless an admin explicitly enables benchmark blend before publication.
- Embed routes can be safely framed by allowed UGA origins.
