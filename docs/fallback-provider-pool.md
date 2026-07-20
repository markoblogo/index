---
title: fallback-provider-pool
scope: local-notes
---

# Fallback-provider pool (session checklist)

Use this only as a local reference list when model/provider choice is blocked and no stable primary provider is available.

## 1) Candidate scan (quick)

- [ ] Copy task blocker into notes: `provider_candidate`? `provider_class`?
- [ ] Map candidate to one of:
  - `free-api` (e.g., openrouter, google-ai-studio, huggingface, cloudflare-workers-ai, vercel-ai-gateway)
  - `trial-credit` (e.g., firework, nebius, baseten, ai21, upstage, modal)
  - `local` (existing local toolchain)
- [ ] Verify no mandatory production route is bypassing approval.

## 2) Validation checks (before use)

- [ ] Region/geography requirements checked (phone/geo restrictions noted).
- [ ] Signup/access prerequisites checked (API key/project onboarding exists).
- [ ] Quota + rate limits checked against expected workload.
- [ ] Data privacy / training / retention policy checked (not unknown).
- [ ] Estimated cost/canary usage checked (even for “free” tiers).

## 3) Decision record (required)

- [ ] `fallback_provider`: `_____`
- [ ] `selection_rationale`: `_____`
- [ ] `fallback_reason`: `_____` (quota fail / outage / denied route / experiment)
- [ ] `tested_at`: `_____` (UTC)
- [ ] `owner_approval`: `yes/no` (if production-bound)
- [ ] `expected_exit`: `_____` (what condition returns to primary)

## 4) Run mode

- [ ] Use as `potential` only until `declared -> probed -> confirmed` is recorded.
- [ ] No auto-route.
- [ ] If failure occurs, capture:
  - error class,
  - evidence link,
  - recovery attempt.

## 5) Closure

- [ ] Update notes as `CONFIRMED`/`DEPRECATED`/`SUPERSEDED` with evidence.
- [ ] If used in task receipt/runbook, attach this checklist artifact by filename.

