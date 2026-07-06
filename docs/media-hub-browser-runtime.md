# MediaHub browser runtime policy

MediaHub browser work should prefer a lightweight extraction runtime before
using full Chrome.

## Default rule

Use Obscura as the preferred runtime for MediaHub browser tasks that need:

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
jobs: Obscura is the MediaHub extraction runtime; Playwright/Chromium is the
browser verification runtime.

## Runtime selection contract

Future MediaHub browser adapters should route through one small interface:

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
- Respect MediaHub source allowlists and editorial source policy.
- Store enough evidence to explain why a fallback happened.

## Local cleanup note

For local agent/browser hygiene, keep:

- system browsers for human work;
- Playwright-managed Chromium only for tests;
- Obscura as the lightweight MediaHub extraction binary;
- no extra Chrome/Chromium installs unless a project explicitly needs them.

Before deleting a browser installation, check whether it is managed by
Playwright, Chrome for Testing, Homebrew, a package manager or a human-facing app.
