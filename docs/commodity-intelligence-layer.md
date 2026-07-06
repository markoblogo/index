# 1D3X Cortex Plan

Status: planning + first runtime slices
Updated: 2026-07-06

## Purpose

1D3X Cortex is the internal AI knowledge layer for the agro-commodity
ecosystem: Index Platform, MN7R Monitor, Cr0pto and smaller related products.

It should not be treated as a standalone chatbot or a custom LLM project first.
The first useful version is a governed knowledge, retrieval, evidence and tool
layer that lets external LLMs, including OpenAI API calls, work with current
ecosystem context without receiving the whole private project state.

## Product Principle

1D3X Cortex owns ecosystem memory, source access, evidence, permissions
and project-specific facts. External models are used for reasoning, drafting,
summarization and transformations only when the internal layer has assembled a
bounded context pack.

This means:

- own layer first for source discovery, retrieval, facts, entity linking,
  evidence and permissions;
- OpenAI API as a reasoning/rendering layer for tasks the internal layer cannot
  complete deterministically;
- no autonomous trading, publication, respondent messaging or operational
  execution outside explicit product workflows, tool contracts and approval
  gates;
- every important answer must be traceable to evidence IDs, source snapshots or
  structured records.

## Coverage Requirement

Cortex should study and continuously track the whole agro-commodity ecosystem,
not only MediaHub feeds or report inputs. The target memory surface includes:

- static public site content across 1D3X/SSI, MN7R, Cr0pto and smaller related
  ecosystem sites;
- dynamic public and protected product data where a product-specific workflow
  explicitly allows ingestion;
- report archives, index archives, source snapshots, generated artifacts and
  historical bundles;
- manuals, public guides, books, playbooks, uploaded PDFs and product teaching
  materials, with edition/version and freshness metadata;
- repository code, tests, schemas, route contracts, agent docs and architecture
  notes for active and paused products;
- development plans, ADRs, TODOs, release notes and recommendations, separated
  from implemented behavior;
- product actions, operator actions, assistant/tool proposals, outcomes and
  correction events after redaction and allowlisting.

The point is not to push all raw material into an LLM. Cortex should build a
versioned, searchable, permission-aware memory layer from these sources, then
assemble bounded context packs for OpenAI/API model calls, internal assistants,
reports, product analysis and future recommendation workflows.

## Lifecycle

1D3X Cortex should cover all actions inside the agro-commodity products over
time, but autonomy is a staged capability, not the default starting mode.

1. `observe-learn`: read ecosystem data, build evidence memory, learn workflows,
   assemble bounded context packs and expose known gaps.
2. `assist-propose`: work inside EXE assistant, Monitor AI chat, MediaHub report
   flows and future Cr0pto assistants together with external LLMs such as OpenAI
   API for answers, analysis, drafts and recommendations.
3. `approval-gated-act`: prepare tool proposals that execute only through each
   product's auth, exact confirmation, idempotency, audit and rollback paths.
4. `bounded-autonomy`: enable autonomous behavior per narrow capability only
   after evals, monitoring, permissions and product-specific safety gates prove
   readiness.

## Current Implementation Surface

The first code contract lives in:

```txt
src/lib/commodity-intelligence-layer.ts
src/lib/commodity-intelligence-layer.test.ts
src/lib/media-hub-report-prompts.ts
src/lib/media-hub-llm-report.ts
```

It defines the initial resource registry, source registry, lifecycle/action-mode
contract, visibility model and context-pack builder. This is intentionally
small: it gives Index, MN7R and Cr0pto one shared contract before ingestion
jobs, vector storage, API routes or operator UI are added.

The first runtime slice is active in MediaHub report generation: before OpenAI
drafting, `generateMediaHubLlmReports` builds a 1D3X Cortex report context pack
from published index values, `@idex_grains_bot` / manual materials and monitored
MediaHub feeds. The prompt includes that approved context pack with evidence IDs,
source IDs, exclusions and known gaps.

The first persistence slice is also active for MediaHub reports:
`MediaHubReport.contentJson.llm.cortexContextPack` stores the exact Cortex
snapshot used for the report. This makes each SSI/1D3X report auditable: the
saved artifact shows which Telegram/API/index evidence reached OpenAI, which
sources were excluded and which known gaps existed at generation time.

The first public product surface is also active: Index home and MediaHub pages
now describe 1D3X Cortex as the market-context memory behind evidence-backed
MediaHub reports. Public copy stays bounded: Cortex is presented as source
memory, audit and gated assistant context, not as an autonomous public bot.

The first ingestion artifact is available through `npm run cortex:source-scan`.
It scans approved local repository roots into `.cortex/source-manifest.json`
with source kind, owner project, visibility, size, SHA-256 hash and stable
evidence IDs. This is intentionally a manifest stage: it proves coverage and
freshness without pushing raw content into a model or database.
Use `--preset=ecosystem-local` to scan the local Index + MN7R + Cr0pto roots
when present, or pass explicit `--root=owner:rootId:/path:visibility` values.

## Scope

1D3X Cortex should cover these resource families:

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
- `ActionEvent`: approved product/operator/assistant action with actor scope,
  redaction status, outcome, correction metadata and audit ID.
- `DevelopmentSignal`: roadmap, TODO, ADR, release note, issue, code-review
  finding or recommendation, clearly marked as planned/proposed/implemented.
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

Current implementation note: MediaHub report context packs are persisted twice:
inside the generated `MediaHubReport.contentJson` artifact and in
`CortexContextPackLedger`, a separate DB-backed audit ledger keyed by tenant,
entity, purpose, source IDs, visibility and pack hash. A broader retrieval and
corrections API can build on that ledger when non-report actions need stable
cross-product memory.

Fine-tuning can be considered later only after there are stable examples,
evaluations and repeated task formats. It is not required for the first useful
versions.

## Ingestion

Initial ingestion modes:

- repo/docs sync for Index, MN7R, Cr0pto and smaller ecosystem repositories;
- database/API snapshots for published values, monitor values and safe internal
  facts;
- MediaHub source ingestion and evidence snapshots;
- 1D3X MediaHub Telegram bot intake through `@idex_grains_bot`, including
  `#ssi`, `#1d3x`, `#daily`, `#weekly` and `#monthly` routing for SSI and 1D3X
  reports;
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

Current read surface:

- `GET /api/internal/cortex/context-packs`
- auth: Bearer `CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET`
- filters: `tenantId`, `entityType`, `purpose`, `reportKind`, `limit`
- default response: ledger metadata, source IDs, metrics, target and pack hash
- `includePack=1`: includes full context-pack JSON for authorized internal
  agent/product reads

This endpoint is the first stable read surface for 1D3X Cortex memory. It is
internal-only and should be used by MN7R/Cr0pto/assistant integrations as a
bounded context source, not as a public API.

## Product Integrations

### Index And MediaHub

- Build evidence-backed market report context for daily, weekly and monthly
  MediaHub outputs.
- Present Cortex publicly inside Index/MediaHub as the evidence and context
  memory behind reports, while keeping raw context packs and ledger reads
  internal.
- Register public/dynamic site snapshots, manuals/books, archives, codebase
  snapshots, development plans and action events as first-class Cortex sources.
- Treat 1D3X/SSI Telegram bot materials as first-class report evidence: Cortex
  assembles the context pack from bot materials, monitored sources, index values
  and known gaps before OpenAI API is used for SSI/1D3X report drafting.
- Compare MediaHub events against published index movements without changing
  official methodology.
- Reuse the existing MediaHub browser runtime policy: Obscura for DOM/text/assets
  extraction, Playwright for visual/auth/complex fallback.
- Keep AI analytics as a preview layer unless explicitly promoted through
  product review.

### MN7R Monitor

- Work inside EXE assistant, Monitor AI chat and related protected assistant
  surfaces as the shared context/tool layer.
- Assemble execution context from monitor values, recent source evidence,
  similar historical events and Index/MediaHub signals.
- Produce checklists, deal-review briefs, risk notes and internal draft text
  through OpenAI only after Cortex returns a bounded, redacted context pack.
- Allow internal tool proposals only through MN7R auth, scope, audit,
  idempotency and approval gates.

### Cr0pto

- Use the same source registry and entity model for commodity-adjacent market,
  trade and finance context.
- Treat Cr0pto as the indexed trading, document verification and settlement
  consumer of Cortex context, not as the first place where the knowledge layer
  lives.
- Work inside future Cr0pto assistant surfaces as context, analysis and draft
  infrastructure.
- Keep trading, transfer, token, wallet and clearing operations outside Cortex
  automation unless a future regulated workflow adds explicit tool contracts,
  approvals and audit gates.

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
- Source kinds cover public/dynamic site snapshots, archives, manuals/books,
  codebase snapshots, development plans and action/event logs.
- Protected and secret sources cannot be used by default model calls.

Blockers:

- final list of first MN7R/Cr0pto resources;
- decision on initial Postgres database.

### 2. Index-Local Knowledge Prototype

Type: vertical slice

Ingest Index docs, MediaHub source audits, database docs and implementation docs
into evidence items and searchable chunks.

Acceptance:

- `npm run cortex:source-scan` writes a local source manifest under `.cortex/`;
- `--preset=ecosystem-local` can inventory Index, MN7R and Cr0pto local roots
  into one manifest;
- each manifest entry links to a source path, source kind, SHA-256 hash and
  evidence ID;
- repo-local secrets and generated folders are excluded from the manifest;
- a later chunk/vector step can use the manifest as its source-of-truth input;
- search returns citations and visibility metadata.

Blockers:

- choose local vector store for prototype.

### 3. Context Pack Builder

Type: vertical slice

Build structured context packs for report generation and analysis tasks.

Acceptance:

- `build_market_report_context` returns facts, citations, known gaps and
  freshness metadata;
- Telegram materials from `@idex_grains_bot` can be included by SSI/1D3X tag
  and report kind;
- context pack output is deterministic JSON;
- OpenAI prompt rendering uses only approved fields from the pack.

Current implementation:

- `buildCortexMarketReportContextPack` assembles the report pack;
- `buildMediaHubReportPrompt` renders the approved Cortex pack into the report
  prompt;
- `generateMediaHubLlmReports` returns the pack together with OpenAI generation
  metadata.
- `buildSnapshotReportContent` persists the pack in
  `contentJson.llm.cortexContextPack` for the generated MediaHub report.
- `persistCortexContextPack` writes the same pack to
  `CortexContextPackLedger` as the first cross-product Cortex memory ledger.
- `listCortexContextPackRecords` and
  `/api/internal/cortex/context-packs` expose the first internal read surface
  for that ledger.

Blockers:

- redaction rules for internal/protected material.

### 4. MN7R Read-Only Connector

Type: integration

Add MN7R as a governed resource family with protected assistant context for
monitor values, execution notes and safe related docs.

Acceptance:

- no direct write operations from Cortex;
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
- no autonomous deal/trading/payment action is exposed in the first version;
  tool proposals are reviewable and approval-gated, with bounded autonomy
  handled later per capability.

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
- Decide which MN7R and Cr0pto resources are safe for the first observe/learn
  sync.
- Decide whether AnythingLLM is useful as an operator UI during discovery.
- Define the first three high-value use cases:
  market report context, monitor-vs-index comparison and execution context are
  the recommended starting set.
