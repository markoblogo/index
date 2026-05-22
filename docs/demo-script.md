# UGA Index Demo Script

This 7-10 minute flow presents UGA Index as a public market index, respondent collection workflow, and admin publication tool. Use the seeded or mock demo data unless a PostgreSQL database is configured.

## 1. Public Index Site (1 minute)

Open `/uk`.

Show the UGA Index homepage in Ukrainian:

- Four headline index cards for corn, wheat 11.5% protein, feed wheat, and GMO soybean.
- Date, update status, and CPT UA Black Sea basis.
- Weekly comparison chart and latest quotations table.
- Partner roles for UGA, UGA operational roles.

Switch to English using the language switcher. Confirm the equivalent `/en` page keeps the same market data with English labels.

## 2. Methodology and Trust Model (1 minute)

Open `/en/methodology` or `/uk/methodology`.

Explain that UGA Index is calculated from respondent baskets using end-of-day CPT UA Black Sea price submissions. Highlight the median, +/-2% outlier filter, cleaned arithmetic average, minimum five respondent rule, locked publication values, and audit log.

Mention the signed methodology PDF placeholder as the future location for the official published method.

## 3. Admin Login and Daily Input Matrix (1.5 minutes)

Open `/login`.

Enter `admin@uga.ua` / `admin`. The role is inferred from the allowlist; there is no role selector.

Open `/admin/daily-inputs`.

Show:

- Date picker defaulting to today.
- Matrix with four commodity rows and eight respondent company columns.
- Per-cell benchmark value, warning state, and automatic source indicators.
- Save action for admin-entered or reviewed prices.

Stress that this page is for data collection only and does not publish the index.

## 4. Respondent Survey (1 minute)

Log out, return to `/login`, enter a respondent allowlist email and password, and continue.

Open `/respondent`.

Enter four CPT UA Black Sea prices and submit. Show the submitted confirmation with the respondent company, date, basis, and values.

Log back in as admin and return to `/admin/daily-inputs`. Confirm the respondent-submitted values are visible in the matrix with respondent source/status.

## 5. Calculation and Publishing (1.5 minutes)

Open `/admin/calculate`.

Show each commodity calculation block:

- Raw respondent count and included respondent count.
- Median and UGA Index value.
- Excluded outliers and deviation percentages.
- Benchmark reference comparison.
- Publishability status and calculation version.

Point out that benchmark values are displayed only as external reference data unless an admin explicitly enables benchmark weighting for publication.

Click `Publish all publishable indices`, then show the locked published values and audit-oriented publication state.

## 6. Public Update and Analytics (1 minute)

Open `/en`.

Confirm the homepage cards and latest quotations now reflect the published values from the admin workflow.

Open `/en/analytics`.

Show the analytics access preview, historical line chart, day-over-day changes, commodity comparison, scenario model, and published values table. Explain the future access levels: public visitor, registered user, UGA member, and paid access.

## 7. Embeddable Widget (30-60 seconds)

Open `/embed/cards?locale=en&theme=light&layout=compact`.

Show the compact card widget without the public site shell. Mention that the widget is safe to embed in WordPress via iframe or the JS loader documented in `docs/embed.md`, and that the public URL comes from `NEXT_PUBLIC_SITE_URL`.

## Close

Summarize the production path:

- Replace preview auth with production password setup emails and hashed credentials.
- Connect the real PostgreSQL database and durable audit trail.
- Integrate live benchmark indicative ingestion.
- Add production entitlements for UGA members and paid analytics.
- Finalize the signed methodology PDF and public domain migration.
