# UGA Index Product Brief

## Overview

UGA Index is a standalone bilingual platform for the Ukrainian Grain Association. It publishes a daily spot export price benchmark for core Ukrainian grain and oilseed commodities and provides the internal workflow for collecting respondent prices, validating calculations and publishing locked index values.

## Current Product

- Public bilingual website at `/uk` and `/en`.
- Daily index cards for corn, wheat 11.5% protein, feed wheat and GMO soybean.
- Official values in `USD/t`; UAH/t and EUR/t are display conversions.
- Hero/methodology basis: `CPT Black Sea Panamax Ports (POC)`.
- Cards, tables and forms basis: `CPT UA Black Sea`.
- Delivery period: `T+30`.
- Public pages: About, Methodology, Analytics, Cooperation/Subscription and legal pages.
- Embeddable cards, chart and full-site iframe for the UGA website.

## Internal Operations

- Allowlist-style login preview: users sign in with email/password, and role is inferred from the account.
- Admin daily input matrix for respondent prices and benchmark comparison.
- Respondent directory with contacts, login email, temporary password status, collection mode and notification schedule.
- Respondent daily survey form scoped to one company.
- Publish UGA Index workflow that calculates all commodities and publishes eligible indices in one locked batch.
- Audit log entries for calculation, publication and submission events.

## Respondents

The current active basket contains 8 respondent companies. The directory can also include pending/manual-outreach companies. The active respondent count is used in public index cards, analytics and API responses.

## Methodology

For each date, commodity and delivery basis:

1. Collect respondent prices.
2. Calculate the median price.
3. Exclude values that deviate by more than +/-2% from the median.
4. Calculate the arithmetic average of the cleaned sample.
5. Publish only when at least 5 valid respondent prices remain.
6. Lock published values.

Benchmark values may be displayed as references. They are not silently published when respondent data are insufficient. If an admin enables benchmark blend before publication, the calculated UGA value, benchmark value, final adjusted value, method and audit event are persisted.

## Success Criteria

- Public users see current values, basis, delivery period, respondent count and update status immediately.
- Ukrainian and English routes render consistently.
- UGA can embed either compact widgets or the full-site iframe.
- Respondents can save drafts and submit locked daily values.
- Admin can edit same-day prices, review historical locked dates, manage respondents, and publish all eligible indices in one action.
- Production deployments use PostgreSQL-backed data and do not silently fall back to mock data.
