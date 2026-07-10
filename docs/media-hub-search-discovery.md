# Context search discovery policy

Context may use OpenSERP-style search collection as an optional discovery layer
for SSI and 1D3X report sourcing. It must not become the primary scraper,
parser, source monitor or evidence store.

## Purpose

Search discovery is for finding candidate public URLs when existing sources are
thin or when editors need fresh flash-news context for a report window.

Useful cases:

- current-week Ukraine grain/oilseed/export/logistics news discovery;
- cross-checking whether a reported market signal appears in public sources;
- finding candidate links for editor review;
- finding image/source candidates for non-sensitive public context.

Non-goals:

- cloning search engines;
- bypassing source restrictions;
- treating SERP snippets as verified evidence;
- replacing RSS, Telegram/manual intake, APIs, Obscura extraction or Context
  parsers.

## Role split

```txt
known sources / Telegram / RSS / APIs
        -> Context parser/extractor = structured data
        -> optional search discovery = candidate URLs only
        -> Obscura/Playwright/static snapshot = evidence/repro artifact
        -> report generation + evidence validation
```

Search discovery returns candidates. The canonical report input remains the
structured data produced by Context extraction and validation.

## OpenSERP-style contract

If an OpenSERP-like service is used, keep it optional and disabled by default.
Use a self-hosted or explicitly approved endpoint only.

Suggested request shape:

```ts
type MediaHubSearchDiscoveryRequest = {
  query: string;
  tenantId: "spike-ua" | "1d3x";
  reportKind: "daily" | "weekly" | "monthly";
  periodStartDate: string;
  periodEndDate: string;
  engines: Array<"bing" | "duckduckgo" | "google" | "yandex" | "baidu">;
  language?: string;
  region?: string;
  dateFilter?: "day" | "week" | "month";
  maxResults?: number;
  reason: "source_gap" | "freshness_check" | "editor_review" | "claim_check";
};
```

Suggested result metadata:

```ts
type MediaHubSearchDiscoveryCandidate = {
  query: string;
  engine: string;
  rank: number;
  title: string;
  url: string;
  snippet?: string;
  serpFeatures?: string[];
  fetchedAt: string;
  language?: string;
  region?: string;
  dateFilter?: string;
  extractionStatus: "candidate" | "accepted" | "rejected" | "extracted";
  contentHash?: string;
  rightsRobotsNote?: string;
};
```

## Safety rules

- Use only public or explicitly permissioned sources.
- Do not bypass authentication, paywalls, CAPTCHAs, rate limits or explicit
  source blocks.
- Do not enable stealth or proxy rotation to evade blocking.
- Respect robots.txt and Terms of Service where applicable.
- Keep query volume low, bounded and tenant-specific.
- Use allowlists/denylists for source domains where possible.
- Store the query, engine, region, language, fetched timestamp, rank and URL for
  audit.
- Treat snippets and SERP features as discovery metadata, not verified report
  evidence.

## Runtime placement

- `wget`/static source snapshots are evidence bundles, not discovery.
- Obscura is the preferred extraction runtime after a candidate URL is accepted.
- Playwright/Chromium is fallback for JS-heavy pages, screenshots, e2e and
  complex visual verification.
- Context parser/extractor remains the only source of structured report data.

## Implementation posture

Do not add OpenSERP or a similar tool as a hard dependency. If implemented,
start with an admin/manual workflow:

1. editor or operator runs a bounded search for one report window;
2. candidates are reviewed or filtered by source policy;
3. accepted URLs are extracted through Context runtime policy;
4. extracted evidence, not SERP snippets, is used in reports.

Only consider scheduled discovery after the manual workflow proves useful and
safe.
