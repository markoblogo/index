# Index Platform Audit Completion Matrix

Last updated: 2026-07-04.

This matrix records the current evidence for the cross-project audit across
`1d3x`, `UGA Index` and `SPIKE SPOT INDEX`. It is intentionally evidence-based:
items are complete only when the repo has a repeatable gate, code/documentation
artifact, or current command output proving the claim.

## Repeatable release gate

Use one local/CI command before promoting a release:

```bash
npm run audit:release
```

The gate runs:

- `npm run audit:repo`
- `npm run lint`
- `npm run test`
- `npm run build`

Current local evidence from 2026-07-04:

- repo health audit: passed;
- lint: passed;
- tests: 42 files / 184 tests passed;
- production build: passed.

Production environment preflight remains separate because it requires real
project secrets and tenant env values:

```bash
npm run check:production-env -- --project spike-ua-index
npm run check:production-env -- --project uga-index
npm run check:production-env -- --project 1d3x
```

The repo also includes a safe dummy-env smoke gate for CI/local validation of
the checker logic:

```bash
npm run audit:production-env:ci
```

## Completion matrix

| Area | Status | Evidence | Remaining risk |
| --- | --- | --- | --- |
| Build/deploy guardrails | Implemented | tenant deploy scripts, deploy worktree guard, `.vercelignore`, CI workflow, `npm run audit:release` | real Vercel project env still must pass project preflight before deploy |
| Repo health visibility | Implemented | `scripts/audit-repo-health.mjs`, thresholds for public payload, asset size, source-file size and minimum tests | largest modules are below gate but still large enough to deserve future decomposition |
| Dependency/security baseline | Implemented | Next/ESLint upgrade, dependency overrides, `npm audit` review documented in `docs/repo-optimization-audit.md` | upstream bundled dependencies can still trigger future audit advisories |
| Cron/internal auth | Implemented | fail-closed shared auth, timing-safe comparisons, tests, `docs/admin-api-auth-matrix.md` | production depends on correct Vercel secrets |
| Internal credential disclosure | Implemented | `SPIKE_SETUP_EXPOSE_SECRET` guard for `exposeTemporaryPassword=1`, auth matrix docs | operators must not share the disclosure secret broadly |
| Public API reliability | Implemented | shared structured public responses, `no-store` on failures, ETag/conditional 304 support | runtime DB/network failures still need external monitoring |
| External calls/timeouts | Implemented | shared fetch timeout applied to OpenAI, Telegram, Resend, WhatsApp, manual-material and source-collector paths | timeout values may need tuning under production load |
| Telegram connector | Implemented | grammY connector with normalized input contract, idempotency key, read/post policy, outbound helpers, docs | production chat allowlists must be configured per tenant |
| MediaHub ingestion | Implemented | text/link/file ingestion, PDF extraction isolated behind lazy module, SSRF guardrails | Poppler previews require host-level Poppler installation |
| SSI Telegram formatting | Implemented | daily/weekly publication code uses rounded public values and `$` formatting in publication-facing paths | generated AI prose can still mention units if prompts allow it; monitor live reports |
| SSI WhatsApp worker | Implemented/documented | Railway worker docs and webhook delivery timeout path | WhatsApp Web session stability depends on Railway volume and linked device session |
| Tenant boundary checks | Implemented | project-aware production env checker validates `NEXT_PUBLIC_SITE_URL` host set; `npm run audit:production-env:ci` checks all project profiles with safe dummy env | custom domains must be added to the checker before cutover |
| Public/site documentation | Updated | deployment checklist, Telegram connector docs, MediaHub manual-material docs, repo audit notes | rendered production sites still require post-deploy smoke checks |
| CI coverage | Implemented | GitHub Actions runs `npm run audit:production-env:ci` and `npm run audit:release` | CI uses safe dummy env for preflight logic, not real production secrets |

## Not considered fully proven without production access

These checks require real external state and cannot be proven from the repo
alone:

- current Vercel production env values and deployment linkage;
- live Supabase/PostgreSQL connectivity;
- live Telegram/WhatsApp chat delivery;
- live OpenAI/Resend credentials;
- production browser smoke checks on final domains.

For those, use `docs/deployment.md` as the release runbook and run
project-specific smoke checks after deployment.
