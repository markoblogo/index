# Index Platform agent instructions

Use this repo-local guidance together with the global Codex instructions.

## Product Context

Read `docs/product-context.md` before public positioning, partnership copy, SEO, analytics, or recurring product-review work. It is evidence and claim-boundary context, not authority to publish, send a channel message, change a calculation, or make financial claims. Keep recurring work report-only or proposal-first until an explicit human gate settles it.

## Product decision discipline

For ambiguous Index/MediaHub product behavior, use a lightweight
`grill-with-docs` pattern before coding:

- restate the affected workflow state: `collect`, `normalize`, `generate`,
  `validate`, `publish-site`, `send-channel`;
- point to the relevant repo doc or code owner surface;
- ask only the blocking question if the product decision cannot be inferred;
- record the final rule in the smallest durable doc update.

## Domain language

Use [`docs/media-hub-domain-model.md`](docs/media-hub-domain-model.md) terms in
comments, docs, commits and user-facing explanations. Do not blur these pairs:

- `source` vs `material`;
- `report` vs `send-channel`;
- `publish-site` vs Telegram/WhatsApp sending;
- current `latestData` vs saved report `indexSection`;
- approval-sensitive production action vs local render/test.

## Standards-vs-spec review gate

Before changing ingestion, calculation, report generation, cron repair, manual
catch-up, MediaHub publishing or Telegram/WhatsApp delivery, run a small mental
review using [`docs/media-hub-review-checklist.md`](docs/media-hub-review-checklist.md):

- `Spec`: tenant, channel, schedule, language, output mode and approval behavior;
- `Standards`: idempotency, fail-closed auth, no stale public data, no duplicate sends;
- `Data`: published snapshot, history, evidence freshness and claim support;
- `Tests`: add regression tests for risky workflow changes.

Use TDD/red-green-refactor only for risky workflow changes. Do not add new local
skills or process files unless the repo lacks a durable place for the rule.

## Motion review for frontend animation

For any UI work touching animations/transitions/scroll effects:
- prefer transform properties (`x`, `y`, `scale`, `rotation`, `opacity`, `autoAlpha`) over layout properties (`top`, `left`, `width`, `height`) where possible;
- add `prefers-reduced-motion: reduce` fallback and verify motion can be reduced or skipped;
- ensure cleanup on unmount/re-render (`ctx.revert()`, `kill()`, clear callbacks/timers);
- avoid global selectors; scope animations to component roots;
- keep motion intent explicit (`initial -> animate -> exit`) and skip decorative motion without purpose.
