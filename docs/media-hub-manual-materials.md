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
