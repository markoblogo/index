# Security Audit Notes

Last local dependency audit:

```bash
npm audit --omit=dev --json
```

Current result: 5 moderate advisories remain.

- `next` is flagged through its nested `postcss <8.5.10`.
- `prisma` is flagged through `@prisma/dev` -> `@hono/node-server <1.19.13`.

The npm suggested fixes at the time of audit point to disruptive downgrade/major
paths (`next@9.3.3`, `prisma@6.19.3`) rather than safe patch upgrades for the
current stack. Do not run `npm audit fix --force` blindly. Re-check after the
upstream packages publish a compatible patched release, then upgrade and rerun:

```bash
npm install next@latest prisma@latest @prisma/client@latest @prisma/adapter-pg@latest postcss@latest
npm audit --omit=dev
npm run lint
npm run test
npm run build
```

Additional hardening implemented:

- production cron auth now fails closed when no secret is configured;
- login, password setup, partnership contact and survey-token access are rate limited;
- global security headers are configured in `next.config.ts`;
- `/api/internal/spike-setup` is disabled in production runtime;
- `/api/health` reports tenant context, required env gaps and provider readiness.

