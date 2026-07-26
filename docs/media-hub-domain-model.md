# Context and Index domain model

This document keeps the shared vocabulary for Index and Context work. Use it
when changing ingestion, calculation, report generation, site publication or
channel delivery.

## Core terms

| Term | Meaning | Should not be confused with |
| --- | --- | --- |
| `source` | External or editorial origin of information: Telegram bot/chat, RSS feed, API, manual upload, monitored website. | A specific file, link or message. |
| `material` | One received item from a source: Telegram text, link, PDF, XLSX, CSV, image, forwarded post or caption. | A generated report. |
| `asset` | Stored file/text/preview derived from a material. | Source metadata. |
| `snapshot` | Normalized evidence set for one reporting window. | Public report text. |
| `latestData` | Current published index values read from public DB-backed index APIs. | Saved report index section. |
| `historyData` | Published historical index values used for d/d, t/t and chart context. | Respondent submissions. |
| `report` | Persisted `MediaHubReport` content shown on the site. | Telegram/WhatsApp send event. |
| `publish-site` | Write/update report or index state that is visible on the public site. | Sending to Telegram/WhatsApp. |
| `send-channel` | Deliver already prepared content to Telegram, WhatsApp or another external channel. | Generating or saving a report. |
| `situational-monitor` | Read-only operator or Cortex view over a bounded window, layers, signals, freshness and provenance. | A scheduler, publisher, sender or new ingestion source. |
| `variant-monitor` | Tenant/product-specific view over a shared situational-monitor contract. | A separate runtime or copied dashboard product. |
| `layer` | Named view over approved data, such as index snapshot, source freshness, publication readiness, logistics or claim support. | Permission to collect new data. |
| `approval-sensitive` | Any action that changes production-visible state or sends content externally. | Local render/test only. |

## Workflow states

Use these names when discussing or reviewing workflow changes:

```txt
collect -> normalize -> generate -> validate -> publish-site -> send-channel
```

Expected boundaries:

- `collect`: fetch or receive materials without editorial interpretation.
- `normalize`: extract text, links, files, metadata and evidence records.
- `generate`: build report/index content from normalized inputs.
- `validate`: check evidence, freshness, format, channel limits and approval state.
- `publish-site`: persist public web-visible content.
- `send-channel`: send Telegram/WhatsApp messages from current approved content.

## Invariants

- Telegram/WhatsApp daily SSI index tables must use the current published index
  snapshot at send time, not stale saved report tables.
- Site publication and channel sending are separate operations and must be named
  separately in docs, PRs and runbooks.
- Daily Context overview items must be current-period market signals, not old
  background facts.
- Evidence and source freshness matter more than source volume.
- Duplicate channel sends require explicit force/manual intent and idempotency
  checks.
- Situational monitors are read-only by default. They may show readiness,
  freshness, provenance and gaps, but they do not publish site content, send
  Telegram/WhatsApp messages or expand ingestion rights.

## Related docs

- Browser/source extraction policy: [`media-hub-browser-runtime.md`](media-hub-browser-runtime.md)
- Situational monitoring contract: [`situational-monitoring-contract.md`](situational-monitoring-contract.md)
- Admin/internal authorization matrix: [`admin-api-auth-matrix.md`](admin-api-auth-matrix.md)
- Manual material intake: [`media-hub-manual-materials.md`](media-hub-manual-materials.md)
