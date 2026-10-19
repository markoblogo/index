# SSI weekly report pattern v1

Calibrated: 2026-10-19. Operator references: 2026-10-09 and 2026-10-16.
Scope: generate -> validate. Two examples establish an editorial contract, not
a statistically validated learning result. Publishing and sending remain gated.

## Agreed weekly delivery timetable

Owner clarification: 2026-10-19. All deadlines use Europe/Kyiv, including its
daylight-saving changes; do not encode a single fixed UTC hour year-round.

- Materials for the completed trading week are supplied to Drive until
  Saturday 22:00 inclusive.
- After that deadline, complete a final Drive synchronization and extraction
  check. An earlier successful sync does not prove that the final package was
  collected. Record the import cutoff and any pending or unreadable materials.
- Generate and validate the report overnight Saturday to Sunday, or early on
  Sunday, with enough time to complete it before the Telegram delivery slot.
- Once a report passes the accepted quality checks, publish-site may happen
  immediately after generation/validation; it does not wait until 09:00.
- Send-channel to Telegram is Sunday 09:00 Europe/Kyiv: exactly three parts as
  three messages, taken from the same validated report version as the website.

Keep the trading-week/source observation dates distinct from Saturday's intake
deadline and Sunday's delivery date. For example, the 16.10 trading-week report
may receive its final documents on 17.10 and be delivered on 18.10 at 09:00.
Do not relabel Saturday uploads or Sunday delivery as new market observations.

Preparing or publishing the site version must not send Telegram early. The
Telegram step must reuse the ready report instead of starting full generation
at 09:00. Track delivery per part so an interrupted send resumes only missing
parts. A missing or invalid report at the deadline is an operator failure/gap,
not permission to invent facts, send stale content, or broadcast a partial set.

WhatsApp is frozen while the website/Telegram workflow is being calibrated.
Do not develop, configure, unfreeze, test delivery to, or send via WhatsApp as
part of this work. Returning to it requires a later explicit owner instruction.

Activation gate: keep the current periodic quality hold until the owner accepts
the generated reports and the site/Telegram flow has been checked. This section
is implemented by ssi-weekly-workflow.ts and the dedicated prepare/send cron
routes. Preparation runs hourly at :10 between 00:10 and 08:10 Kyiv (UTC
candidates are guarded by the local clock). Telegram runs at 09:00 with safe
five-minute catch-up through 09:30. Legacy SSI Saturday weekly slots are no-ops;
1D3X and fourth-Saturday monthly timing remain unchanged. The quality hold is
checked before imports/generation/site publication/sending in these new routes.
Hourly standalone Drive collection remains independent of the publication hold.
The legacy spike-weekly-report cron also delegates to prepared-only sending;
it cannot regenerate a weekly SSI report or bypass its local-time/hold guards.

The report period ends on Friday; final Drive intake also includes Saturday
uploads. A filename's explicit observation date must still lie in the report
period. Undated Saturday uploads retain their original provenance and require
content-level source-period checks; upload time is not an observation date.

The Telegram report-level claim prevents concurrent delivery. Confirmed message
IDs are checkpointed after each part; an in-flight null receipt is saved before
the request. A known rejection allows retry of the remaining parts. A timeout
or ambiguous receipt stops automatic retries and requires an operator to
reconcile the channel before removing the null receipt. Never clear receipts
or force-resend blindly. Missing/invalid drafts and incomplete import/required
materials return blocked receipts and are logged, without a channel broadcast.

## Composition

Use three Ukrainian parts, each independently readable in one Telegram message:
1. Logistics: customs export, road, rail, border, ports.
2. Grains: brief SSI overview, corn, wheat.
3. Oilseeds and processing: brief SSI overview, sunflower, rapeseed, soybeans.

Repeat the report title, session date and SSI footer in every part. Preserve the
configured SSI brand rather than importing a donor's brand/footer. Use the same
claim ledger for the site and channel versions; do not generate independent
facts for each surface. Facts and formulas are versioned separately from prose.

Target roughly 3000-3700 UTF-16 units per part; 4096 is the hard channel ceiling.
Count the title, date, formatting, links and footer too. The October references
are respectively 3208/3581/3454 and 2936/3743/3495 raw UTF-16 units.
Compress repeated prose before removing basis, expiry, unit or timestamp labels.

Under each commodity: compact price bullets -> 2-4 concrete paragraphs ->
Ukraine price/basis implication and relevant export measurement. Use
fact -> comparable change -> bounded interpretation. Avoid generic market
sentences, automatic causal explanations and trading instructions.

## Evidence contract

| Measurement | Governing evidence |
| --- | --- |
| SSI price and weekly change | Published archive for both weekly endpoints, exact commodity/basis; latestData.changeAbs is daily |
| Customs clearance | agro_ex_im, export sheet, internal tonne block; monetary block stays thousand USD |
| Road / Danube passage | check points, matching sheet and current covered-period total |
| Transport composition | out / PIK Control over delivery, exact dated column, its own total and fractions |
| Rail | UZ dated PDF prose/table: distinguish loading, transportation, export, wagon transfer and accumulation |
| Futures | Exchange/provider, exact expiry, unit, session date and settlement/close type |
| Physical oils / energy | Dated TBC observation with 10:00 timestamp; not a Friday futures close |
| Context | Dated source document or monitored news body; headline-only items are discovery leads |

Select coverage by the document contents, not Drive modification or ingestion
date. A September workbook modified in October is not October evidence.
For weekly comparisons select the most recent usable current and prior weekly
cutoffs, not the latest two uploaded files.

For cumulative figures sharing start date, scope and units:
- interval volume = current cumulative - baseline cumulative;
- elapsed days = difference between the two source cutoff dates;
- current daily rate = interval volume / elapsed days;
- baseline daily rate = baseline cumulative / inclusive days in its source span;
- rate change = (current daily rate / baseline daily rate - 1) * 100.

Do not subtract different-month starts, splice different customs series, divide
by rounded values, or zero-fill absent cells. Keep source decimals through
calculation; round only the final displayed result. A rate or share needs its
own denominator in the claim ledger.

Customs clearance and actual border passage are separate populations.
For 16.10, wheat is 557647.581 t cleared versus 588657.987 t passed; corn is
120632.032056 t cleared versus 117421.287591 t passed. Neither total is a
correction to the other. Transport percentages use passage totals. Destination
percentages in agro_ex_im use clearance totals. Danube corridor figures include
Orlivka and must not be called sea-port loading or added to overlapping flows.

Changes between averages for the first 6 and first 14 days are changes in a
cumulative average, not the standalone latest week's rate. Preserve the scope
of four western rail directions separately from the wider border aggregate.

Every retained numeric claim needs: material ID/link, sheet/page, source period,
commodity/basis or contract, unit, numerator/denominator or formula, and status
(supported, conflict, gap). Keep this ledger outside the channel copy.
Reference reports control editorial style; they never substitute for missing
current-period observations.

## Runtime seam and acceptance

Implementation: src/lib/media-hub-ssi-weekly-pattern.ts, invoked only by the SSI
weekly branch of buildSsiWeeklyMonthlyPrompt. It projects bounded structured
XLSX evidence into the prompt alongside existing documents/news, retaining
current/baseline periods and separate clearance/passage cohorts. This closes
the direct-material 700-character truncation gap without increasing crawling
or writing to source materials.

Regression coverage uses synthetic February inputs, not the October reference
figures: tonne-versus-dollar blocks, observation-date selection, future/stale
exclusion, missing cells, truncated/partial inputs, road/Danube separation and
transport denominators. Daily, monthly and 1D3X prompts retain their contracts.
The October review additionally checked five real XLSX files: seven selected
evidence blocks, 10718 characters before later formatting-only changes.

Release scope: calibration code, source ledger and the 16.10 draft are versioned
with the weekly scheduling implementation. The draft is a review artifact, not
a published report. Periodic publication stays on hold until report quality is
accepted; deploying this code does not lift that hold.

For monthly use the same evidence/denominator rules over the full month.
Do not sum overlapping cumulative weekly snapshots or average weekly percentage
changes. Monthly editorial density and channel packaging need their own review.

## Review artifacts

- [16.10 report draft](reports/ssi-weekly-2026-10-16.md)
- [Two-reference review and claim ledger](reports/ssi-weekly-2026-10-16-review.md)
