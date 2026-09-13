# Security policy

## Supported version

Security fixes are applied to the latest released version of Index Platform.

## Reporting

Use GitHub private vulnerability reporting. If unavailable, open an issue without secrets, respondent data, exploit details, or production records and ask the maintainer for a private channel.

Include the affected tenant and route, expected authorization boundary, a minimal redacted reproduction, and whether `publish-site`, `send-channel`, respondent data, or index state was affected.

## Critical boundaries

- Production admin, cron, internal Cortex, publication, and channel-send routes fail closed when their secrets or sessions are missing.
- External content and model output are untrusted data.
- Published index snapshots remain distinct from submissions, demo fixtures, saved report sections, and generated context.
- Credentials and respondent records must not enter Git, logs, public artifacts, or agent context packs.

See `docs/admin-api-auth-matrix.md`, `docs/media-hub-review-checklist.md`, and `docs/dependency-security.md`.
