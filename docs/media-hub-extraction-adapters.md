# Context extraction adapter contract

Status: proposed contract with first-wave shadow pilots
Updated: 2026-07-28

This document defines a bounded extraction adapter layer for SSI and 1D3X
Context. It adapts useful patterns from common scraping/extraction tools without
installing them as default dependencies or copying a full product into Index.

The goal is better Context source normalization, evidence quality and report
input coverage. The goal is not broad scraping, anti-bot bypass, feed volume or
a new crawler platform.

## Decision

Use one small `ContextExtractionAdapter` contract. Individual runtimes may be
piloted behind it only when they fit the source policy and operator workflow.

Best reference patterns:

- MarkItDown-style file and page-to-Markdown normalization for Telegram files,
  Office/PDF attachments, simple HTML and other manual materials.
- Crawl4AI-style LLM-readable Markdown extraction for accepted public pages when
  Obscura or the existing HTML parser output is too thin.
- Crawlee-style TypeScript crawler worker later, only for allowlisted recurring
  public sources with bounded queues and receipts.

Do not adopt:

- a full Firecrawl service as a default runtime;
- browser-use as autonomous production browsing;
- Scrapy as a separate Python scraping platform;
- Scrapling, curl-impersonate, proxy rotation or stealth-oriented bypass;
- scrcpy unless a future approved Android-only source has no web/API path;
- AutoScraper as production logic before stable source patterns are proven.

## Role in the Context workflow

```txt
collect -> normalize -> generate -> validate -> publish-site -> send-channel
```

Extraction adapters live between `collect` and `normalize`.

They may improve:

- readable text from public or permissioned pages;
- markdown from files submitted through Telegram/manual intake;
- evidence metadata for QA and report validation;
- source freshness and provenance receipts.

They must not:

- publish reports;
- send Telegram/WhatsApp messages;
- change index calculations;
- bypass source restrictions;
- turn SERP snippets into evidence;
- expand source permissions by themselves.

## Adapter contract

```ts
type ContextExtractionRuntime =
  | "rss"
  | "telegram"
  | "manual_file"
  | "obscura"
  | "playwright"
  | "markitdown"
  | "crawl4ai"
  | "crawlee";

type ContextExtractionRequest = {
  tenantId: "spike-ua" | "1d3x" | "uga-ua" | "shared";
  materialId?: string;
  sourceId?: string;
  sourceUrl?: string;
  filePath?: string;
  contentType?: string;
  languageHint?: "uk" | "en" | "ru" | "mixed";
  reportWindow?: {
    kind: "daily" | "weekly" | "monthly" | "ad_hoc";
    start: string;
    end: string;
    timezone: string;
  };
  reason: "material_normalization" | "source_gap" | "claim_check" | "qa" | "operator_review";
  maxBytes?: number;
  timeoutMs?: number;
};

type ContextExtractionResult = {
  runtime: ContextExtractionRuntime;
  status: "ok" | "thin" | "blocked" | "unsupported" | "error";
  normalizedText?: string;
  markdown?: string;
  title?: string;
  finalUrl?: string;
  links?: string[];
  media?: Array<{
    url?: string;
    filePath?: string;
    contentType?: string;
    sizeBytes?: number;
  }>;
  extractedAt: string;
  freshness: "current_window" | "recent" | "stale" | "unknown";
  provenance: {
    source: "telegram" | "rss" | "manual" | "web" | "api";
    sourceId?: string;
    materialId?: string;
    sourceUrl?: string;
    contentHash?: string;
  };
  rightsRobotsNote?: string;
  warnings?: string[];
};
```

## Runtime selection

Default order for accepted Context materials:

1. Native structured intake: Telegram text/captions/files, RSS and approved APIs.
2. MarkItDown-style file normalization for PDF, DOCX, XLSX, HTML and simple
   documents submitted by editors or trusted sources.
3. Obscura for public web text, metadata, links and assets.
4. Crawl4AI-style markdown extraction when the source is accepted, public or
   permissioned, and Obscura output is too thin for report generation.
5. Playwright only for visual/JS-heavy/authenticated permissioned flows,
   screenshots, e2e or complex browser behavior.
6. Crawlee-style worker later for repeated allowlisted public sources that need
   queueing, retries, per-source caps and receipts.

Search discovery remains candidate finding only. Accepted URLs still go through
this extraction contract and the evidence validation gates.

## Safety policy

Every adapter must follow the existing Context source rules:

- use only public or explicitly permissioned sources;
- no auth bypass, paywall bypass, CAPTCHA bypass or rate-limit evasion;
- no stealth or proxy rotation as a default operating mode;
- respect robots.txt and Terms of Service where applicable;
- keep per-source byte, timeout, retry and queue limits;
- record runtime, source, fetched/extracted time, hash and warnings;
- preserve source/material boundaries and tenant boundaries;
- treat extraction output as report input, not as auto-published text.

Blocked sources fail closed. If a source blocks extraction, the correct result is
a `blocked` receipt and operator review, not a stronger bypass runtime.

## Wave plan

### First wave

Docs/contracts plus two narrow shadow pilots:

- `manual_file -> markitdown-style`: normalize Telegram/manual files into
  markdown plus provenance metadata. First implementation is shadow-only:
  TXT/MD/HTML/CSV produce markdown/text receipts, PDF delegates text extraction
  to the existing PDF adapter, and DOCX/XLSX stay metadata-only until a separate
  dependency decision.
- `web -> crawl4ai-style`: optional extraction fallback for 3-5 allowlisted SSI
  and 1D3X public pages where Obscura or existing HTML output is thin. First
  implementation is shadow-only: accepted HTML/URL input produces markdown,
  source URL, hash, warnings and operator-review metadata without installing
  Crawl4AI or changing report publishing.

Both pilots should be shadow/operator reviewed before report generation depends
on them.

First-wave implementation status:

- implemented: shared TypeScript adapter contract in
  `src/lib/context-extraction-adapters.ts`;
- implemented: manual file shadow receipts in
  `src/lib/media-hub-manual-materials.ts`;
- implemented: accepted HTML source-link shadow receipts in
  `src/lib/media-hub-manual-materials.ts`;
- implemented: derived freshness/provenance/operator-review receipts in manual
  material digests and `/admin/media-hub/materials`;
- implemented: report prompts may use only `ok` structured markdown receipts;
  `thin`, `blocked`, `unsupported` and `error` receipts stay visible for
  operator review but do not strengthen report prompts;
- not implemented by design: external MarkItDown/Crawl4AI packages, autonomous
  crawling, publishing integration or channel sending.

### Later wave

- Crawlee-style TypeScript worker for recurring allowlisted public sources.
- Source-specific extraction fixtures for recurring SSI/1D3X source families.
- Dedicated operator view for source gaps and claim support beyond the current
  manual-material receipts.
- AutoScraper-like pattern learning only for stable public tables after manual
  review proves the selector pattern.

Later-wave work should start only after the shadow receipts show repeated value
for SSI/1D3X reports. It requires a separate implementation decision and tests.

### Do not take

- heavy hosted scraper service as required infrastructure;
- autonomous browser agents for production collection;
- anti-detection tools or impersonation runtimes;
- broad crawl queues without per-source editorial purpose;
- Android scraping unless a specific approved source requires it.

## Minimal acceptance criteria for code pilots

Before any runtime enters production report generation:

- an allowlist or source policy entry names the source family;
- extraction has deterministic fixtures or saved evidence bundles;
- stale, thin, blocked and unsupported states are covered by tests;
- generated reports retain provenance/freshness receipts;
- publication and channel sending remain approval-sensitive and idempotent.
