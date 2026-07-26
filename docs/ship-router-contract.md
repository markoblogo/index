# Ship Router Contract

Purpose: define a compact front-door routing contract for engineering work in Index and the 1D3X Cortex layer.

This is not a runtime, not a command parser, and not an autonomous publish workflow. It is a decision contract for choosing the right work shape and verification depth before implementation.

## Front door

When a task arrives, classify it first:

- `create` — add a new feature, route, report flow, or artifact path;
- `evolve` — extend or reshape an existing feature;
- `fix` — diagnose and correct a broken or misleading behavior;
- `polish` — improve UX, copy, presentation, or review ergonomics without changing core behavior;
- `remove` — delete a route, artifact path, or obsolete surface;
- `audit` — inspect a broad area for drift, risk, or quality issues.

Announce the chosen route before implementation when the task is non-trivial.

## Depth selection

Choose one depth:

- `fast` — narrow, low-risk, single-surface edits with obvious verification;
- `balanced` — normal product/code changes affecting one or more related surfaces;
- `production` — changes touching auth, secrets, internal routes, publication flow, external messaging, artifact promotion, data integrity, or protected/private evidence boundaries.

When in doubt, go one level deeper rather than shallower.

## Reviewer taxonomy

Use the smallest relevant review set:

- `security/authz` — admin/internal route access, secrets, bearer paths, SSRF/unsafe fetch, tenant or visibility leaks;
- `contracts` — route params, typed payloads, context-pack shape, artifact schema, producer/consumer drift;
- `data integrity` — publication state, derived numbers, migration/backfill assumptions, stale artifact use;
- `concurrency/idempotency` — duplicate sends, catch-up replay, scheduler overlap, artifact overwrite risk;
- `performance/runtime` — heavy routes, unnecessary rebuild cost, slow report flows, oversized artifact paths;
- `accessibility/UX` — operator review clarity, handoff readability, bounded UI polish;
- `client/server boundary` — server-only logic leaking into client paths, protected data surfacing in public artifacts.

Not every task needs every reviewer class.

## Run-don't-claim

Do not equate:

- typecheck with runtime proof;
- build success with route/report behavior;
- generated artifact existence with correct artifact contents;
- local implementation with publish readiness.

Verification must match the claim.

## Terminal boundary

Default terminal state is one of:

- `locally verified candidate ready`;
- `review-ready artifact prepared`;
- `diagnosed with exact blocker`;
- `partial with explicit unresolved risk`.

This contract does not grant commit, push, publication, Telegram/WhatsApp sending, artifact promotion, or production state mutation by itself.

## Index/Cortex specifics

- MediaHub and Context work should prefer artifact-backed review over informal status prose.
- Cortex work should preserve visibility boundaries (`public` / `internal` / `protected`) and approval notes in every route decision.
- Any task touching external-model handoff, artifact promotion, or production delivery is `production` depth by default.

## Non-goals

- no automatic command surface like `/ship`;
- no hidden reviewer fan-out;
- no bypass of existing approval, publication, or ownership boundaries.
