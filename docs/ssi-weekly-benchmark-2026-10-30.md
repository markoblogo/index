# SSI weekly benchmark: 30 October 2026

Decision date: 1 November 2026. Scope: SSI Ukrainian weekly `collect` (read-only
selection of already imported materials), `normalize`, `generate`, `validate`.
No index calculation, report generation now, video replacement, schedule change,
`publish-site`, `send-channel`, WhatsApp or approval-state change.

## Baseline and findings

Compare the owner's published 30.10.26 reference with our source-checked
editorial draft `weekly-2026-10-30.md`, used for the accepted three videos.
The rejected automatic candidate is not the comparison baseline. References
are editorial benchmarks, not independent verification of their figures.

| Area | Our source-checked draft | Formation correction |
| --- | --- | --- |
| SSI | Grain and oilseed levels/deltas match the reference. | Keep exact published Friday comparisons and the existing index calculation. |
| Customs / road / Danube road | Current quantities and some weekly increments; little matched-month context. | Retain matching prior-month quantities AND values, plus three cumulative cutoffs for two weekly daily rates. |
| Rail continuity | Wagon transfer compared with September; queue compared with 30 September. | Prefer the previous weekly observation: reference 337 vs 340 wagons/day, 4,079 vs 4,373 grain wagons. Do not silently replace a weekly baseline with month-start data. |
| Grain exports | Current tonnes, values and mainly three buyers. | Top five buyers; matching previous-month tonnes/value; supported concentration change. |
| Oilseed chains | Current seed/oil/meal quantities; limited value and comparison depth. | Restore per-commodity monetary cells and comparable month-to-date changes across the whole chain. |
| Futures / physical oils | Missing Friday futures; some intraday or older observations. | Exact contract, observation and price-type identity; near/deferred spreads and proper rolls. Missing settlement is a gap, not a number to copy from the reference. |
| Narrative | More caveats and background. | Fact -> matched comparison -> concise implication. Preserve essential scope distinctions without repeating methodological boilerplate. |

Examples of benchmark coverage, NOT live defaults: total customs 2.872m tonnes
versus 2.886m; road 387.6kt versus 334.2kt; weekly export pace 100.1 versus
91.3kt/day. Reference rapeseed February settlement 555.25 is not interchangeable
with our older 553.50 observation. January intraday soy oil is not December
settlement. A plausible mechanism such as expiry pressure still needs evidence.

## Implementation

- Shared editorial contract is calibrated to both 23 and 30 October. The three
  messages, configured footer, Ukrainian text and existing English-video process
  stay unchanged. Forwarded camera icons are not adopted as branding.
- Only paired SSI weekly drafting opts into a bounded comparison-material query:
  already imported Drive XLSX and named logistics/market PDF families, at most
  96 query candidates and 12 selected historical materials. Explicit file dates
  select candidates; source contents establish actual observations. Current
  materials retain their existing 32 slots. Missing current families are not
  replaced by archive files; readiness checks do not opt in to archive context.
- Spreadsheet evidence selects exact current, minus-seven-day, minus-fourteen-day
  and matching previous-month cutoffs. No nearest-date substitution or month-end
  rollover. The third cutoff may fall just outside the old fourteen-day window.
- Money and weight sections are paired by coverage date/start and commodity code.
  An undated money section is allowed only for an unambiguous single adjacent
  money/weight pair. Currency retains its thousand-USD unit and explicit scaling.
  Destination rows stop at the next section; grain buyers retain five rows.
- The comparison matrix records input material IDs, periods, units, changes and
  gaps. Weekly rates need three compatible cumulative observations; month-to-date
  comparisons require matching calendar endpoints and explicit first-day starts.
  Missing or falling cumulative observations do not create invented daily rates.
- Historical PDF context is explicitly baseline-only, not current news, price or
  readiness evidence. No new feed, provider, OCR call or external retrieval is
  introduced by this change. The bounded selection can still miss an unavailable
  or undated file; source gaps are not evidence of unchanged prices.

## Release and acceptance boundary

This change is local, not a claim of deployed readiness. No tests, report/model
generation, video rendering or channel actions were run for this calibration.
Before release, request narrow regression/type checks covering: dated and undated
money sections, several observation blocks in one sheet, zero/unknown cells,
three cutoffs, month/year boundaries, filename-date selection, current-material
priority and archive isolation from readiness. Then use the existing authorized
release path; do not reset an in-progress staged draft to hide a prompt hash
change or resend this week's accepted output.

The next scheduled report must establish coverage from its own documents and
news. This patch cannot supply Friday settlements absent from those sources,
prove a causal claim or promise editorial acceptance in advance.
