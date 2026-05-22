# Deployment Notes

## Vercel

The app is ready to deploy on Vercel as a Next.js App Router project.

1. Connect the GitHub repository to a Vercel project.
2. Set the development domain in Vercel project domains.
3. Configure environment variables from `.env.example`.
4. Run a production build with `npm run build`.
5. Run Prisma migration and seed against the target PostgreSQL database before production use.

## Required Environment Variables

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/uga_index?schema=public"
NEXT_PUBLIC_SITE_URL="https://index-uga.cr0pto.com"
ALLOWED_EMBED_ORIGINS="https://uga.ua https://www.uga.ua https://index-uga.cr0pto.com http://localhost:* http://127.0.0.1:*"
DEMO_AUTH_SECRET="replace-with-a-long-random-secret"
UGA_INDEX_RUNTIME_MODE="production"
RESEND_API_KEY="set-in-vercel-or-local-env"
RESPONDENT_EMAIL_CRON_SECRET="replace-with-a-long-random-cron-secret"
CRON_SECRET="same-value-for-vercel-cron"
```

`NEXT_PUBLIC_SITE_URL` is the canonical public URL used by embeds, metadata, and absolute public links. Change it when migrating from the development domain to the final domain.

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
- `vercel.json` checks the endpoint every 15 minutes on weekdays. The route sends only after the configured Kyiv time and only once per day.
- Set `CRON_SECRET` or `RESPONDENT_EMAIL_CRON_SECRET` in Vercel so the cron endpoint is protected.

## Public API

The public API exposes:

- `GET /api/health`
- `GET /api/public/latest`
- `GET /api/public/history`

Public index data routes use:

```http
Cache-Control: public, s-maxage=300, stale-while-revalidate=3600
```

Health uses `Cache-Control: no-store`.

## Production TODO

- Replace preview authentication with production auth, password setup emails and hashed credentials.
- Integrate real benchmark indicative ingestion.
- Add payment and entitlement flows for paid access.
- Add member-only analytics and access control for UGA members.
- Keep `UGA_INDEX_RUNTIME_MODE=production` enabled so database failures do not silently show mock data.
