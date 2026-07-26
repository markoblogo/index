# 1D3X Cortex Agent Flow Contract

This note adapts selected `12-factor-agents` ideas for the 1D3X Cortex layer in Index. It governs evidence/artifact flow and retrieval boundaries; it does not introduce a new agent runtime.

## Adopted principles

### Own the context window

Cortex should consume bounded, intentional evidence packs rather than broad repository or product sprawl. Context packs, artifact manifests, visibility flags, and protected/public rules define the usable context window.

### Tools as structured outputs

Cortex flows should resolve to typed artifacts:

- source manifests;
- source ledgers;
- chunk manifests;
- context packs;
- smoke results;
- promotion receipts.

The contract surface is the artifact, not an implicit loop.

### Unify execution state and business state

The retained artifact chain should explain both domain progress and flow progress. If a runtime artifact, smoke result, or promotion gate exists, it should be enough to reconstruct where the flow stands.

### Pause/resume and own control flow

Cortex must pause at:

- missing source artifact boundaries;
- protected/public visibility gates;
- promotion checks;
- human approval points for risky publication or protected-use paths.

Resume should happen from retained artifacts and receipts, not hidden loop memory.

### Compact errors into context

Artifact and promotion failures should become small, inspectable evidence:

- failed gate;
- affected artifact;
- reason;
- smallest next corrective step.

### Small, focused agents

Cortex is not an omni-agent platform. Its current useful scope is:

- evidence synthesis;
- bounded retrieval artifact preparation;
- shadow evaluation;
- promotion-readiness checks.

### Stateless reducer test

Use this as the architecture check:

- can the next step be derived from manifests, receipts, and current source state;
- can a paused pipeline resume from retained files;
- can a review reconstruct why a protected/public decision was made.

If not, the flow is too hidden.

## Boundary

This contract does not authorize:

- autonomous public publishing;
- broad uncontrolled retrieval;
- cross-project protected leakage;
- replacement of existing app/runtime logic with a framework loop.
