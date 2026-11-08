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
