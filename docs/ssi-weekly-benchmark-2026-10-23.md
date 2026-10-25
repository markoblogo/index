# SSI weekly benchmark: 23 October 2026

Decision date: 25 October 2026. Scope: `spike-ua`, Ukrainian weekly report,
`generate -> validate`. Route: `evolve`, production-sensitive drafting guidance;
review focus: contracts and data integrity. No schedule, index calculation,
`publish-site`, `send-channel`, WhatsApp or approval-state change.

## Comparison baseline

Compare the owner's pasted **final published reference dated 23.10.26** with
our partner-format revision 2, sent as Telegram messages 1665/1666/1667.
The earlier revision is not the comparison baseline. The working copy of v2
was `/private/tmp/ssi-weekly-20261023/report-23-10-partner-format-v2-final.md`;
that temporary file is not a durable dependency of generation.

The reference is an editorial/coverage benchmark, not an independently verified
data source for every number. Below, figures unique to the reference remain
reference claims until reconciled with the relevant materials. Never reuse
these October observations as facts in a later issue.

## Recorded differences and decisions

| Area | Our v2 | Final reference / decision |
| --- | --- | --- |
| Structure and main prices | Three parts; logistics/grains/oilseeds; major SSI and futures levels largely aligned. | Keep the structure. Do not rewrite the report into a generic news digest. |
| Export overview | 2.172m tonnes, $1,139.0m and weekly daily pace; few matched-month comparisons. | Add the matched 01-22 September base, volume/value absolute and percentage differences when verified. Reference: +99.8kt / +4.8%, +$84.7m / +8.0%. |
| Commodity composition | Grain share, aggregate oils/meals, little component detail. | Include wheat/corn/barley, oil components and oil+meal share when supported. Reference oil+meal share: 24.4%. |
| Road | Volume/weekly pace, four checkpoints and product leaders. | Prioritize matched-month comparison and product mix: reference 283.3kt versus 248.9kt (+13.8%); grain share 3.2%. Checkpoint geography is secondary if space is tight. |
| Danube road flow | Daily passage pace appeared under port/rail discussion. | Put road passage in the road section: cumulative 779.3kt, weekly pace -20.2%, receiving destinations/product mix. Do not call it marine loading. |
| Rail | Export and land/port split spread across three subsections. | Group 1.054m total grain transport, 675.9kt export, 548.7kt land / 127.2kt export ports with matched m/m/y/y and explicit scope. Keep border queue and rail port delivery separately. |
| Border | Four countries and raw queue change (-49 wagons). | Keep units/periods; add comparable percentage where helpful: 340.0 versus 324.2 wagons/day, 4,373 versus 4,422 grain wagons. Do not imply equal observation lengths or use an all-cargo queue as grain. |
| Grains | Weekly pace and selected buyers; weak matched-month layer. | Per crop add cumulative tonnes against the same prior-month dates and top buyers. Reference corn: 200.0kt versus 252.2kt; wheat: 740.2kt versus 749.7kt. Do not substitute daily pace for this comparison. |
| Global drivers | Sales, France and weather; no verified tender rows. | Prefer 1-2 concrete current drivers. FLC/NOFI tender claims in the reference require actual source evidence before inclusion, not copying from the benchmark. |
| Sunflower chain | Oil/meal totals and weekly pace; no seed chain or buyer/value detail. | Require a coverage attempt for seed, oil AND meal: tonnes, available values, matched-month movement, leading buyers. Reference claims include seed 25.0kt / $12.5m, oil 177.6kt / $234.6m, meal 217.7kt. Omit unverified fields, not the whole analytical chain. |
| Rapeseed and soy | Price structure and weekly flow; little trade value/geography. | Add seed/bean tonnes, available value and buyers; retain oil/meal comparisons. Reference rape: 284.5kt / $144.0m; soy: 79.3kt / $32.9m. These values require material reconciliation. |
| Analytical density | More generic transitions, methodological explanations and weekly-pace repetition. | Use the space for supported comparison/value/geography. One short interpretation after figures; avoid invented causes, margin/arbitrage claims or extra watch-next-week sections. |
| Presentation | Heavy inline bold, explicit source-date caveats, three messages. | Keep three complete messages and key-figure emphasis, but reduce repetitive bold/caveats. Retain contract dates/units needed for meaning. No public sources footers; preserve internal provenance. |

## Do not inherit benchmark defects

- The corn spread 21.25 -> 18.50 narrows. The reference's later statement that
  narrowing changed into widening contradicts its own figures. Recompute first,
  then write the direction.
- Our evidence ledger recorded the older sunflower-oil quote as a combined
  November-December indication. Assigning that base independently to both months
  (and writing +160 / +110 or +12% / +8.3%) needs explicit comparable baselines.
- Soymeal is USD per **short ton**, not automatically USD per metric tonne.
  Keep the unit even if the reference abbreviates it to a dollar sign.
- WTI 103.27 was recorded for December 2026. Do not relabel it as a continuous
  nearest contract or compare it with a different-month/intraday observation.
- Published report wording does not establish causality. A commodity price
  and export flow can move together without proving one caused the other.

## Updated formation algorithm

1. **Collect/normalize:** use the existing folder and monitored news channels.
   Select by observation period, not upload/print date. Preserve source/material
   identity, page/sheet/cell, units and coverage receipts. A URL or file title is
   not evidence that its contents were read. Do not claim complete folder
   coverage unless listing and extraction actually established it.
2. **Build a comparison matrix:** current period, matching previous-month dates,
   previous seven-day interval and prior weekly cutoff. Separate tonnes/value,
   road/rail/marine, customs/export/internal/transit, seed/oil/meal. Record missing
   fields and contradictory figures internally, never as zero.
3. **Generate:** follow the fixed three-part structure above. Within each crop,
   quotes -> concrete global drivers -> Ukraine trade/value/buyers -> concise
   physical-market interpretation. The last final official report supplies
   continuity and style, not automatically valid current facts or price bases.
4. **Validate:** reconcile arithmetic and semantic direction; compare only
   matching contracts, periods, scope, basis, currency and tax treatment. SSI
   changes require published snapshots at both weekly cutoffs. Retain unsupported
   items as internal warnings, not public filler or invented figures.
5. **Render:** exactly three Telegram messages, each <=4096 UTF-16 units after
   HTML entity parsing, headings/footer included; aim for 3700-3900. Compress
   repetition before useful trade statistics. No fourth message, raw slicing,
   broken tags or public `Джерела` blocks. Site publication and channel delivery
   remain separate existing workflows.

## Code attachment and limits of this change

Shared prompt-level contract:
`src/lib/ssi-weekly-editorial-contract.ts`, version `2026-10-25`.
It is injected into both `buildSsiWeeklyMonthlyPrompt` (weekly SSI only) and
`generateWeeklyReportDraft` (tenant `spike-ua` only). The latter's required parts
now follow the benchmark instead of requesting extra AI Market Read/geography/
watch-next-week sections. Daily, monthly and 1D3X rules are not changed.

This is drafting guidance, **not a new deterministic validation gate**. It does
not itself fetch missing comparison cells, alter an extraction receipt, repair
historical indices or prove the next automated report will meet the benchmark.

### Runtime follow-up authorized by owner

The three technical limits are addressed through
`src/lib/ssi-weekly-report-safeguards.ts`:

- SSI's `WeeklyReport` generation budget is 16,000 output tokens with a bounded
  180-second timeout, inside the prepare route's existing 300-second duration.
  Other tenants retain 2,200 / 60 seconds. No generation call was made to test
  the budget. Incomplete model responses and invalid/oversized Telegram HTML
  packs are rejected as AI results rather than accepted as finished output.
- Weekly index comparisons require observations exactly at the current cutoff
  and seven days earlier. A missing baseline yields `null` plus a dated warning,
  not zero; missing current-cutoff values cannot masquerade as fresh levels.
  Regeneration refreshes the manifest instead of reusing an undated summary.
- The non-daily channel renderer reserves its heading/footer and selects whole
  facts across sections within a conservative 3,900-unit raw HTML budget. It
  does not slice HTML, sentences or emoji. An indivisible oversized fact is
  omitted; if no complete fact fits, rendering fails rather than publishing a
  broken prefix. Exactly three parts remain the contract.

Existing keyword bucketing is not redesigned by this narrow fix; future output
quality and section placement still require the scheduled editorial review.
The pure safeguards module is separate from the pre-existing
`ssi-weekly-runtime.ts` scheduler, which remains unchanged.

## Next scheduled acceptance

Owner requested no additional test report now. Evaluate the next scheduled issue
on its own new materials, not by regenerating 23 October. Existing intended
schedule remains: intake closes Saturday 22:00 Kyiv, preparation overnight,
site when ready, Telegram Sunday 09:00 Kyiv; WhatsApp stays frozen.

Record actual observation dates/coverage, presence of the comparison matrix,
seed/oil/meal depth, matching published SSI baselines, unsupported claims,
three-message lengths, final rendering and separate site/send receipts.
Do not claim the next report's quality checks have passed in advance. The owner
authorized narrow regression tests, type checking, commit/push and deployment
for the follow-up fixes, but no report generation or publication now. Tests use
synthetic fixtures without model requests or external sends. A deployment
receipt is distinct from proof of the next scheduled report's editorial quality.
