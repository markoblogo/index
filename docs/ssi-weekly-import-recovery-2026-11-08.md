# SSI weekly import diagnostics, 8 November 2026

Scope: `spike-ua`, existing Drive import and authenticated paired-worker response.
Owner authorized a narrow repair, tests/deployment and continuation to three
text/video pairs in the existing closed founders group. No public-channel or
WhatsApp expansion and no bypass of validation, delivery receipts or backoff.

Observed: the Mac voice runtime directory was missing and has been restored.
The current-week preparation separately failed before intake completion, while
new files were visible in the shared folder. The old generic response did not
establish whether refresh, listing, download, extraction or a database write failed.

The worker now reports only allowlisted stage, exception type, database/network
codes and bounded HTTP status. It does not expose original error messages,
queries, stacks, credentials, file contents or filenames. Existing canonical
workflow reasons and the existing redacted report-generation diagnostic remain.
Completed version receipts and import checkpoints are unchanged; interrupted
imports resume through their existing progress and duplicate guards.

Diagnosis is not proof of import success. Record the actual production failure,
repair and extraction/report/video/send receipts separately after verification.

## Size-policy mismatch

Production retry returned `drive_material_intake_failed` before any new material
was persisted. Code inspection found that the importer accepted up to 50 MiB,
while file ingestion independently rejected above 20 MiB by default. A shared
size-policy module now uses the same bounded 50 MiB limit for authenticated
`google-drive` ingestion only. Admin, Telegram and scheduled-link limits retain
their existing settings. PDF page/OCR budgets and report-readability gates do
not change. A later production retry must establish the actual outcome; the
first rejected file's size was not captured by the old diagnostic.

The owner authorized one fenced retry of the 6 November preparation after this
repair, only with no delivery job or active work. Do not disable general backoff
or duplicate-send protection.

## Actual import and drafting outcome

The repaired import advanced past a 34,934,511-byte UZ PDF that exceeded the
previous 20 MiB guard. All 105 changed versions were processed through saved
checkpoints; the seven current dated logistics PDFs have `extracted` status.
The large supplementary PDF remains `partial_visual_pending`, not falsely
described as completely read.

The first logistics candidate was rejected: 4,903 summary UTF-16 units, merged
border/port headings and a 701-unit paragraph (700 Unicode code points). The
provider's regex limit alone did not enforce the local UTF-16/message contract.
The revised staged contract reserves 3,600 summary units and separate headings,
allocates section quotas, and bounds provider paragraphs at 600 code points.
An automatic shape-only retry is allowed once inside a 230-second request
budget; fact/basis/contract/provider failures are never retried by that helper.
Neither Telegram limits nor factual validation are relaxed.

The first prompt-only repair still exceeded 3,600 units (4,700) and did not
reserve the ports heading. The provider contract therefore uses separate,
required section arrays with per-section fact-count and string-length caps.
Code injects headings and flattens to the existing report shape; missing sections
cannot be merged into one array item by the model. Tests exercise every section
at its maximum budget for all three parts. Existing UTF-16, scope and factual
checks remain authoritative; no received draft is mechanically sliced to fit.

## Quality hold and complete-paragraph repair

Production generation showed that the low per-field caps encouraged unfinished
words/sentences. The current candidate was held as `needs_review`; no messages
or videos were sent. The Mac LaunchAgent was temporarily unloaded without
changing its saved schedule. Do not re-enable until the replacement is reviewed.

The replacement uses complete paragraphs (700-unit safety ceiling), reserves
each required section first and adds optional whole paragraphs round-robin up
to 3,600 units. It never slices a fact, pads a sentence or adds punctuation to
conceal a fragment. Fragment rejection allows the existing single bounded
shape repair. New staged input identity prevents reuse of old malformed parts.

Paired weekly PDF context retains up to 18,000 native characters instead of
4,000, still under the existing per-source/overall grounding budgets. Rail
receipts reconcile land + Danube - internal Izmail + Odesa against export-only
totals before deriving a share. Grain-only queue receipts require the explicit
cargo label and UZ column; ambiguous cohorts remain unavailable. Observation
month/date is preserved independently of Drive modification time.

Paired weekly preparation also reads four bounded public closing-quote pages:
GrainDecision corn/wheat/rapeseed and Brownfield's dated closing bulletin. The
adapter checks actual observation date, named Close column, crop/expiry/unit,
and exact previous-Friday baseline before assigning a weekly change. Missing,
blocked or stale sources contribute no replacement quote. Morning PDFs remain
valid dated context, not closing prices. Normalized quote materials and source
URLs enter the frozen report evidence; this is not a new crawler/service.

The first complete-paragraph production candidate still misread neighboring
columns in flattened rail tables. It was stopped before video preparation or
delivery. Owner approved excluding those matrices and using signed rail fields:
rail/border/port paragraphs are now constructed from reconciled source fields,
not model-selected numeric cells. Missing reconciliation or a grain-only queue
blocks drafting. The model still drafts overview/road and both commodity parts.
Original rail materials remain stored; no source or archival file is deleted.

Arithmetic receipts now independently derive commodity/overall shares, buyer
concentrations and matched-month quantity/value changes from full dated cells.
They retain material IDs, denominators, units and actual cutoffs, not a copy of
generated prose. The 6 November candidate additionally requires operator review
of a misquoted historical buyer share and curve interpretation before promotion.
Do not clear a `needs_review` flag without correcting the text and rerunning
validation against independent receipts.

Final channel preview exposed a legacy formatter defect: keyword rebucketing
put logistics paragraphs in commodity parts, consumed crop sections' budget,
and considered evidence/feed text publishable prose. Complete authored packs
now retain exact part/section boundaries and never mine evidence or feeds for
additional public copy. Partial structured packs fail closed; genuinely legacy
unstructured reports retain their previous path. Tests assert all headings,
part isolation, multi-contract quote preservation and no evidence leakage.

Video source validation accepts exact `cents/bu` and `cents/lb` abbreviations
alongside their existing long forms. Accumulated queues use `wagons`, not
`wagons/day`; count/rate substitution remains rejected. Number/basis/date and
source-quote checks remain unchanged. A lease-fenced private metadata candidate
is saved before validation, bound to the report revision, so an invalid quote
can be diagnosed without blind regeneration or any Telegram send.

The saved metadata diagnostic exposed a separate contract failure: free JSON
quoted spreadsheet receipts rather than report text, used list/null metrics and
put 4-9 rows into a single scene. Metadata now has a strict schema: numeric
claims, source-ID/unit/basis enums, exact report-excerpt choices, 3-12 scenes per
part, slug IDs and at most two rows. Evidence is compacted for presentation-only
generation; the frozen manifest still hashes the full original evidence. The
existing semantic quote/value/basis/date and packet guards remain authoritative.

Mixed soybean-complex paragraphs bind each numeric value to its adjacent unit,
before the next numeric field or semicolon. A meal quote elsewhere in the same
paragraph no longer incorrectly rejects a valid bean/oil quote; borrowing that
meal's unit for another number remains rejected by regression tests.

## Deterministic companion-video facts

Even constrained model output invented scales and paired unrelated source
quotes with metrics. The report itself remains the full reviewed report; only
the video-metadata step is replaced. It now selects finite typed facts from the
frozen published-index ledger, frozen source tables, checked closing quotes and
reconciled rail receipts. Every selected value must also occur with its unit,
basis and period in the corresponding report part. Missing support omits an
optional scene; fewer than three scenes in any part blocks the whole package.

English copy uses short factual templates and same-unit/date comparisons, not
free-form causes or a second model calculation. Actual futures delivery months
remain in source-driven period labels, never hard-coded in headlines. No new
provider call is made for video metadata. Existing packet/source/template hashes,
all-three-assets readiness and six-send receipt fencing are unchanged.

The installed HyperFrames 0.8.185 exporter failed against the current Chrome:
`drawElementImage` required `content=drawable`. Layout/contrast checks passed;
this was an experimental capture-path failure, not a reason to weaken QA.
The supported `PRODUCER_EXPERIMENTAL_FAST_CAPTURE=false` compatibility switch
selects normal capture. It is retained in the existing LaunchAgent and installer;
the 300-second wake interval, approved template/renderer hashes and media checks
are unchanged. Do not enable the experimental path merely because it is faster.

Encoded-frame review caught a presentation defect before delivery: the template
renders observation dates rather than `period.label`, so futures expiry was only
in packet metadata. Each futures scene now prints its actual source expiry in
the visible takeaway caption; deferred rows also name their source month/year.
Regression tests cover this. Owner approved rebuilding the still-unsent package;
retain the first exports as rejected audit artifacts, not confirmed deliveries.
