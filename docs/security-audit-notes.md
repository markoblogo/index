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

Codex Security Deep Scan artifact:

- `docs/security-deep-scan-2026-06-01.md`
- `docs/security-deep-scan-2026-06-01.html`

Codex Security Follow-up Scan artifact:

- `docs/security-follow-up-scan-2026-06-01.md`
- `docs/security-follow-up-scan-2026-06-01.html`

The full Deep Scan ran with explicit subagent authorization. The reportable
findings from that scan have been remediated and validated by the follow-up scan.
Before production rollout, run the new migrations against a staging copy because
the composite tenant/index ownership foreign keys intentionally fail on
historical rows with inconsistent ownership.
