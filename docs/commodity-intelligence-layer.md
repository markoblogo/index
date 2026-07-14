# 1D3X Cortex

Status: active internal product, staged observe/learn rollout
Updated: 2026-07-14

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

## Ownership Boundary

1D3X Cortex is the owner of the shared AI layer for the agro-commodity
ecosystem. Product assistants are Cortex surfaces, not separate competing AI
products:

- Cortex owns context assembly, source/memory retrieval, model routing,
  workforce packets, hypothesis diversity, evaluation records and the
  OpenAI/API handoff;
- MN7R owns the EXE Assistant surface, brokerage domain rules, auth/scope,
  deterministic checks and approval-gated action tools;
- Index owns SSI/1D3X, Context and MediaHub data, report workflows and the
  Cortex runtime/artifact service;
- Cropto owns indexed trading, document, settlement and wallet/clearing domain
  controls while consuming Cortex context through reviewed contracts.

The EXE Assistant in MN7R is therefore the MN7R domain interface to Cortex. It
may display and request Cortex work, but must not create a parallel memory,
model-routing or autonomous-action layer outside the Cortex contract.

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
not only Context feeds or report inputs. The target memory surface includes:

- static public site content across 1D3X/SSI, MN7R, Cr0pto and smaller related
  ecosystem sites;
- dynamic public and protected product data where a product-specific workflow
  explicitly allows ingestion;
- raw Context monitoring outputs before digesting: fetched items, source
  metadata, scores, tags, rejection reasons and processing state;
- SSI raw respondent/admin/imported inputs, calculation runs, basket inclusion
  decisions, revisions and publication locks, alongside published index values;
- MN7R broker/operator/user inputs, quote/deal events and correlation features
  between Monitor, SSI and Context;
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
2. `assist-propose`: work inside EXE assistant, Monitor AI chat, Context report
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

The first runtime slice is active in Context report generation: before OpenAI
drafting, `generateMediaHubLlmReports` builds a 1D3X Cortex report context pack
from published index values, protected SSI DB evidence, `@idex_grains_bot` /
manual materials and monitored Context feeds. The prompt includes the approved
portion of that context pack with evidence IDs, source IDs, exclusions and known
gaps.

The first DB-backed raw-data slice is active for SSI report context assembly:
`buildCortexIndexDbEvidence` reads `PriceSubmission`, `IndexCalculation`,
`IndexCalculationItem` and `PublishedIndex` rows for the report period. It emits
protected Cortex evidence for raw respondent/admin/MN7R imported inputs and the
calculation ledger. Respondent references are redacted before they enter Cortex
evidence, while `MN7R_MONITOR` remains visible as a system source. These
protected records are available for Cortex analysis and audit, but remain
excluded from external OpenAI prompt context unless a future workflow explicitly
enables protected evidence after redaction/approval.

The first raw Context monitoring slice is active inside the report snapshots:
RSS/monitoring feed items now carry source URL, relevance score and processing
state (`accepted_after_scoring` or fallback/manual state). Cortex emits those
records as protected `mediahub-raw-monitoring-items` evidence before the
approved report-summary layer. This gives Cortex visibility into source
selection and scoring.

The first persisted Context monitoring ledger is also active:
`MediaHubMonitoringLedger` stores accepted, fallback, low-relevance,
capacity-discarded and unsafe-rejected RSS/runtime candidates with source URL,
score, tags and rejection reason. `buildCortexMediaHubMonitoringLedgerEvidence`
loads those records into Cortex report context as protected evidence, so
rejected/discarded candidates are auditable without leaking them into external
OpenAI prompts by default.

The first persistence slice is also active for Context reports:
`MediaHubReport.contentJson.llm.cortexContextPack` stores the exact Cortex
snapshot used for the report. This makes each SSI/1D3X report auditable: the
saved artifact shows which Telegram/API/index evidence reached OpenAI, which
raw/protected sources were excluded and which known gaps existed at generation
time.

The first public product surface is also active: Index home and Context pages
now describe 1D3X Cortex as the market-context memory behind evidence-backed
Context reports. Public copy stays bounded: Cortex is presented as source
memory, audit and gated assistant context, not as an autonomous public bot.

The first durable market-workforce slice is also active as an internal
contract: `CortexMarketWorkforceLedger` stores versioned decision packets
append-only by task, correlation ID and packet hash. The protected endpoint
`/api/internal/cortex/workforce` accepts a validated packet and lists prior
versions for internal review. It does not execute, publish or approve actions;
it records the packet and its human/officer state for later bounded workflows.

The first ingestion artifact is available through `npm run cortex:source-scan`.
It scans approved local repository roots into `.cortex/source-manifest.json`
with source kind, owner project, visibility, size, SHA-256 hash and stable
evidence IDs. This is intentionally a manifest stage: it proves coverage and
freshness without pushing raw content into a model or database.
The reproducible local artifact flow is documented in
[`docs/cortex-artifact-pipeline.md`](./cortex-artifact-pipeline.md).
Use `--preset=ecosystem-local` to scan the local Index + MN7R + Cr0pto roots
when present, or pass explicit `--root=owner:rootId:/path:visibility` values.
`npm run cortex:source-ingest` turns that snapshot into a source ledger by
comparing the previous and current manifests, recording added, changed, removed
and unchanged sources, and creating a chunking queue for the next RAG stage.
`npm run cortex:source-chunk` converts queued text/code/docs into a local chunk
manifest. Use `-- --all` for the first full seed. Unsupported binaries such as
PDFs/images stay represented as skipped source results until dedicated
extractors are added.
`npm run cortex:mn7r-snapshot-chunk -- --snapshot=.cortex/mn7r-source-snapshot.json --base=.cortex/chunk-manifest.json --out=.cortex/chunk-manifest.with-mn7r.json`
converts the protected MN7R source snapshot into Cortex chunks and can merge it
with the base memory artifact. The snapshot must already be redacted by MN7R;
Index treats every MN7R raw-source chunk as protected and relies on context-pack
`allowProtected` gating before any external model sees it.
`npm run cortex:cropto-source-chunk -- --manifest=.cortex/cropto-source-manifest.json --base=.cortex/chunk-manifest.json --out=.cortex/chunk-manifest.with-cropto.json`
normalizes the Cr0pto source manifest into the same chunk pipeline, preserving
Cr0pto source IDs, visibility and source kinds for retrieval and context-pack
assembly.
`npm run cortex:memory-search -- --query="..."` is the first local retrieval
surface over those chunks. It supports owner, source-kind and visibility
filters and excludes `secret` chunks by default.
`npm run cortex:context-pack -- --query="..." --purpose=...` turns retrieval
results into a bounded context-pack artifact with approved evidence, excluded
evidence, known gaps and model-ready text. Protected chunks require
`--allow-protected`; secret chunks remain outside the default retrieval scope.
The same builder is exposed to ecosystem products through
`POST /api/internal/cortex/context-pack`, authorized by
`CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET`. The endpoint reads the
server-side chunk artifact from `CORTEX_CHUNK_MANIFEST_URL`,
`CORTEX_CHUNK_MANIFEST_PATH`, or the default `.cortex/chunk-manifest.json`.
Remote artifacts can use `CORTEX_CHUNK_MANIFEST_BEARER_TOKEN`. The endpoint
does not accept client-controlled filesystem paths or artifact URLs.

The Cortex-owned assistant gateway is `POST /api/internal/cortex/assistant`.
It accepts only a bounded, project-scoped adapter request, retrieves approved
memory, merges it with adapter context, selects `CORTEX_ASSISTANT_MODEL` and
performs the OpenAI handoff. MN7R EXE Assistant, role-scoped Manual AI chat and
the public-safe landing chat are consumers; they do not send raw database state
or choose the external model themselves. Public requests are restricted to
public evidence. If the gateway is unavailable, MN7R falls back to its
deterministic answer paths.
Protected EXE/manual handoffs reserve `1800` output tokens by default, while
public handoffs use `900`; set `CORTEX_ASSISTANT_MAX_OUTPUT_TOKENS` only when a
bounded production override is needed.
Each successful handoff returns and, when a database is configured, persists a
correlation record with `requestId`, `contextPackId`, provider/model, evidence
count and known-gap count. The audit record contains no question or raw
context.

Production readiness is checked through the protected
`GET /api/internal/cortex/health` endpoint. It verifies that the runtime chunk
manifest is readable and that the OpenAI provider is configured, then returns
only manifest metadata and readiness status. It does not perform a model call
or expose secrets. Use the same `CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET`
as the other internal Cortex routes.

## Scope

1D3X Cortex should cover these resource families:

- Index Platform: UGA Index, SPIKE SPOT INDEX, 1d3x landing, Context,
  analytics, raw respondent inputs, index calculations, publication locks,
  respondent/publication workflows and docs.
- MN7R Monitor: market monitoring, execution context, quote/deal events,
  broker/operator/user inputs, counterparties, internal operating notes,
  correlation signals and reporting workflows.
- Cr0pto: commodity-adjacent trade, finance or workflow context that belongs to
  the same ecosystem.
- Smaller ecosystem resources: landing pages, manuals, source lists, partner
  notes, one-off tools and future products.

New resources should be added through a source registry rather than hardcoded
into prompts.

## Non-Goals

- Train a private foundation model as the MVP.
- Replace official Index methodology, index calculation or publication locks.
- Replace Context parsers with broad web cloning.
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
- `ReportContext`: bounded fact pack for Index, Context or partner reporting.
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

Current implementation note: Context report context packs are persisted twice:
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
- database/API snapshots for published values, raw respondent/admin/imported
  inputs, calculation ledgers, monitor values and safe internal facts;
- Context source ingestion, raw monitoring item snapshots and evidence
  snapshots;
- 1D3X Context Telegram bot intake through `@idex_grains_bot`, including
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

### Index And Context

- Build evidence-backed market report context for daily, weekly and monthly
  Context outputs.
- Present Cortex publicly inside Index/Context as the evidence and context
  memory behind reports, while keeping raw context packs and ledger reads
  internal.
- Register public/dynamic site snapshots, manuals/books, archives, codebase
  snapshots, development plans and action events as first-class Cortex sources.
- Treat 1D3X/SSI Telegram bot materials as first-class report evidence: Cortex
  assembles the context pack from bot materials, monitored sources, index values
  and known gaps before OpenAI API is used for SSI/1D3X report drafting.
- Analyze raw Context monitoring items as well as report-ready summaries, so
  relevance scoring, rejection reasons and source drift are visible to Cortex.
- Compare Context events against published index movements, raw respondent
  inputs and calculation ledgers without changing official methodology.
- Reuse the existing Context browser runtime policy: Obscura for DOM/text/assets
  extraction, Playwright for visual/auth/complex fallback.
- Keep AI analytics as a preview layer unless explicitly promoted through
  product review.

### MN7R Monitor

- Work inside EXE assistant, Monitor AI chat and related protected assistant
  surfaces as the shared context/tool layer.
- Assemble execution context from monitor values, recent source evidence,
  broker/operator/user inputs, similar historical events, Index raw/calculated
  data and Context signals.
- Build protected correlation features across MN7R inputs, SSI respondent
  inputs, published index moves and Context events before exposing only
  redacted/approved context to external models.
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

Ingest Index docs, Context source audits, database docs and implementation docs
into evidence items and searchable chunks.

Acceptance:

- `npm run cortex:source-scan` writes a local source manifest under `.cortex/`;
- `--preset=ecosystem-local` can inventory Index, MN7R and Cr0pto local roots
  into one manifest;
- `npm run cortex:source-ingest` writes a source ledger with added, changed,
  removed and unchanged counts plus a chunking queue;
- `npm run cortex:source-chunk` writes a local chunk manifest from the queue,
  and `-- --all` can seed chunks across all supported text/code/doc sources;
- `npm run cortex:mn7r-snapshot-chunk` converts the protected MN7R source
  snapshot into chunks and can merge those chunks with the base memory manifest;
- `npm run cortex:cropto-source-chunk` converts the Cr0pto source manifest into
  standard chunks and can merge those chunks with the base memory manifest;
- `npm run cortex:memory-search` can retrieve matching chunks with snippets and
  metadata filters before a vector database is added;
- `npm run cortex:context-pack` can assemble bounded evidence from local memory
  for internal assistants or external model calls with explicit protected-data
  gating;
- `POST /api/internal/cortex/context-pack` can return the same bounded pack to
  authorized ecosystem products over HTTP;
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
  `contentJson.llm.cortexContextPack` for the generated Context report.
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

Compare MN7R monitor signals, published Index values and Context events for a
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

## Future Research: DSPy Eval Optimizer

DSPy is a useful candidate for a later Cortex evaluation and optimization
harness. It should be treated as an offline/research layer around saved Cortex
context packs and fixtures, not as a required runtime dependency inside Index,
MN7R or Cr0pto.

Potential uses:

- define structured signatures for `ContextPack -> AnswerWithEvidence`,
  `MonitorSignals + IndexValues -> Comparison`, `Evidence -> KnownGaps` and
  source relevance scoring;
- optimize prompts, examples and multi-step report/comparison programs against
  explicit Cortex eval fixtures;
- compare OpenAI model variants and prompt/program versions using the same
  evidence, redaction and known-gap requirements;
- generate better router/classifier datasets before any MiniMind-like local
  model or distillation experiment.

Entry criteria before testing DSPy:

- Cortex has saved context-pack artifacts for report context,
  monitor-vs-index comparison and execution context;
- expected outputs and grading metrics exist for evidence coverage,
  unsupported-claim avoidance, redaction compliance and known-gap handling;
- experiments run in a separate Python harness, for example
  `experiments/cortex-dspy/`, and never bypass Cortex visibility gates;
- winning prompts/programs are promoted only after deterministic regression
  checks, not by ad hoc manual inspection.

## Future Research: Local Small Model

MiniMind and similar tiny open-source LLM training projects are a possible
research path after the Cortex data, retrieval, context-pack, redaction and eval
layers are working. This is not part of the MVP and should not replace OpenAI or
the core RAG architecture.

Potential uses:

- local classifier/router for source type, relevance, product/domain ownership
  and simple intent labels;
- distilled assistant trained later from approved Cortex context packs, reviewed
  OpenAI outputs, accepted recommendations and observed outcomes;
- sandbox for understanding tokenizer, SFT, LoRA, tool-use and agentic-RL
  training loops before any product commitment.

Entry criteria before testing a MiniMind-like model:

- Cortex has enough approved context packs and outcome records to form a
  supervised dataset;
- eval fixtures exist for report context, monitor-vs-index comparison and
  execution context;
- the model is evaluated only as router/classifier/distilled helper first, not
  as the authoritative reasoning or autonomous execution layer;
- protected/secret data handling remains enforced by Cortex visibility gates,
  not by model behavior.

## MVP Acceptance Criteria

The first MVP is complete when:

- at least Index docs/Context and one MN7R resource family are registered;
- search can answer ecosystem questions with evidence IDs;
- one report context pack can be built for Index/Context;
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
- Decide whether DSPy should become the first offline optimizer/eval harness
  once Cortex has enough saved context-pack fixtures and scoring metrics.
- Decide whether a MiniMind-like local small model is worth testing after Cortex
  has enough approved context-pack/action/outcome data for eval-backed
  router/classifier/distillation experiments.
- Define the first three high-value use cases:
  market report context, monitor-vs-index comparison and execution context are
  the recommended starting set.
