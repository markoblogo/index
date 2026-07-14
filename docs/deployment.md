# Deployment Notes

## Vercel

The app is ready to deploy on Vercel as a Next.js App Router project.

### Project → domain mapping (current live setup)

| Vercel Project | Primary Domain | Alias / Redirect Domain | Tenant runtime |
| --- | --- | --- | --- |
| `1d3x` | `https://1d3x.com` | `www.1d3x.com` | `1d3x` |
| `uga-index` | `https://index.uga.ua` | `https://uga.1d3x.com`, `https://index-uga.cr0pto.com` | `uga-ua` |
| `spike-ua-index` | `https://spike.1d3x.com` | `https://spike-ua.cr0pto.com` | `spike-ua` |

### How to deploy safely (important)

0. Confirm CI is green on `main` or on the PR branch. The GitHub Actions
   workflow runs `npm run audit:all`.

1. Confirm the active Vercel project before deploy:

```bash
cat .vercel/project.json
```

2. Link explicitly to the target project (only when needed):

```bash
vercel link --yes --project <project-name> --scope abvcreative
```

3. Run the project-specific production environment preflight against the env
   you are about to use:

```bash
npm run check:production-env -- --project spike-ua-index
npm run check:production-env -- --project uga-index
npm run check:production-env -- --project 1d3x
```

The preflight does not print secret values. It fails closed for missing cron,
webhook and WhatsApp secrets, and warns when Context Telegram ingestion has no
read allowlist. If Telegram autopost manual approval is disabled with
`TELEGRAM_CONNECTOR_MANUAL_APPROVAL_REQUIRED=0`, an explicit
`TELEGRAM_CONNECTOR_POST_CHAT_IDS` allowlist is required.
It also validates that `NEXT_PUBLIC_SITE_URL` belongs to the expected Vercel
project domain set, preventing `1d3x`, SSI and UGA deploys from shipping with a
cross-tenant public URL.

For the `1d3x` Cortex runtime, the preflight additionally requires
`CORTEX_INTERNAL_API_SECRET`, `OPENAI_API_KEY`, and either
`CORTEX_CHUNK_MANIFEST_URL` or `CORTEX_CHUNK_MANIFEST_PATH`. After deployment,
verify the protected runtime readiness route with the configured bearer token:

```bash
curl -sS https://1d3x.com/api/internal/cortex/health \
  -H "Authorization: Bearer $CORTEX_INTERNAL_API_SECRET"
```

The response must have HTTP `200`, `"ok": true`, a configured assistant
provider and readable manifest totals. The endpoint does not return the token,
OpenAI key or chunk contents.

For the internal SPIKE setup route, `exposeTemporaryPassword=1` is protected by
an additional `x-spike-setup-expose-secret` header matching
`SPIKE_SETUP_EXPOSE_SECRET`; cron/internal bearer access alone is intentionally
not enough to disclose temporary credentials.

4. Deploy to production of the linked project:

```bash
vercel --prod
```

5. Verify the production URL points to the expected deployment:

```bash
vercel inspect https://<current-deployment-url>
```

6. Validate by cURL against the tenant route:

```bash
curl -L https://spike-ua.cr0pto.com/en/about | rg -o "Spot-Market Handbook|Download PDF"
```

7. In browser, always hard-reload with cache bypass (`Ctrl/Cmd+Shift+R`) after release.

### Common failure mode to avoid

- If `cat .vercel/project.json` points to `1d3x`, a deploy will go to the wrong
  production tenant.
- `spike-ua` work should never be deployed from the `1d3x` project mapping.

1. Connect the GitHub repository to a Vercel project.
2. Set the development domain in Vercel project domains.
3. Configure environment variables from `.env.example`.
4. Run a production build with `npm run build`.
5. Run Prisma migration and seed against the target PostgreSQL database before production use.

## Required Environment Variables

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/uga_index?schema=public"
NEXT_PUBLIC_SITE_URL="https://index.uga.ua"
ALLOWED_EMBED_ORIGINS="https://uga.ua https://www.uga.ua https://index.uga.ua https://uga.1d3x.com https://index-uga.cr0pto.com http://localhost:* http://127.0.0.1:*"
DEMO_AUTH_SECRET="replace-with-a-long-random-secret"
UGA_INDEX_RUNTIME_MODE="production"
RESEND_API_KEY="set-in-vercel-or-local-env"
UGA_PASSWORD_RESET_SENDER="UGA Index <security@uga.ua>"
UGA_PASSWORD_RESET_REPLY_TO="inbox@uga.ua"
RESPONDENT_EMAIL_CRON_SECRET="replace-with-a-long-random-cron-secret"
CRON_SECRET="same-value-for-vercel-cron"
```

`NEXT_PUBLIC_SITE_URL` is the canonical public URL used by embeds, metadata, and absolute public links. Change it when migrating from the development domain to the final domain.

`UGA_PASSWORD_RESET_SENDER` and `UGA_PASSWORD_RESET_REPLY_TO` control the sender identity for admin/respondent password reset emails. If they are omitted, the app falls back to `UGA Index <onboarding@resend.dev>` and `inbox@uga.ua`.

`ALLOWED_EMBED_ORIGINS` controls the `frame-ancestors` policy for `/embed/*`. Add the final domain or partner domains here during migration.

## Database

For a fresh PostgreSQL database:

```bash
npm install
npm run db:generate
npx prisma db push
npm run db:seed
```

For production, prefer a migration workflow once the schema is stable:

```bash
npx prisma migrate deploy
npm run db:seed
```

The seed creates commodities, CPT UA Black Sea basis, respondent directory records, contacts, login accounts, notification settings, respondent submissions, benchmark indicatives, and published indices.

The repository includes a baseline migration at `prisma/migrations/20260522113000_production_foundation/migration.sql` for fresh PostgreSQL databases. If a database was previously created with `prisma db push`, baseline it before switching to `migrate deploy`.

## Respondent Email Delivery

Respondent survey requests are sent through Resend.

- Store the Resend key only in `RESEND_API_KEY`; never commit the real key.
- Configure sender, reply-to admin email, subject, survey URL and template in `/admin/respondents`.
- Manual sending is available from `/admin/respondents`.
- Scheduled sending is handled by `GET /api/cron/respondent-emails`.
- `vercel.json` runs the endpoint once per weekday at 14:30 UTC. The route still checks the configured Kyiv time and sends at most once per day.
- Set `CRON_SECRET` or `RESPONDENT_EMAIL_CRON_SECRET` in Vercel so the cron endpoint is protected.

## Public API

The public API exposes:

- `GET /api/health`
- `GET /api/public/latest`
- `GET /api/public/history`

Public index data routes use:

```http
Cache-Control: public, s-maxage=300, stale-while-revalidate=3600
ETag: W/"..."
```

`/api/public/fx-rates` uses a longer `s-maxage=21600` cache. Public JSON
responses support conditional `If-None-Match` requests and return `304` when
the stable `data` payload has not changed. Health and public data failures use
`Cache-Control: no-store`.

## Production release checklist

Before promoting a change for any index tenant:

1. Confirm CI is green or run the same local gates:

```bash
npm run audit:all
```

2. Run the project-specific environment preflight for the target Vercel project:

```bash
npm run check:production-env -- --project spike-ua-index
npm run check:production-env -- --project uga-index
npm run check:production-env -- --project 1d3x
```

3. Confirm the runtime/URL boundary:

- SSI must use `NEXT_PUBLIC_SITE_URL=https://spike.1d3x.com` or an approved SSI alias.
- UGA must use `NEXT_PUBLIC_SITE_URL=https://index.uga.ua` or an approved UGA alias.
- 1D3X must use `NEXT_PUBLIC_SITE_URL=https://1d3x.com` or `https://www.1d3x.com`.

4. Confirm messaging safety:

- Telegram ingestion should be restricted by `TELEGRAM_CONNECTOR_READ_CHAT_IDS` or route-level Context allowlists.
- Telegram autoposting without manual approval requires `TELEGRAM_CONNECTOR_POST_CHAT_IDS`.
- SSI WhatsApp posting requires the Railway worker URL/secret and a persistent WhatsApp session volume.

5. Confirm privileged admin/internal routes:

- Internal cron/admin routes require the shared internal bearer/cron secret.
- Temporary SPIKE credential disclosure additionally requires `SPIKE_SETUP_EXPOSE_SECRET`.
- Public API routes should return cache headers and ETags; failure responses must remain `no-store`.

Current known follow-ups:

- Continue shrinking the largest source modules tracked by `npm run audit:repo`.
- Keep Poppler installed only where PDF previews are required; otherwise the lazy fallback path is acceptable.
- Keep `UGA_INDEX_RUNTIME_MODE=production` enabled in UGA production so database failures do not silently show mock data.
