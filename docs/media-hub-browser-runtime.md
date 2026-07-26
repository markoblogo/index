# Context browser runtime policy

Context browser work should prefer a lightweight extraction runtime before
using full Chrome.

## Default rule

Use Obscura as the preferred runtime for Context browser tasks that need:

- JavaScript-rendered DOM extraction;
- page title, text, links, assets, canonical URL and metadata extraction;
- high-volume public page fetches;
- source-candidate validation;
- RSS/blog fallback extraction;
- public monitoring where screenshots and layout are not required.

Keep Playwright/Chromium for:

- e2e tests in `tests/e2e`;
- screenshots, visual regression, layout, canvas, media, PDF print and paint-dependent tasks;
- complex authenticated sessions;
- pages that depend on browser APIs Obscura does not implement;
- fallback when Obscura extraction fails or returns thin content.

Do not replace Playwright test configuration with Obscura. They solve different
jobs: Obscura is the Context extraction runtime; Playwright/Chromium is the
browser verification runtime.

## Runtime selection contract

Future Context browser adapters should route through one small interface:

```ts
type MediaHubBrowserRuntime = "obscura" | "playwright";

type MediaHubBrowserExtractRequest = {
  url: string;
  waitUntil?: "load" | "domcontentloaded" | "networkidle0";
  timeoutMs?: number;
  dump?: "text" | "html" | "links" | "assets" | "metadata";
};

type MediaHubBrowserExtractResult = {
  runtime: MediaHubBrowserRuntime;
  url: string;
  finalUrl?: string;
  title?: string;
  text?: string;
  html?: string;
  links?: string[];
  assets?: string[];
  status?: number;
  error?: string;
};
```

Selection order:

1. Try Obscura for extraction-only work.
2. Retry once with tighter timeout or simpler dump mode if the failure is transient.
3. Fall back to Playwright/Chromium only when:
   - extraction is empty/thin;
   - required APIs are missing;
   - visual or authenticated behavior is part of the task;
   - the source has been allowlisted for Chromium fallback.
4. Record the runtime used in item metadata so report evidence can be audited.

Suggested metadata fields:

```json
{
  "browser_runtime": "obscura",
  "browser_runtime_fallback": false,
  "browser_runtime_reason": "js_dom_text_extraction"
}
```

## Source snapshot mode

Context may also use a `source snapshot mode` for reproducible evidence. This
mode is not the primary parser, scraper or source monitor. It creates an
offline evidence bundle so editors, QA and report reviewers can inspect what a
public source looked like at collection time.

Situational dashboards and layer/variant monitors are documented separately in
[`situational-monitoring-contract.md`](situational-monitoring-contract.md).
Browser extraction and snapshots provide evidence; monitor views only summarize
approved data, freshness, provenance and readiness.

Search/SERP discovery is a separate candidate-finding layer and is documented in
[`media-hub-search-discovery.md`](media-hub-search-discovery.md). Discovery
finds candidate URLs; snapshot mode preserves accepted source evidence.

Use source snapshots for:

- public or permissioned source pages that may change after collection;
- evidence bundles for report QA, claim support and citation review;
- small pages or narrow site sections where offline viewing is useful;
- source debugging when extracted text and stored metadata are not enough.

Do not use source snapshots for:

- authentication bypass;
- paywall bypass;
- CAPTCHA/rate-limit/block circumvention;
- stealth access to sources that reject collection;
- broad site cloning unrelated to a specific Context source item.

### Tool roles

- `wget`/static snapshot: preferred for simple public HTML pages and small page
  sections. The expected pattern is wget-style saving of HTML, CSS, JS, images
  and fonts, link conversion for local viewing, and archive packaging.
- Obscura: preferred for lightweight JavaScript-rendered DOM/text/assets
  extraction when a static snapshot is too thin.
- Playwright/Chromium: fallback for screenshots, e2e, complex JS behavior,
  authenticated permissioned sessions and visual verification.
- Context parser/extractor: remains the source of structured data used by
  reports. A snapshot is only an evidence/reproducibility artifact.

### Snapshot contract

Source snapshot mode must be explicit and bounded:

```ts
type MediaHubSourceSnapshotRequest = {
  url: string;
  sourceId?: string;
  materialId?: string;
  mode: "static" | "obscura" | "playwright";
  maxBytes?: number;
  maxDepth?: number;
  includeAssets?: boolean;
  reason: "evidence" | "qa" | "citation_review" | "source_debug";
};

type MediaHubSourceSnapshotResult = {
  archivePath: string;
  sourceUrl: string;
  fetchedAt: string;
  tool: "wget" | "obscura" | "playwright";
  sizeBytes: number;
  sha256: string;
  rightsRobotsNote: string;
  entrypointPath?: string;
  warnings?: string[];
};
```

Required metadata:

- source URL;
- `fetched_at`;
- tool/runtime;
- archive size;
- content hash;
- rights/robots/ToS note;
- source/material identifiers when available.

Safety rules:

- Use only public or explicitly permissioned sources.
- Respect robots.txt and source ToS where applicable.
- Keep recursion shallow and bounded.
- Do not preserve or expose secrets, cookies, credentials or private headers in
  archives.
- Store snapshots as evidence artifacts; do not treat them as canonical report
  data.

## Environment variables

Use these names when implementing the adapter:

- `MEDIA_HUB_BROWSER_RUNTIME=obscura` - preferred production/default mode.
- `MEDIA_HUB_BROWSER_FALLBACK_RUNTIME=playwright` - fallback for unsupported pages.
- `MEDIA_HUB_OBSCURA_BIN` - optional absolute path to the `obscura` binary.
- `MEDIA_HUB_OBSCURA_ENDPOINT` - optional CDP endpoint, for example `ws://127.0.0.1:9222/devtools/browser`.
- `MEDIA_HUB_BROWSER_TIMEOUT_MS` - per-page extraction timeout.
- `MEDIA_HUB_BROWSER_ALLOW_STEALTH=0|1` - default `0`; enable only for approved public-source monitoring.

Do not require Obscura for local development unless the current task touches
browser extraction. RSS, Telegram, manual materials and existing tests must keep
working without it.

## Safety and source policy

- Use Obscura only for public pages or approved first-party/partner sources.
- Do not use stealth mode to bypass authentication, paywalls, rate limits,
  CAPTCHAs or explicit blocks.
- Keep per-source timeouts and bounded retries.
- Respect Context source allowlists and editorial source policy.
- Store enough evidence to explain why a fallback happened.

## Local cleanup note

For local agent/browser hygiene, keep:

- system browsers for human work;
- Playwright-managed Chromium only for tests;
- Obscura as the lightweight Context extraction binary;
- no extra Chrome/Chromium installs unless a project explicitly needs them.

Before deleting a browser installation, check whether it is managed by
Playwright, Chrome for Testing, Homebrew, a package manager or a human-facing app.
