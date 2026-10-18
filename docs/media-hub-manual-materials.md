# Context manual materials

Manual materials let the team push links and files into the next Context report without editing code or waiting for a crawler.

For future automated link extraction, Context should prefer the lightweight
Obscura runtime for DOM/text/assets extraction and fall back to
Playwright/Chromium only when visual, authenticated or unsupported browser
behavior is required. See `docs/media-hub-browser-runtime.md`.

## Telegram intake

Use the 1D3X Context bot (`@idex_grains_bot`) for links and files. The respondent bot is not used for this flow.

Commands:

- `/start` or `/help` - show usage instructions.
- `/materials` - show short submission guide and admin fallback.
- `/tags` - show supported tags.
- `/status` - show the latest materials submitted from the current chat.

Project tags:

- `#ssi` - route material to Spike Spot Index.
- `#1d3x` or `#id3x` - route material to 1D3X.
- `#ssi #1d3x` - route the same material to both projects.

Report tags:

- `#weekly` - next weekly report.
- `#monthly` - next monthly report.
- `#daily` - daily report if editorially needed.
- If report type is missing, the system treats material as `#weekly`.

Examples:

```text
#ssi #weekly https://example.com/report
#1d3x #weekly https://example.com/global-grains
#ssi #monthly
```

For files, add tags in the file caption:

```text
#ssi #weekly
#ssi #1d3x #monthly
```

Supported automatic extraction formats:

- PDF
- XLSX / XLS
- CSV
- DOCX
- TXT / HTML / MD

Current pilot:

- Manual and Telegram files pass through a shadow `manual_file ->
  markitdown-style` normalization layer.
- TXT, MD, HTML and CSV produce markdown/text evidence receipts immediately.
- Accepted HTML source links also produce a shadow `web -> crawl4ai-style`
  markdown receipt for operator review.
- PDF still uses the existing PDF extraction adapter for text/previews; the
  MarkItDown-style pass records only shadow normalization metadata.
- DOCX/XLSX use bounded OOXML extraction with cached values, sheet/table structure
  and explicit truncation/unsupported-format warnings; formulas are not evaluated.
- The admin materials page shows extraction receipts: adapter, runtime, status,
  markdown availability, freshness, operator review state and warnings.
- Report generation may use structured markdown only from `ok` receipts.
  `thin`, `unsupported`, `blocked` and `error` receipts remain review evidence
  and are not treated as stronger report input.
- Shadow normalization never publishes or sends content by itself.

Images and screenshots are accepted as visual evidence. The MVP stores an
original/preview asset and a visual-summary slot; full OCR/vision extraction can
be added later without changing the material flow. Prefer PDF, table files, or
links when exact numbers must be parsed automatically.

If `OPENAI_API_KEY` is configured, Context also generates real vision summaries
for image uploads and PDF preview pages. This is optional: failed or missing
vision generation never blocks ingestion.

### Serverless PDF extraction and repair

Mixed PDFs now retain embedded images without Poppler: pinned `unpdf` extracts
bounded raw images and direct dependency `sharp` encodes PNG previews. Limits:
25 MiB input, 12 image-bearing candidate pages, 16 MP per decoded image,
at most 6 image assets, 750 KiB per stored preview and a 12-second soft budget.
The existing configured OpenAI vision provider transcribes tables at high detail
into string cells, preserving headers, observation dates and units. No new
external service, browser worker or system OCR installation is required.

`MEDIA_HUB_ENABLE_PDF_TABLE_OCR=0` disables it. It also respects the existing
vision disable flag and requires `OPENAI_API_KEY`. Default OCR budget is three
images / 90 seconds per file, at most 60 seconds per image including response-body
reading, with an 8,000-output-token cap; `MEDIA_HUB_PDF_TABLE_OCR_MAX_IMAGES` is bounded
to 1-6. Unreadable cells remain `UNREADABLE`, never zero. Invalid, truncated or
failed OCR remains `partial_visual_pending`; email/disclaimer text cannot mark
that PDF complete. Receipts include `pdfTableOcrAttempt: pdf-tables-v1`, image
hash, page, provider/model, table counts and failure information. Machine OCR
is not independent corroboration and source conflicts require review.

Normalized table rows enter report prompts separately from the 700-character
summary, with an 18,000-character total table-evidence budget. Prompt data
retains row/column boundaries, units and dates. Drive sync upgrades old PDF
versions lacking the new receipt once; an explicit admin rescan retries pending
visual extraction. Originals, reporting dates and file versions are preserved.

`MEDIA_HUB_SSI_PERIODIC_PUBLICATION_HOLD=1` pauses SSI weekly/monthly publishing
before report generation, site persistence or channel delivery. It does not
pause Drive ingestion, daily SSI indices/reports or other tenants. The owner
must accept report quality before this hold is removed. OCR deployment and
ingestion verification do not authorize publication or channel sends.

PDF text uses Poppler when available, otherwise pinned `unpdf`/PDF.js; binary
regex guessing is not evidence extraction. PDF.js processes at most 25 MiB,
30 pages and the configured text limit, with a 12-second soft async budget.
Truncation is recorded; scanned, encrypted or failed PDFs remain review-only
without invented text. No PDF scripts or external AI service are needed for
text extraction. Original assets are preserved unchanged.

The admin Drive rescan upgrades legacy PDF extractions once per file version
(`pdfParserAttempt: pdfjs-bounded-v1`) without duplicating originals. Failed
attempts are recorded too, so an unreadable PDF does not stall every batch.
The SSI weekly gate requires readable Drive text, not just a matching filename
or an image preview. All four logistics material types are still required.
The observed UZ wagon-operation family includes daily border handover and grain
wagon queue PDFs ("Середньодобова передача через ПП", "Черга ... ПП/порти").
These are not interchangeable with customs `out_YYMMDD_F.xlsx` export tables.

Report selection examines at most 256 period candidates before choosing 32
materials and attaching assets. An explicit filename date (ISO, day-first with
four-digit year, `_YY_MM_DD`, or `DD.MM.YY`) excludes a recently copied archive
file from a newer reporting window. Selected materials rank by source date,
falling back to the Drive version date; stored historical dates are not rewritten.

OAuth Production and Google verification are separate states. Branding must be
verified before requesting restricted-scope review; never claim Google approval
from a successful connection or Production status. The current app homepage and
privacy notice are `/en/drive-sync` and `/en/drive-sync/privacy` on SSI.

2026-10-18 recovery checkpoint: SSI URL-prefix ownership was verified in Google
Search Console with `public/googleeb9732349ee22559.html` (keep the file deployed).
OAuth Branding is verified and published; this does not verify `drive.readonly`.
Restricted-scope submission still requires a real YouTube demo of the OAuth
flow and data use. The selected use category is Drive productivity. The
justification is read-only recurring intake of existing/new contributor files
from one configured shared folder; per-file `drive.file` selection does not
cover that unattended workflow. Disclose original/extract storage and configured
AI processing as in the approved privacy notice. Do not submit placeholder demo
links, reviewer credentials, security attestations or a verification claim.

The demo must show the app name, OAuth client and requested read-only scope,
consent flow, admin connection/sync, source provenance and extracted content,
and revocation/removal instructions. Mask credentials and unrelated account
data. Google review and any requested security assessment remain external gates;
they must not be represented as completed by a successful SSI import.

## Admin fallback

If Telegram upload is inconvenient, add materials manually at:

```text
/admin/media-hub/materials
```

The admin page supports:

- project selection: SSI or 1D3X;
- intended use: daily, weekly, monthly, or source candidate;
- URL ingestion;
- file upload;
- recent-materials audit with tenant, status, source type, received time,
  report usage and generated file assets.

## Processing rules

- The project tag is required. Messages without `#ssi` or `#1d3x` are ignored and the bot asks for a project tag.
- Multiple links in one message are ingested one by one.
- A file and caption are processed together, so tags in the caption are enough.
- Duplicates are skipped by content hash or canonical URL for the same reporting window.
- Unknown links are stored as source candidates or manual materials depending on tag/context.
- Materials are used by Context report generation through the persisted
  `MediaHubManualMaterial` table.
- File intelligence assets are stored in `MediaHubManualMaterialAsset`:
  `original`, `extracted_text`, `preview_image` and `visual_summary`.
- Report prompts receive ranked text snippets plus compact visual evidence
  summaries, not full raw files.
- The current implementation is not a visual vector index. Pixel/tile retrieval
  over large archives is the next step after this MVP. Current retrieval ranks
  extracted text and visual summaries lexically before sending evidence to the
  report prompt.

Vision-related environment variables:

- `OPENAI_API_KEY` - enables OpenAI vision summaries.
- `MEDIA_HUB_VISION_MODEL` - optional model override, defaults to `gpt-4o-mini`.
- `MEDIA_HUB_ENABLE_VISION_SUMMARY=0` - disables vision calls.
- `MEDIA_HUB_VISION_MAX_PAGES` - max PDF/image pages summarized per material,
  default `3`.
- `MEDIA_HUB_VISION_IMAGE_MAX_MB` - max image bytes sent to vision, default `5`.
- `MEDIA_HUB_STORE_PREVIEW_BYTES=0` - keeps preview metadata/summaries without
  storing preview binary bytes.

## SSI report source folder in Google Drive

Operator-provided SSI reporting materials are collected in the [SSI reports
source folder](https://drive.google.com/drive/folders/1cHuO86kaqND34vLTFo3Ly_OoBSNV3rgC).
Consult it when preparing SSI weekly and monthly Context reports.

Use the folder as a source catalog, then select materials by the period they
cover, not by upload or modification time alone:

- Weekly reports: current broker market comments, Black Sea basis and oilseed
  updates, dated `agro_ex_im` and `check points` tables, current Ukrzaliznytsia
  grain-transport statistics, and in-season crop progress.
- Monthly reports: season-to-date export/import and transport statistics,
  harvest/sowing progress series, and dated market assessments. Compare the
  latest period with the prior comparable period and retain the source's units,
  geography and reporting cutoff.
- Daily or stale files may support a dated historical comparison, but must not
  be described as current conditions without checking their observation date.

For each fact used, retain the Drive file title/link, source date or covered
period, relevant page/sheet, units, and any transformation in the report's
provenance. Do not combine overlapping daily tables as if they were independent
observations, and do not infer missing values from filenames.

Some files are third-party broker material with redistribution restrictions.
Do not copy their prose, charts or tables into a public report. Use only a
short, independently checked paraphrase with attribution when publication
rights permit; otherwise keep the material for internal context and request
operator review before using it publicly.

The SSI Drive folder is connected through a read-only Google OAuth integration.
The hourly `/api/cron/media-hub-google-drive-sync` job imports changed files as
`google_drive_file` materials for the `spike-ua` tenant; filenames marked as
monthly are routed to monthly reports, and other files default to weekly.
Duplicate content remains deduplicated by the existing material intake. The
OAuth refresh token is AES-256-GCM encrypted in the non-public `private` schema;
the encryption key is derived from the OAuth client secret, so client
credentials belong only in the SSI production environment. The cron is
bearer-authenticated and does not run for
the 1D3X platform deployment.

`/admin/media-hub/materials` shows Drive connection metadata, imported-material
count and the sync checkpoint, with a session-authenticated manual sync button.
The button calls `POST /api/admin/media-hub/google-drive/sync`; this requires an
active SSI admin session and a same-origin request. No cron secret is needed.
Each request imports at most 20 file versions within a two-minute batch budget;
the button continues bounded batches while the page remains open. Imported
versions are skipped before download/extraction, and each successfully stored
file advances the checkpoint. A partial batch never jumps the checkpoint to
the current time. Failed intake preserves earlier progress and surfaces an
error. Folder entries and files exceeding the 50 MB adapter limit are counted
as skipped. Sync does not generate reports, publish-site or send-channel.
The recurring sync is bounded to files modified in the last 62 days, covering
the current and previous monthly reporting windows. Older files remain in
Drive; historical backfill is a separate operator action. Drive modification
time determines the material's reporting window while `receivedAt` records
the actual import time. The file's content still determines the observation
date of cited facts; a recent modification is not proof of current data.
Report retrieval also checks the original Drive version date on legacy rows,
so an old file imported today cannot satisfy a current-week logistics gate.
This does not rewrite historical material records.
Before storing extraction output, NUL characters are removed from text and
nested JSON fields; original binary assets and their content hashes are kept
unchanged. This prevents PDF fallback text from aborting PostgreSQL intake.
XLSX/DOCX intake uses a bounded OOXML reader with the small MIT-licensed
`fflate` ZIP dependency. It retains sheet names, sparse columns, shared/inline
strings and cached values; formulas/macros/external links are not executed.
Number formats are not applied, so raw numeric values require unit/date review.
Limits: 8 sheets, 400 rows per sheet, 64 columns, 12,000 visited cells and
18,000 text characters; selected XML parts are capped at 8 MB each/24 MB total.
Corrupt or oversized archives retain the metadata-only operator-review path.
Manual sync rescans the 62-day window and upgrades metadata-only Drive Office
materials through normal per-file intake without duplicating original assets.
The generic Expected/Ready/Missing cards on the materials page describe the
recurring source-family registry, not the Drive connection or logistics gate.

The integration uses the restricted `drive.readonly` scope. While the OAuth app
is in Testing, only configured test users can authorize it and Google may
expire refresh tokens after seven days. For continuous production sync, publish
the OAuth app after completing any Google verification requirements, then
reconnect the Drive account and confirm that the sync receipt advances. An
`invalid_grant` refresh error means the account must be reconnected. Imported
files remain evidence, not automatic approval to publish claims; retain source
date, page/sheet, units, rights notes and review.

For the SSI weekly logistics gate, Drive files are recognized by filename for
`agro_ex_im`, `checkpoints`, operational wagons and Ukrzaliznytsia statistics.
Other Drive files still enter Context but do not satisfy one of those required
logistics categories. Telegram submissions continue to use their explicit
hashtags and the configured provider identity.

## Corporate Context sources

First-party corporate sources are connected to the Context monitoring layer without new paid APIs or manual API keys:

- `mn7r_blog` - MN7R Blog, `https://mn7r.com/blog`, HTML blog fallback adapter.
- `spike_spot_index_blog` - Spike Spot Index Blog, `https://spike.1d3x.com/en/blog`, internal blog adapter.
- `id3x_blog` - 1D3X Blog, `https://1d3x.com/blog`, internal blog adapter.
- `mn7r_bluesky` - MN7R Bluesky, `https://bsky.app/profile/mn7r.bsky.social`, public AT Protocol AppView adapter.
- `corporate_telegram_group_1865902381` - Corporate Telegram Group, raw peer id `1865902381`.

Recurring public source families used by scheduled Context ingestion are kept in
`src/lib/context-recurring-sources.ts`. The registry is intentionally small and
allowlisted. It powers the admin source coverage/gap summary and source-family
fixtures, while scheduled ingestion still reuses the existing Context material
pipeline.

AutoScraper-like pattern profiles for stable allowlisted HTML/table sources are
kept in `src/lib/context-pattern-learning.ts`. They are deterministic,
candidate/operator-reviewed profiles, not a generic crawler and not a source
permission expansion.

Routing:

- `#ssi` routes Telegram/manual material to SSI (`spike-ua`).
- `#1d3x` or `#id3x` routes to 1D3X.
- Both tags route the same material to both projects.
- Corporate Telegram messages without tags use keyword fallback.
- If routing is still unclear, the message is stored as `corporate-unrouted` and is not used in SSI/1D3X reports automatically.

Telegram peer id vs Bot API chat id:

- Raw peer id: `1865902381`.
- Bot API supergroup/channel candidate: `-1001865902381`.
- Set `MEDIA_HUB_CORPORATE_TELEGRAM_PEER_ID=1865902381` for raw peer/client semantics.
- Set `MEDIA_HUB_CORPORATE_TELEGRAM_CHAT_ID=-1001865902381` for Bot API webhook semantics.
- The actual Bot API chat id must be verified by adding the bot/client to the group and sending a test message.

Operational notes:

- Use `@idex_grains_bot` for Context material intake.
- The bot/client must be present in the Telegram group.
- If Bot API privacy mode hides messages, disable privacy or use explicit mentions/commands depending on Telegram setup.
- Bluesky uses public read-only AppView endpoint; no login or app password is required.
- Corporate blog posts are deduped by canonical URL, title fingerprint and content/source hash logic already used by Context.

## Production webhook setup

Real Bot API route:

```text
POST https://spike.1d3x.com/api/telegram/media-hub
```

Required environment variables:

- `MEDIA_HUB_TELEGRAM_BOT_TOKEN` - preferred dedicated token for `@idex_grains_bot`.
- `ID3X_TELEGRAM_BOT_TOKEN` - fallback token for `@idex_grains_bot`.
- `SPIKE_TELEGRAM_BOT_TOKEN` - final fallback only; keep it for SSI respondent/report bot flows.
- `INDEX_TELEGRAM_BOT_TOKEN` - shared fallback when tenant-specific bot envs are not set.
- `TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET` - Telegram webhook secret token and diagnostic endpoint bearer token.
- `MEDIA_HUB_TELEGRAM_WEBHOOK_URL` - optional explicit webhook URL, normally `https://spike.1d3x.com/api/telegram/media-hub`.
- `NEXT_PUBLIC_SITE_URL` - fallback base URL when `MEDIA_HUB_TELEGRAM_WEBHOOK_URL` is not set.
- `MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_USER_IDS` - optional allowlist; empty means all users are accepted.
- `MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_CHAT_IDS` - optional allowlist; empty means all chats are accepted.
- `TELEGRAM_CONNECTOR_READ_CHAT_IDS` - shared grammY connector read allowlist for Context/index Telegram ingestion.
- `TELEGRAM_CONNECTOR_POST_CHAT_IDS` - shared grammY connector post allowlist for outbound/autopost targets.
- `TELEGRAM_CONNECTOR_MANUAL_APPROVAL_REQUIRED` - defaults to approval required; if set to `0`, production preflight requires `TELEGRAM_CONNECTOR_POST_CHAT_IDS`.

If either allowlist is configured and the sender is not allowed, the bot replies with an access-denied message containing the sender chat id and user id.

Diagnostics through the production route, without printing secrets:

```bash
curl -sS \
  -H "Authorization: Bearer $TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET" \
  "https://spike.1d3x.com/api/telegram/media-hub?action=getMe"

curl -sS \
  -H "Authorization: Bearer $TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET" \
  "https://spike.1d3x.com/api/telegram/media-hub?action=getWebhookInfo"

curl -sS \
  -H "Authorization: Bearer $TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET" \
  "https://spike.1d3x.com/api/telegram/media-hub?action=setWebhook"
```

Direct Telegram fallback command:

```bash
curl -sS "https://api.telegram.org/bot$MEDIA_HUB_TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://spike.1d3x.com/api/telegram/media-hub",
    "secret_token": "'"$TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET"'",
    "allowed_updates": ["message", "edited_message", "channel_post", "edited_channel_post", "callback_query"]
  }'
```

## Targeted administrator PDF repair

An authenticated SSI administrator can re-upload the exact original PDF to rerun
OCR without rescanning the entire Drive archive. Repair requires a matching
content SHA-256 in the same tenant and a PDF parser receipt; a URL match alone is
not sufficient. Only extraction text, tables, facts, summary, status, and derived
assets are refreshed. The material ID, original file, source URL, reporting dates,
and report usage are retained. Telegram duplicates keep their existing behavior.
This is material normalization only, never report publication or channel sending.

## Dense-table quality gate

PDF table OCR uses structured JSON output and defaults to `gpt-4.1` on the
existing OpenAI provider. `MEDIA_HUB_PDF_TABLE_OCR_MODEL` overrides only PDF OCR;
other image summaries are unchanged. Keep empty leading header cells and every
trailing estimate column. StoneX USDA Snapshot materials have a source-family
integrity check for all four metric tables, six aligned columns, crop rows, and
explicit units. Coverage/alignment failures discard the machine table evidence
and retain `partial_visual_pending`; they never authorize publication.
