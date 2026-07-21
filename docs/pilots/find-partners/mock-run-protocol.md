# Cortex run: find-partners (research-only mock protocol)

This is an optional, local, non-production protocol for pilot partner discovery.

Use this as a short runnable checklist in sessions where you need ranked, evidence-linked candidate hypotheses.

## Runtime mode

- `run_mode: mock-only`
- No auto-send, no outbound messaging, no product-side effects.
- All outputs are local notes only.

## Input packet

```json
{
  "run_id": "uuid",
  "run_mode": "mock-only",
  "date": "YYYY-MM-DD",
  "initiator": "owner-or-session-id",
  "query": {
    "domain": "agri-commodities|logistics|trade|investor-relations|acquisition",
    "target_role": "investor|partner|employer",
    "region": "global|EU|US|EMEA",
    "maturity": "pre-seed|pilot|scale",
    "constraints": ["research only", "no outbound actions"]
  },
  "output_target": {
    "target_count": 8,
    "min_confidence": 0.60
  },
  "approval": {
    "owner_approval_required": true,
    "can_outbound": false,
    "production_effects": false
  }
}
```

## Output artifact schema

```json
{
  "run_id": "uuid",
  "mode": "mock-only",
  "status": "succeeded|insufficient-sources|rejected",
  "query": { ... },
  "candidates": [
    {
      "name": "Company/Program Name",
      "category": "investor|partner|employer",
      "source": "https://...",
      "fit": 0.81,
      "fit_rationale": "signal + fit explanation",
      "risk": "low|medium|high",
      "outreach_readiness": "not-ready|ready",
      "next_action_hint": "manual next step"
    }
  ],
  "governance": {
    "owner": "owner-id",
    "approved_for_research": true,
    "approval_gate": "manual-review",
    "notes": "No production actions"
  },
  "validation": {
    "schema_valid": true,
    "count_target_met": true,
    "source_links_total": 8,
    "min_confidence_met": true
  }
}
```

## Session start commands (manual)

- Validate notes before/after each run:

```bash
npm run pilot:validate-run-notes -- docs/pilots/find-partners/run-notes.md
```

- Create run packet from above and fill query.
- Produce candidate list in local notes.
- Validate schema and checks.

## Acceptance checklist

- [ ] `run_mode == mock-only`
- [ ] each candidate has source + confidence [0..1]
- [ ] at least 1 evidence source per candidate
- [ ] no outbound/auto actions
- [ ] `validation.count_target_met` truthful to output size
