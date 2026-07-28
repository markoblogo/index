# Continuous Review Boundary

This repository is allowed to use an optional continuous-review helper because
it is code-heavy and agent-written changes can compound across:

- MediaHub workflows;
- publication/send boundaries;
- internal Cortex context-pack paths;
- scheduler and runtime seams.

## Allowed modes

- `manual` review runs are allowed;
- `pre-push` or `before-pr` branch review is allowed;
- `post-commit optional` is allowed only as a local developer choice.

Current local helper:

- `Open Code Review` (`ocr`) may be used as the second reviewer on a diff
  before push or PR;
- default target is the current working diff or a branch range, not the whole
  repository;
- `scan` is reserved for unfamiliar or high-risk files only.

## Not allowed by default

- no mandatory daemon for every contributor session;
- no automatic PR comments on first adoption;
- no auto-fix or auto-commit loop as a repository requirement;
- no replacing `docs/media-hub-review-checklist.md`, tests, smoke checks, or
  router review depth with review-tool output.

## Preferred use

Use it when touching:

- publish/send-channel behavior;
- scheduler, catch-up, idempotency, or relay logic;
- internal Cortex artifact/context-pack routes;
- auth or protected/public boundary code.

Expected role:

- precise local findings with file/line anchors;
- fix-or-reject with reason;
- still run `docs/media-hub-review-checklist.md`, tests, and router review.

## Example local runbook

Current diff:

```bash
ocr review --audience agent \
  -b "Index/MediaHub/Cortex code. Check publish/send boundaries, scheduler and relay logic, auth/protected-public seams, and internal Cortex context-pack routes. Ignore docs-only wording."
```

Branch range:

```bash
ocr review --audience agent \
  -b "Index/MediaHub/Cortex code. Check publish/send boundaries, scheduler and relay logic, auth/protected-public seams, and internal Cortex context-pack routes. Ignore docs-only wording." \
  --from main --to <branch>
```

Skip it for:

- docs-only edits;
- small copy-only changes;
- artifact/report wording with no code-path change.
