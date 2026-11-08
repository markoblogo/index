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
