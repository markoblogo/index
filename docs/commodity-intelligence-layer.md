# Commodity Intelligence Layer Plan

Status: planning
Updated: 2026-07-06

## Purpose

Commodity Intelligence Layer is the internal AI knowledge layer for the
agro-commodity ecosystem: Index Platform, MN7R Monitor, Cr0pto and smaller
related products.

It should not be treated as a standalone chatbot or a custom LLM project first.
The first useful version is a governed knowledge, retrieval, evidence and tool
layer that lets external LLMs, including OpenAI API calls, work with current
ecosystem context without receiving the whole private project state.

## Product Principle

The internal layer owns ecosystem memory, source access, evidence, permissions
and project-specific facts. External models are used for reasoning, drafting,
summarization and transformations only when the internal layer has assembled a
bounded context pack.

This means:

- own layer first for source discovery, retrieval, facts, entity linking,
  evidence and permissions;
- OpenAI API as a reasoning/rendering layer for tasks the internal layer cannot
  complete deterministically;
- no autonomous trading, publication, respondent messaging or operational
  execution without an explicit product workflow and approval gate;
- every important answer must be traceable to evidence IDs, source snapshots or
  structured records.

## Scope

The layer should cover these resource families:

- Index Platform: UGA Index, SPIKE SPOT INDEX, 1d3x landing, MediaHub,
  analytics, respondent/publication workflows and docs.
- MN7R Monitor: market monitoring, execution context, quote/deal events,
  counterparties, internal operating notes and reporting workflows.
- Cr0pto: commodity-adjacent trade, finance or workflow context that belongs to
  the same ecosystem.
- Smaller ecosystem resources: landing pages, manuals, source lists, partner
  notes, one-off tools and future products.

New resources should be added through a source registry rather than hardcoded
into prompts.

## Non-Goals

- Train a private foundation model as the MVP.
- Replace official Index methodology, index calculation or publication locks.
- Replace MediaHub parsers with broad web cloning.
- Send secrets, raw private execution data, credentials or protected client data
  to external models.
- Build an autonomous trading or execution bot.
- Make public user-facing AI before the internal evidence and permission layer
  is validated.

## Core Domain Model

The first shared vocabulary should be small and explicit:

- `ProjectResource`: product, repo, app, landing, service, doc set or database.
- `Source`: external or internal source with ownership, cadence, rights notes and
  access mode.
- `EvidenceItem`: source-backed record with URL/path, timestamp, hash, extractor
  metadata and visibility class.
- `Commodity`: grain, oilseed, input, freight or adjacent market object.
- `MarketLocation`: origin, destination, port, route, country or region.
- `Basis`: delivery or pricing basis such as CPT Port, FCA Chop or Black Sea.
- `PriceSignal`: index value, respondent value, monitor value, bid, offer,
  benchmark or indicative reference.
- `ExecutionContext`: deal, task, route, counterparty, risk, checklist or report
  context assembled for MN7R/Cr0pto workflows.
- `ReportContext`: bounded fact pack for Index, MediaHub or partner reporting.
- `Correction`: human feedback that fixes an entity, claim, source mapping or
  interpretation.

## Storage Layers

Use separate stores for separate responsibilities:

- Postgres for structured facts, source registry, entity tables, permissions,
  sync state and audit logs.
- Object storage or filesystem archive for evidence snapshots, source bundles
  and generated context packs.
- Vector index for semantic retrieval over approved text chunks and evidence
  summaries.
- Event log for ingestion runs, corrections, model calls, context-pack creation
  and approval-sensitive actions.

Fine-tuning can be considered later only after there are stable examples,
evaluations and repeated task formats. It is not required for the first useful
versions.

## Ingestion

Initial ingestion modes:

- repo/docs sync for Index, MN7R, Cr0pto and smaller ecosystem repositories;
- database/API snapshots for published values, monitor values and safe internal
  facts;
- MediaHub source ingestion and evidence snapshots;
- manual uploads for PDFs, partner notes, reports and historical references;
- scheduled jobs for recurring updates;
- webhook or CI-triggered sync after meaningful repo changes.

Each ingestion result should write:

- source ID and resource ID;
- visibility class: `public`, `internal`, `protected` or `secret`;
- extracted text/facts;
- evidence ID;
- source timestamp;
- hash;
- extractor/runtime metadata;
- warnings and quality score.

## Permissions And Guardrails

Visibility classes:

- `public`: can be used in public reports and external model context.
- `internal`: can be used by internal agents and external models after
  minimization.
- `protected`: requires explicit workflow allowlist, redaction and audit.
- `secret`: never sent to external models or included in generated context
  packs.

Hard rules:

- no credentials, cookies, tokens or private headers in evidence snapshots;
- no raw banking, payment, personal or counterparty-sensitive fields in OpenAI
  context;
- source robots/ToS and licensing notes must be stored with source records;
- model calls must log provider, model, purpose, context-pack ID and redaction
  result;
- operational actions stay behind existing product approval gates.

## Tool And API Surface

The layer should expose a small internal API that agents and products can use:

- `register_source(resource, source, visibility, cadence, access_mode)`;
- `sync_source(source_id, reason)`;
- `search_commodity_context(query, filters)`;
- `build_market_report_context(tenant, period, topics)`;
- `build_execution_context(project, commodity, route, counterparty?, date)`;
- `compare_monitor_vs_index(commodity, basis, date_range)`;
- `find_similar_events(entity, date_range, evidence_required)`;
- `explain_evidence(evidence_id)`;
- `list_known_gaps(project_or_topic)`;
- `record_correction(target_id, correction, reviewer)`.

These APIs should return structured context packs, not raw prompt text only.

## Product Integrations

### Index And MediaHub

- Build evidence-backed market report context for daily, weekly and monthly
  MediaHub outputs.
- Compare MediaHub events against published index movements without changing
  official methodology.
- Reuse the existing MediaHub browser runtime policy: Obscura for DOM/text/assets
  extraction, Playwright for visual/auth/complex fallback.
- Keep AI analytics as a preview layer unless explicitly promoted through
  product review.

### MN7R Monitor

- Assemble execution context from monitor values, recent source evidence,
  similar historical events and Index/MediaHub signals.
- Produce checklists, deal-review briefs and risk notes through OpenAI only
  after the internal layer returns a bounded context pack.
- Keep all write/execution actions behind MN7R workflow approvals.

### Cr0pto

- Use the same source registry and entity model for commodity-adjacent market,
  trade and finance context.
- Keep any trading, transfer or external account operation out of scope until
  read-only intelligence is stable.

## Platform Options

Recommended default:

- implement the core as an ecosystem service near Index, deployable on Railway
  or similar always-on infrastructure;
- keep Vercel apps as product surfaces, not the only runtime for indexing and
  scheduled background work.

Optional accelerators:

- AnythingLLM can be used as a private admin/RAG UI for early exploration.
- Dify can be evaluated later for workflow UI, prompt management and
  observability if the custom service needs a no-code operator surface.
- AutoAgent, Open Agent Platform and Sim are better treated as research inputs
  for agent workflow design, not as the core data layer.

## Implementation Slices

### 1. Source Registry Contract

Type: docs/schema

Define resource, source, visibility, cadence, ownership, rights and ingestion
state contracts for all agro-commodity ecosystem resources.

Acceptance:

- Index, MN7R, Cr0pto and smaller resources can be registered without code
  changes.
- Each source has owner, visibility, cadence, access mode and rights notes.
- Protected and secret sources cannot be used by default model calls.

Blockers:

- final list of first MN7R/Cr0pto resources;
- decision on initial Postgres database.

### 2. Index-Local Knowledge Prototype

Type: vertical slice

Ingest Index docs, MediaHub source audits, database docs and implementation docs
into evidence items and searchable chunks.

Acceptance:

- a local command can sync selected docs;
- each chunk links to a source path and evidence ID;
- search returns citations and visibility metadata.

Blockers:

- choose local vector store for prototype.

### 3. Context Pack Builder

Type: vertical slice

Build structured context packs for report generation and analysis tasks.

Acceptance:

- `build_market_report_context` returns facts, citations, known gaps and
  freshness metadata;
- context pack output is deterministic JSON;
- OpenAI prompt rendering uses only approved fields from the pack.

Blockers:

- redaction rules for internal/protected material.

### 4. MN7R Read-Only Connector

Type: integration

Add MN7R as a read-only resource family with snapshots for monitor values,
execution notes and safe related docs.

Acceptance:

- no write operations;
- snapshots have source timestamp and visibility class;
- at least one commodity/basis can be compared with Index signals.

Blockers:

- MN7R source/API/database access contract;
- protected-data redaction policy.

### 5. Monitor vs Index Comparator

Type: product capability

Compare MN7R monitor signals, published Index values and MediaHub events for a
bounded date range.

Acceptance:

- returns matching commodities/bases, differences, evidence and confidence;
- flags missing basis/entity mappings instead of guessing;
- produces a report-ready context pack without unsupported claims.

Blockers:

- canonical entity mapping for commodity and basis names.

### 6. Execution Assistant Context

Type: product capability

Assemble execution context for MN7R/Cr0pto workflows without taking action.

Acceptance:

- returns relevant market signals, source evidence, similar events, risks and
  checklist items;
- generated output is clearly marked as internal decision support;
- no autonomous deal/trading/payment action is exposed.

Blockers:

- approval gate contract in MN7R/Cr0pto.

### 7. Corrections And Learning Loop

Type: quality system

Add human corrections for bad mappings, stale facts, missing sources and wrong
interpretations.

Acceptance:

- corrections are stored as first-class records;
- corrected entities affect future retrieval;
- recurring bad answers become eval fixtures.

Blockers:

- reviewer roles and ownership.

### 8. Evaluation And Observability

Type: quality system

Track retrieval quality, source freshness, redaction, model-call inputs and
answer evidence coverage.

Acceptance:

- every model-assisted answer has a context-pack ID;
- eval fixtures cover at least report context, monitor/index comparison and
  execution context;
- dashboards or logs show stale sources, missing evidence and redaction events.

Blockers:

- logging destination and retention policy.

## MVP Acceptance Criteria

The first MVP is complete when:

- at least Index docs/MediaHub and one MN7R resource family are registered;
- search can answer ecosystem questions with evidence IDs;
- one report context pack can be built for Index/MediaHub;
- one monitor-vs-index comparison works for a real commodity/basis;
- OpenAI receives only a bounded, redacted context pack;
- protected/secret data is excluded by default;
- every answer can show source paths, timestamps and known gaps;
- no write, trading, publishing or messaging action is available from the layer.

## Open Decisions

- Host the service inside the Index repo first or create a separate
  `commodity-intelligence` service repository.
- Use existing product Postgres or a separate database for source registry,
  vectors and audit logs.
- Choose vector storage for MVP: Postgres/pgvector, a managed vector database or
  local prototype storage.
- Decide which MN7R and Cr0pto resources are safe for the first read-only sync.
- Decide whether AnythingLLM is useful as an operator UI during discovery.
- Define the first three high-value use cases:
  market report context, monitor-vs-index comparison and execution context are
  the recommended starting set.
