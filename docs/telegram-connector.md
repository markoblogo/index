# Telegram connector

Shared Telegram integration for MediaHub and index projects is based on `grammy`.

## Input contract

The connector accepts Telegram webhook updates containing:

- `message`
- `channel_post`
- `edited_message`
- `edited_channel_post`

Supported content:

- text and captions;
- links;
- forwarded messages;
- documents, photos, video, audio, voice and animation media.

Normalized material shape:

- `source: "telegram"`
- `chatId`
- `messageId`
- `author`
- `chatTitle`
- `chatType`
- `text`
- `caption`
- `media[]`
- `links[]`
- `timestamp`
- `rawUpdate`
- `idempotencyKey`

Idempotency key format:

```text
telegram:{chat_id}:{message_id}
```

## Policy

Shared policy environment variables:

- `TELEGRAM_CONNECTOR_READ_CHAT_IDS`: comma/space-separated chat IDs accepted for ingestion.
- `TELEGRAM_CONNECTOR_POST_CHAT_IDS`: comma/space-separated chat IDs allowed for posting.
- `TELEGRAM_CONNECTOR_MANUAL_APPROVAL_REQUIRED`: defaults to required; set to `0` to allow autoposting without explicit approval.

MediaHub material ingestion still also supports the existing route-level allowlists:

- `MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_CHAT_IDS`
- `MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_USER_IDS`

## Output helpers

The connector exposes wrappers around grammY `Api`:

- `sendMessage`
- `sendPhoto`
- `sendDocument`
- `copyMessage`
- `forwardMessage`

These helpers accept optional `AbortSignal` so callers can keep external Telegram calls timeout-bound.
