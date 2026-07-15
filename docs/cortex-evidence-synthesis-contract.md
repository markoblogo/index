# Cortex Evidence Synthesis Contract

Status: active Cortex contract; GBrain remains a reference only
Updated: 2026-07-15

This contract adapts the useful evidence and gap-analysis pattern from
[garrytan/gbrain](https://github.com/garrytan/gbrain) without installing or
embedding GBrain in the agro-commodity runtime.

The current implementation now has the required first substrate:
`CortexEcosystemEvidenceLedger` records registered SSI, MediaHub and MN7R
observations with provenance, visibility and known gaps; the context-pack
builder merges eligible events with repository retrieval. Cited synthesis,
claim-level gap analysis and approval-gated proposals remain later layers.

## Required Flow

```text
source-scoped evidence
  -> retrieval
  -> cited synthesis
  -> known gaps and staleness
  -> approval-gated proposal
```

Every cross-source synthesis packet must preserve:

- source and project scope for every evidence item;
- provenance, capture time, freshness and visibility;
- citations for material claims in the synthesis;
- explicit `knownGaps` and `staleness` sections;
- separation of `observed`, `derived`, `assumed` and `recommended`;
- proposal/audit gate for every write, publication or state-changing path.

## Ownership

This remains a Cortex contract. Product adapters contribute approved sources;
Cortex performs bounded retrieval, citation assembly, gap reporting and packet
creation. OpenAI/API calls receive only the resulting bounded context.

## Isolation Rules

- Keep project and tenant scope attached to evidence and retrieval queries.
- Do not expose one product's protected sources through another product's
  assistant surface without an explicit allowlist and audit record.
- Do not use GBrain as an MCP, Telegram, email or filesystem connector for
  MN7R/Cortex.
- Do not add a second memory runtime while the current Cortex artifact and
  ledger path remains sufficient.

## Future Evaluation Harness

When Cortex has real cross-source context-pack fixtures, evaluate this pattern
in an isolated harness against citation completeness, project isolation,
known-gap detection, staleness reporting and proposal-gate compliance. A
GBrain-like implementation may be considered then; it is not a production
dependency or a current deployment target.
