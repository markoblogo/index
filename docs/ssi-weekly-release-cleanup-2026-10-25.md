# SSI weekly release and accumulated-work review

The external checkout `/Volumes/Work/Work/index` was based on `548fb9d`.
The current remote and SSI production source were
`1a5ad12855291976be60c5a0e173523ce25b32c0`. Release work therefore uses a clean
internal clone rather than committing an older tree over current production.

## Disposition

- Exact duplicates already in current main: the world-intel reference decision,
  Cortex credential-placeholder validation and its tests/documentation, and the
  expanded SSI interview blog post. Retain upstream; no duplicate commit.
- Existing Drive routes, migrations and their integration are already upstream.
  Seven untracked files matched the current tree exactly; two Drive module/test
  variants had since evolved upstream. There were no untracked files absent
  from the release tree after the new weekly contract/doc were copied.
- The old manual-material and logistics edits are superseded by upstream Drive
  extraction/readability controls. The former daily Drive cron setting is stale
  relative to the upstream hourly importer. Do not reintroduce the older code,
  schedule or documentation.
- New useful work: the 23 October benchmark comparison, shared weekly editorial
  contract, and the three bounded safeguards with regression tests. These are
  the scoped release; no unrelated product feature or provider integration is
  added.

## Recovery

Before cleanup, the complete tracked diff and non-ignored untracked files were
saved to `/private/tmp/index-external-uncommitted-20261025.patch` and
`/private/tmp/index-external-untracked-20261025.tar.gz`. The external checkout's
accumulated work was then moved into a recoverable Git stash named
`SSI cleanup 2026-10-25: archived duplicates and older variants; weekly candidate preserved in internal release copy`.
Temporary backup paths are operator recovery aids, not runtime dependencies.
No source data, production records, external services or uploaded materials
were deleted.

## Release boundary

Narrow tests cover budget bounds, dated published comparisons, null rather than
invented zero, complete-fact selection, HTML/UTF-16 limits, existing scheduler
behavior and Telegram delivery receipts. No report-generation, site-publication
or Telegram-send endpoint is invoked for release verification. WhatsApp and
the existing preparation/publication schedule remain unchanged.
