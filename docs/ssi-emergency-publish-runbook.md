# SSI emergency publish runbook

Use this only when the normal 19:00 Europe/Kyiv SSI publish flow did not create
the current site snapshot or did not send the daily channel report.

## Standard fallback

- Publish all configured SSI positions for the requested date.
- If a position has no valid same-day respondent or admin price, carry forward
  the latest previously published value for that position.
- A carried-forward position has `usedCount=0`, `rawCount=0` when there were no
  same-day inputs, and public day-to-day change is `0`.
- If same-day inputs exist but all are filtered as outliers, carry forward the
  previous published value and include excluded input reasons in the receipt.

## One-step protected catch-up

Endpoint:

```text
POST /api/admin/spike-daily-catchup?force=1&replace=1&mediaHub=1&date=YYYY-MM-DD
Authorization: Bearer <SPIKE_DAILY_CATCHUP_SECRET>
```

Expected response:

- `indices.published` is greater than `0` when a site snapshot was created or
  replaced.
- `indices.receipt.status` is `current` when every configured SSI position has a
  current-date published site value.
- `indices.mediaHub.telegram.status` is `published` or `already_sent` when the
  Telegram daily report is complete.
- If `indices.receipt.status` is `missing`, do not treat Telegram/WhatsApp as a
  valid publication; inspect `missingPositionKeys`.

## Normal schedule

The cron route remains the default path:

```text
GET /api/cron/spike-auto-publish
```

It is valid only during the 19:00 Europe/Kyiv publish window unless explicitly
forced by a protected catch-up. Retry windows should use the same underlying
`autoPublishSpikeDailyIndices` behavior, including carry-forward fallback.
