# Situational monitoring contract

Status: proposed docs-level contract
Updated: 2026-07-26

This contract adapts a small subset of useful ideas from
[koala73/worldmonitor](https://github.com/koala73/worldmonitor) for Index,
Context and Cortex work. It does not adopt worldmonitor code, runtime,
licensing, feed volume, map stack or product architecture.

Worldmonitor is useful as a reference because it frames monitoring as
situational awareness: curated streams, cross-stream signal correlation,
variant surfaces, map/layer controls and explicit freshness tracking. Index
should take the operational pattern, not the whole platform.

## Scope

Apply this contract to:

- SSI Context and analytics review surfaces;
- 1D3X Context and corporate intelligence surfaces;
- Cortex evidence/context/report packets;
- admin or operator dashboards that summarize source readiness, report
  readiness, channel readiness or anomaly state.

Do not apply it as a default mandate to:

- public index calculation rules;
- respondent submission forms;
- Telegram/WhatsApp channel sending;
- production cron behavior;
- external source ingestion volume.

Those paths still require the existing review checklist and explicit approval
when behavior changes.

## Useful parts by surface

### SSI

Useful:

- a compact day-window monitor for published index snapshot, report readiness,
  Telegram/WhatsApp readiness and data anomalies;
- freshness receipts for respondent inputs, MN7R Monitor values, published
  index history and Context materials;
- signal fusion receipts that explain which current-period signals influenced
  the daily report overview or analytics commentary.

Not useful by default:

- global geopolitical feeds;
- 3D globe-first UI;
- broad live ingestion beyond approved SSI source policy.

### 1D3X

Useful:

- variant-monitor contract for corporate, commodity and Context surfaces that
  share the same source/readiness concepts but expose different views;
- layer registry for business, commodity, logistics, finance and publication
  readiness layers;
- freshness/provenance receipts on partner-facing intelligence summaries.

Not useful by default:

- separate desktop runtime;
- mandatory map layer engine;
- a new global feed platform.

### Context

Useful:

- situational-monitor contract for one report window: source intake,
  normalized materials, evidence freshness, generated report, site publication
  and channel-send readiness;
- signal-fusion record that distinguishes observed facts, derived signals,
  unsupported claims and stale/background facts;
- geo-optional visualization for logistics, ports, borders and regional crop
  context only when geography helps the operator understand the signal.

Not useful by default:

- treating maps as the primary report interface;
- SERP snippets or map markers as verified report evidence;
- escalating discovery volume because a dashboard can show more layers.

### Cortex

Useful:

- bounded context packets that include source scope, layer, freshness,
  provenance, confidence and known gaps;
- variant-aware synthesis so SSI, 1D3X and shared Cortex views can reuse
  evidence without blurring tenant boundaries;
- dashboard/report artifacts that show why a synthesis is current enough to use.

Not useful by default:

- AGPL code adoption;
- external MCP/API dependency on worldmonitor;
- full situation-room workflow automation.

## Compact adaptation package

### `SituationalMonitor`

A monitor is a read-model for a bounded operating window. It reports state; it
does not publish, send messages, mutate calculations or run background
collection by itself.

```ts
type SituationalMonitor = {
  id: string;
  tenantId: "spike-ua" | "1d3x" | "uga-ua" | "shared";
  window: {
    kind: "daily" | "weekly" | "monthly" | "ad_hoc";
    start: string;
    end: string;
    timezone: string;
  };
  states: Array<"collect" | "normalize" | "generate" | "validate" | "publish-site" | "send-channel">;
  layers: string[];
  signals: SignalFusionReceipt[];
  freshness: FreshnessReceipt[];
  provenance: ProvenanceReceipt[];
  knownGaps: string[];
  nextAction?: string;
};
```

### `VariantMonitor`

A variant monitor is one tenant or product view over the same contract.

```ts
type VariantMonitor = {
  variantId: "ssi-context" | "ssi-analytics" | "1d3x-context" | "cortex-report";
  monitorId: string;
  audience: "public" | "admin" | "operator" | "partner" | "cortex";
  allowedLayers: string[];
  hiddenLayers?: string[];
  canPublish: false;
  canSendChannel: false;
};
```

Variant monitors are display and review surfaces. Publication remains in the
existing `publish-site` and `send-channel` workflows.

### `LayerRegistry`

Layers are named views over already-approved data. They are not permission
bypasses and do not create new ingestion rights.

```ts
type LayerRegistryEntry = {
  id: string;
  label: string;
  tenantScope: Array<"spike-ua" | "1d3x" | "uga-ua" | "shared">;
  kind: "index" | "context" | "logistics" | "source" | "publication" | "risk" | "geo";
  sourcePolicy: "approved_only" | "public_or_permissioned";
  defaultVisible: boolean;
  requiresApproval?: boolean;
};
```

Recommended first registry:

- `index-snapshot`: current published index values and d/d movement;
- `input-freshness`: respondent/manual/monitor input recency;
- `context-materials`: accepted Context materials for the report window;
- `publication-readiness`: report/site/channel status and idempotency receipts;
- `claim-support`: evidence coverage, unsupported claims and stale facts;
- `logistics-geo`: optional map/list layer for ports, borders, rail and regions.

### Signal fusion, provenance and freshness receipts

Use receipts to explain why a dashboard, report or Cortex packet should be
trusted.

```ts
type SignalFusionReceipt = {
  signalId: string;
  layerId: string;
  status: "observed" | "derived" | "stale" | "unsupported" | "conflict";
  summary: string;
  sourceMaterialIds: string[];
  confidence: "low" | "medium" | "high";
  generatedAt: string;
};

type FreshnessReceipt = {
  subjectId: string;
  layerId: string;
  latestObservedAt?: string;
  expectedBy?: string;
  status: "fresh" | "late" | "missing" | "stale";
  checkedAt: string;
};

type ProvenanceReceipt = {
  materialId: string;
  sourceId: string;
  sourceType: "telegram" | "rss" | "api" | "manual" | "snapshot" | "search_candidate";
  capturedAt: string;
  rights: "public" | "permissioned" | "internal";
  hash?: string;
};
```

Receipts must be additive and inspectable. They must not replace the canonical
published index snapshot, report text or source extraction records.

### Geo-optional UI rule

Use geography only when it explains the signal:

- good fit: ports, Danube route, border checkpoints, rail congestion, crop
  regions, logistics disruptions;
- weak fit: price cards, daily Telegram text, generic report lists, source
  freshness summaries;
- default: list/table/card first, map second;
- no mandatory 3D globe layer;
- no new deck.gl/MapLibre/globe runtime until a concrete UI surface proves that
  a static list or light SVG map is insufficient.

## Where to anchor this

- README: short platform-level mention only.
- `docs/media-hub-domain-model.md`: vocabulary and workflow relationship.
- `docs/media-hub-review-checklist.md`: review gate for monitor/readiness
  changes.
- `docs/media-hub-browser-runtime.md`: keep extraction/snapshot roles separate
  from situational dashboards.
- Cortex docs: use receipts in evidence/context packets, without changing
  production delivery.

## Priority

### First wave

- Add this contract as documentation.
- Use the terminology in Context/Index/Cortex review discussions.
- Add receipts to future operator artifacts before adding UI complexity.
- Keep geo optional and layer-driven.

### Later wave

- Add a small admin/operator monitor for SSI daily readiness.
- Add variant monitor views for SSI Context and 1D3X Context.
- Add claim-support and freshness receipts to Cortex report artifacts.
- Consider lightweight map/list visualization only for logistics layers.

### Do not take

- worldmonitor runtime, dependencies, AGPL source or API as a production
  dependency;
- 500+ feed ingestion posture;
- desktop/Tauri runtime;
- 3D globe as the default UI;
- hidden proxy/stealth collection;
- automatic publication or channel sends from a monitor view;
- broad war-room dashboard build before receipts and existing Context flows are
  stable.
