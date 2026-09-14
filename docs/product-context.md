# Product Context

Last reviewed: 2026-09-14

## Product

Index Platform is a shared Next.js/TypeScript platform for Ukrainian commodity market products. SPIKE SPOT INDEX owns the active calculation, publication, respondent, analytics, and Context workflows. UGA Index currently provides a transparent read-only view of four compatible SPIKE public positions without a separate production database. 1d3x remains the umbrella and partnership surface.

## Audience And Jobs

- Institutional partners, market participants, respondents, and users who need understandable commodity-index publication and context.
- Operators need governed collection, normalization, calculation, publication, distribution, and evidence-backed context without mixing demo, stale, or unapproved data.

## Conversion Action

The public 1d3x surface is a partnership entry point. Product communication should make the relevant index, methodology, context, or partnership path understandable without implying investment advice, a guarantee, or unreviewed data availability.

## Proof And Limits

- Tenant configuration, published values, methodology, legal pages, and code are the source for product claims.
- Public context and analytics must distinguish current published data from saved reports, source materials, and synthetic/demo fixtures.
- UGA must identify SPIKE as its data source and must not imply a separate UGA calculation, respondent panel, or publication process while read-through mode is active.
- Cortex is a bounded evidence/context layer, not an autonomous decision-maker or live trading system.
- Do not claim regulatory status, market coverage, accuracy, performance, partner participation, or live-data freshness without owner-confirmed and current evidence.

## Language And Claim Boundaries

- Use tenant-specific commodity and basis terminology; preserve `source` vs `material`, `report` vs `send-channel`, and `publish-site` vs channel delivery.
- Do not frame published indices as financial advice or a promise of future price performance.
- Do not expose respondent, tenant, user, or operational data in public marketing artifacts.

## Source Surfaces

- `README.md`, `AGENTS.md`, tenant config/content, methodology and legal pages, and `docs/media-hub-domain-model.md`.
- Publication, analytics, and context implementation surfaces identified in the repository documentation.

## Maintenance

Refresh after tenant, methodology, publication, partnership, or Cortex-boundary changes. Recurring content, SEO, analytics, or partnership reviews must retain evidence and stop at a human approval gate before external effects.

Repository instructions and human preferences remain separate from product data. agentsgen owns repo-local agent context; ID owns optional policy-filtered human context; SET may export reviewable workflow plans; ABVX-OS may consume bounded evidence. None of these companions grants Index publication or channel-send authority.
