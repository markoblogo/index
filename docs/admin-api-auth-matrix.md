# Admin and internal API authorization matrix

All admin/internal endpoints must fail closed when their required secret/session
is missing. Secrets are never logged or returned.

| Endpoint | Method | Authorization |
| --- | --- | --- |
| `/api/admin/media-hub/materials` | `GET`, `POST` | Admin session via `requireDemoRole("admin")` |
| `/api/admin/media-hub/catchup` | `POST` | Bearer `MEDIA_HUB_REPAIR_SECRET` or `MEDIA_HUB_SMOKE_TEST_SECRET` |
| `/api/admin/media-hub/site-catchup` | `POST` | Bearer `MEDIA_HUB_REPAIR_SECRET` or `MEDIA_HUB_SMOKE_TEST_SECRET` |
| `/api/admin/media-hub/repair` | `POST` | Bearer `MEDIA_HUB_REPAIR_SECRET` or `MEDIA_HUB_SMOKE_TEST_SECRET` |
| `/api/admin/media-hub/smoke-test` | `POST` | Bearer `MEDIA_HUB_SMOKE_TEST_SECRET` |
| `/api/admin/media-hub/whatsapp-catchup` | `POST` | Bearer `SPIKE_DAILY_CATCHUP_SECRET` or `CRON_SECRET` |
| `/api/admin/spike-daily-catchup` | `POST` | Admin session or Bearer `SPIKE_DAILY_CATCHUP_SECRET` |
| `/api/admin/telegram-target-smoke` | `POST` | Bearer `TELEGRAM_TARGET_SMOKE_SECRET` or `MEDIA_HUB_SMOKE_TEST_SECRET` |
| `/api/internal/cortex/context-pack` | `POST` | Bearer `CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET` |
| `/api/internal/cortex/context-packs` | `GET` | Bearer `CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET` |
| `/api/internal/cortex/ecosystem-evidence` | `GET`, `POST` | Bearer `CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET` |
| `/api/internal/cortex/governance-receipts` | `GET` | Bearer `CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET` |
| `/api/internal/cortex/sgr-lite-checkpoints` | `GET` | Bearer `CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET` |
| `/api/internal/spike-setup` | `POST` | Bearer `RESPONDENT_TELEGRAM_CRON_SECRET` or `CRON_SECRET` |

Additional guard:

- `/api/internal/spike-setup?exposeTemporaryPassword=1` requires
  `x-spike-setup-expose-secret: <SPIKE_SETUP_EXPOSE_SECRET>` in addition to the
  internal bearer token. This prevents routine cron/internal credentials from
  disclosing temporary passwords.

Operational rule:

- Prefer route-specific secrets over broad `CRON_SECRET` for manual catch-up,
  smoke and setup operations.
