# Security Audit Notes

Last local dependency audit:

```bash
npm audit --omit=dev
```

Current result: `found 0 vulnerabilities`.

The previous moderate advisories through nested `postcss` and
`@hono/node-server` were resolved with pinned compatible overrides. Do not run
`npm audit fix --force` blindly. For future dependency upgrades, rerun:

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

Local security scan artifact:

- `docs/security-scan-2026-06-01.md`
- `docs/security-scan-2026-06-01.html`

The full Codex Security Deep Scan with subagents remains a release gate and
requires explicit authorization before it can be run in this thread.
