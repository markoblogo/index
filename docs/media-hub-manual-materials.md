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
- DOCX/XLSX are accepted and stored, but exact binary text/table parsing remains
  metadata-only until a separate dependency decision is approved.
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
