---
title: edge-agent-runtime
date: 2026-07-20
scope: optional-local
---

# Edge-agent execution notes (local)

This document is for local, opt-in pilots only. It is not a global mandatory stack.

## Core principle

- Use small local models for narrow tasks when portability, latency, privacy, and cost matter.
- Keep an explicit separation:
  - `System GenAI`: framework/runtime defaults.
  - `App GenAI`: developer-owned, narrow models + skills.
- For function-calling work, prefer deterministic interfaces over long, free-form prompts.

## What this applies to

- On-device research pilots in CoqPi/MN7R/other local tooling.
- UI/partner-finder/search helpers.
- Offline-first workflows where “can answer locally” is a hard requirement.

## Edge skill pattern

1. One short system prompt + concise session state.
2. Load skill metadata on demand (progressive disclosure).
3. For tool/skill calls, define a strict schema (inputs/outputs, errors, confidence).
4. Keep runtime in a bounded mode with explicit stop/timeout rules.

## Reliability by design

- Avoid “general agent” monoliths. Make each skill narrow.
- Measure before/after for:
  - success rate on function contract,
  - tool-call error class,
  - median token latency,
  - retry behavior under 2nd-party failures.
- Validate with fixed synthetic datasets for the task class.

## Development checklist

- [ ] Define exact user goal and failure modes.
- [ ] Create minimal contract for one skill and one schema.
- [ ] Add confidence threshold + hard failure output for uncertain calls.
- [ ] Gate long tasks behind explicit run notes + receipt.
- [ ] Require owner approval for any external action or prod route.
- [ ] No auto-send / no autonomous side effects.

## CoqPi fit (pilot intent)

CoqPi can pilot a `find-partners` module as **research-only**:
- input: domain + target role + geography + constraints,
- output: ranked candidate sheet (source, fit score, date, outreachability, evidence confidence),
- optional: no outbound messaging in pilot.

## Exit criteria for pilot

- >80% consistent schema adherence across 30 dry-run inputs,
- no production routing, no secrets in logs,
- explicit fallback path documented in task notes,
- one-page postmortem added to session notes.
