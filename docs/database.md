# UGA Index Database Model

UGA Index uses Prisma with PostgreSQL. The schema is production-oriented for public index publication, respondent operations, authentication allowlists, benchmark references, locked publications and audit logs.

## Setup

Create `.env.local` or export `DATABASE_URL` before running Prisma commands:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Local development:

```bash
npm run db:generate
npx prisma db push
npm run db:seed
```

Production deployment should use committed migrations:

```bash
npx prisma migrate deploy
npm run db:seed
```

Set `UGA_INDEX_RUNTIME_MODE=production` in production. In that mode, database-backed pages and APIs do not silently fall back to local mock data.

## Core Concepts

- `Commodity`: indexed products with Ukrainian and English names.
- `DeliveryBasis`: delivery basis records. UGA currently seeds `CPT UA Black Sea`; public methodology references `CPT Black Sea Panamax Ports (POC)`.
- `Respondent`: respondent companies with status and collection mode.
- `RespondentContact`: multiple contact people per respondent, including phone, email and primary contact flag.
- `RespondentAuthAccount`: login email, temporary password state, password setup status and password generation timestamps.
- `RespondentEmailSchedule`: daily workday survey email settings, reply-to admin email, subject and editable template.
- `RespondentEmailDelivery`: delivery log for scheduled and manual respondent survey emails.
- `Basket` and `BasketRespondent`: active respondent baskets and future weighting support.
- `User`: admin/respondent/member users used by internal workflows.
- `PriceSubmission`: respondent or admin-entered USD per metric ton prices by trade date.
- `ExternalIndicative`: external benchmark reference values.
- `IndexCalculation` and `IndexCalculationItem`: median, included/excluded items, counts, raw value, public rounded value and version.
- `PublishedIndex`: locked published index values, including optional benchmark blend metadata.
- `AuditLog`: append-only audit trail with `beforeJson` and `afterJson`.

## Dates And Values

Trade dates use PostgreSQL `date` columns through Prisma `DateTime @db.Date`. Submission, publication, password and audit events use timestamps.

All official market values are stored as USD per metric ton:

- submissions: `Decimal(12, 2)`;
- calculation precision: `Decimal(12, 4)`;
- public published values: `Decimal(12, 1)`.

UAH/t and EUR/t are display conversions only.

## Seed Data

The UGA seed creates:

- 4 commodities;
- `CPT UA Black Sea` delivery basis and basket;
- 8 active respondent companies plus additional directory respondents;
- respondent contacts, login emails, temporary password state and notification schedule;
- admin/member/respondent users;
- 14 days of respondent price submissions;
- 14 days of external benchmark indicatives;
- locked published indices for the previous 7 days;
- audit entries for seed and publication events.

## Production Notes

- Production requires `DATABASE_URL`.
- Historical published dates are treated as locked.
- Same-day values may be corrected until the end of the Kyiv trade date.
- Benchmark values are references. They are not silently published when respondent data are insufficient.
- If benchmark blend is enabled before publication, the calculated value, benchmark value, final value, method and audit event are persisted.
