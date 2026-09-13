# Contributing

Index Platform is an active multi-tenant production codebase. Small, evidence-backed fixes are welcome.

1. Read `AGENTS.md`, `docs/product-context.md`, and the owning domain contract.
2. Name the affected tenant and workflow states: `collect`, `normalize`, `generate`, `validate`, `publish-site`, `send-channel`.
3. Keep demo, private, respondent, and published data boundaries explicit.
4. Add focused regression coverage for calculation, auth, schedule, publication, and delivery changes.
5. Run `npm run audit:all` before requesting review.

Do not include credentials, production exports, respondent data, or third-party copyrighted material. A passing build does not prove deployment, live values, or channel delivery; report those checks separately.
