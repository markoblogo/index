# Media Hub manual materials

Manual materials let the team push links and files into the next Media Hub report without editing code or waiting for a crawler.

## Telegram intake

Use the 1D3X Media Hub bot (`@idex_grains_bot`) for links and files. The respondent bot is not used for this flow.

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

Images and screenshots are accepted only as unsupported metadata until OCR is added. Prefer PDF, table files, or links.

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
- recent-materials audit with tenant, status, source type, received time and report usage.

## Processing rules

- The project tag is required. Messages without `#ssi` or `#1d3x` are ignored and the bot asks for a project tag.
- Multiple links in one message are ingested one by one.
- A file and caption are processed together, so tags in the caption are enough.
- Duplicates are skipped by content hash or canonical URL for the same reporting window.
- Unknown links are stored as source candidates or manual materials depending on tag/context.
- Materials are used by Media Hub report generation through the persisted `MediaHubManualMaterial` table.

## Corporate Media Hub sources

First-party corporate sources are connected to the Media Hub monitoring layer without new paid APIs or manual API keys:

- `mn7r_blog` - MN7R Blog, `https://mn7r.com/blog`, HTML blog fallback adapter.
- `spike_spot_index_blog` - Spike Spot Index Blog, `https://spike.1d3x.com/en/blog`, internal blog adapter.
- `id3x_blog` - 1D3X Blog, `https://1d3x.com/blog`, internal blog adapter.
- `mn7r_bluesky` - MN7R Bluesky, `https://bsky.app/profile/mn7r.bsky.social`, public AT Protocol AppView adapter.
- `corporate_telegram_group_1865902381` - Corporate Telegram Group, raw peer id `1865902381`.

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

- Use `@idex_grains_bot` for Media Hub material intake.
- The bot/client must be present in the Telegram group.
- If Bot API privacy mode hides messages, disable privacy or use explicit mentions/commands depending on Telegram setup.
- Bluesky uses public read-only AppView endpoint; no login or app password is required.
- Corporate blog posts are deduped by canonical URL, title fingerprint and content/source hash logic already used by Media Hub.
