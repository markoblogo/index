# Known Limitations and Production Next Steps

## Current Limitations

- Auth is still a preview allowlist/session implementation. Production needs hashed passwords, password setup emails and hardened sessions.
- Local development can still use mock fallback without `DATABASE_URL`. Production should set `UGA_INDEX_RUNTIME_MODE=production`.
- Respondent notification settings, Resend delivery and tokenized survey links are implemented. The remaining production gap is replacing visible temporary passwords with one-time setup links.
- Benchmark indicatives are seeded/reference values. Live ingestion, reconciliation, retries and provider monitoring are still required.
- Paid analytics/API entitlements are represented in UI copy but not enforced by a billing/access system.
- Correction governance after publication still needs a formal approval/versioning workflow.
- The methodology PDF can be replaced with the final signed document when approved.

## Production Next Steps

1. Implement production auth with hashed credentials, temporary password setup links and audited account changes.
2. Replace `db push` operations with committed Prisma migrations.
3. Replace visible temporary passwords with one-time password setup links.
4. Add live benchmark indicative ingestion and monitoring.
5. Add admin audit views and export.
6. Add paid analytics/API entitlement checks.
7. Add operational alerts for insufficient respondent baskets and failed publication runs.
8. Complete legal review for final production policies and subscription/API terms.

## Readiness Notes

- `npm run lint`, `npm run test` and `npm run build` should pass before every deploy.
- Production deployments require `DATABASE_URL`.
- Public embeds require correct `NEXT_PUBLIC_SITE_URL` and `ALLOWED_EMBED_ORIGINS`.
