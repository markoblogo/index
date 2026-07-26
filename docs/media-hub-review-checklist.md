# Context and Index review checklist

Use this checklist before merging or deploying changes to ingestion,
calculation, report generation, site publication, Telegram/WhatsApp delivery,
cron repair or manual catch-up endpoints.

For day-window operator handoff, use [`docs/media-hub-daily-status-artifact.html`](./media-hub-daily-status-artifact.html) as the standard single-file review page. It should summarize source intake, summary generation, publication readiness, known gaps, and the smallest next action.

## Router intake

Before implementation or review, classify the task with
[`docs/ship-router-contract.md`](./ship-router-contract.md):

- route kind: `create`, `evolve`, `fix`, `polish`, `remove`, or `audit`;
- route depth: `fast`, `balanced`, or `production`;
- route reviewers: only the smallest relevant set for this workflow.

Use `production` depth by default when the task can change publication state,
external-model handoff, artifact promotion, schedule repair behavior, or
protected/public data boundaries.

Expected route outcomes for MediaHub/Context intake:

- day-window review -> `review-ready artifact prepared`;
- code/docs fix -> `change verified locally`;
- blocked operational issue -> explicit blocker with the smallest next action.

## Spec check

- Which workflow states are touched: `collect`, `normalize`, `generate`,
  `validate`, `publish-site`, `send-channel`?
- Which tenant is affected: `spike-ua`, `1d3x`, `uga-ua` or shared platform?
- Which outputs change: site, Telegram, WhatsApp, admin only, API only, cron only?
- What is the expected schedule/timezone and fallback behavior?
- What language and format rules apply to the channel output?

## Standards check

- Approval-sensitive actions fail closed when secrets/session are missing.
- Channel sends have idempotency or explicit force semantics.
- Site-only and channel-send modes remain separable.
- Public index APIs and report sends do not use stale saved index tables when a
  current published snapshot exists.
- Telegram daily reports fit one message; weekly/monthly parts fit one message
  per part.
- WhatsApp daily SSI reports stay English and Ukraine-focused.

## Data and evidence check

- Index numbers come from `PublishedIndex`/public latest snapshot, not draft
  submissions or stale report JSON.
- d/d and t/t values are calculated from published history using public display
  rounding rules.
- Daily market overview uses current-period flash news or current-week updated
  facts.
- Old monthly facts are excluded from daily overview unless they became
  market-moving in the report window.
- Unsupported numeric/forecast claims are omitted or marked for review.

## Test discipline

Use TDD/red-green-refactor only for risky workflow changes, especially:

- cron scheduling and retry windows;
- idempotency and duplicate-send prevention;
- outlier exclusion and auto-publish calculation;
- Telegram/WhatsApp formatting or splitting;
- manual catch-up and repair endpoints;
- evidence validation gates.

For low-risk copy/docs changes, a narrow lint/build check is enough when needed.
