# Vercel Agent Skills Pilot

Date: 2026-07-19

## Scope

Read-only production-metric and source review using pinned local copies of:

- `vercel-optimize`;
- `vercel-react-best-practices`;
- `vercel-composition-patterns`.

The pilot used the linked Vercel project and a 14-day observability window. Raw metrics, project IDs, deployment IDs, costs, and generated investigation packets remain outside Git.

## Result

- The default bounded run investigated six route candidates plus one platform candidate.
- All seven correctly ended as no-change or insufficient-evidence outcomes; no code or Vercel configuration change was justified.
- The collector correctly rejected shared caching for the authenticated report-source cron route.
- Locale and Media Hub routes are intentionally dynamic or query-dependent; existing reusable reads already use bounded caches and parallel loading where source evidence supports it.
- Analytics already starts independent operations before joining them, matching the relevant React waterfall guidance.
- A small number of Media Hub latency spikes should be compared with database and deployment logs before any route change.
- React and composition review found no justified refactor. Publication/readiness booleans are domain authorization state, not presentation variants.

## Follow-up boundary

- Keep the pilot report-only until route-local upstream timing evidence exists.
- Do not enable Bot Protection or change WAF rules without route-level bot evidence, a Log-mode stage, and allowlist review.
- Do not widen the next run beyond the default candidate budget unless a named performance investigation requires it.

## Provenance

Pilot source: `vercel-labs/agent-skills` at commit `f8a72b9603728bb92a217a879b7e62e43ad76c81`.
