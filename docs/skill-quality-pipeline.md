# Skill Quality Pipeline

This is an optional local contract for improving Cortex and operator skills with bounded, validation-gated updates. It adapts the useful SkillOpt pattern without installing SkillOpt or enabling self-editing.

## Scope

Good first candidates:

- `find-partners` mock protocol;
- fallback-provider checklist;
- editorial/corpus routing notes;
- Cortex evaluation packet instructions.

Do not use this for market-data publication, respondent communication, Telegram/WhatsApp sending, production cron behavior, contracts, payments, or any external action.

## Required Artifacts

- `seed_skill`: current reviewed instruction or protocol.
- `rollout_evidence`: task ID, input, skill version, trajectory or run-note reference, verifier, score, and failure class.
- `candidate_skill`: bounded `add`, `delete`, or `replace` proposal only.
- `validation_set`: held-out or independently selected cases.
- `rejected_edit_buffer`: rejected candidates with reasons.
- `best_skill.md`: exported only after validation and owner acceptance.

## Acceptance Gate

A candidate can be accepted only when:

- it improves the held-out validation set;
- it does not weaken no-outbound, approval, privacy, or production boundaries;
- the evidence is reviewable in git or local run notes;
- the owner explicitly accepts the update.

## Local Pilot

Use the existing find-partners protocol as the first thin pilot:

```bash
npm run pilot:validate-all
```

Validation passing only proves the notes/checklists are structurally complete. It does not prove candidate quality, current source accuracy, outreach readiness, or production authority.
