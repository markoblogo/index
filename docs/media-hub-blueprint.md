# Media Hub Blueprint

## Goal

Build a real `1D3X Media Hub` that is better than the legacy `Last30Days` product in both editorial usefulness and monitoring depth.

The target is not a reports landing page.
The target is a living media-intelligence system with:

- `Day`
- `7 Days`
- `30 Days`

Each window must combine:

- AI summary layer
- live monitoring layer
- editor controls
- publish workflows

## Tenant And Locale Rules

### Spike

- `uk`: Ukrainian-language Ukraine sources only
- `en`: English-language Ukraine sources only

### 1D3X

- `en`: international English-language commodity, logistics, weather, policy, trade sources

### UGA

- hidden

## Public IA

### Public route shape

- Spike: `/{locale}/media-hub?window=day|week|month`
- 1D3X: `/media-hub?window=day|week|month`

### Public page wireframe

1. Hero / desk header
2. Period selector
3. AI summary card
4. Distribution / source mix
5. Desk snapshot metrics
6. Topic pulse
7. Topic clusters
8. Monitoring feed
9. Source policy / locale policy
10. Related outputs

### Public blocks

#### Hero

- desk identity
- market scope
- editorial promise
- selected window

#### Period selector

- `Day`
- `7 Days`
- `30 Days`

#### AI summary card

- generated summary
- comparative change vs prior period
- editorial implications
- top facts

#### Distribution

- source type split
- top sources
- total item count
- total source count

#### Topic pulse

- logistics
- pricing
- risk
- crop
- policy

#### Topic clusters

- label
- count
- one-line explanation

#### Monitoring feed

- source
- source type
- title
- short summary
- tags
- time

## Admin IA

### Admin route shape

- `/admin/media-hub`
- tabs inside page:
  - `day`
  - `week`
  - `month`
  - `sources`
  - later: `automation`

### Admin page wireframe

1. Media Hub overview bar
2. Window tabs
3. Run status row
4. Summary workspace
5. Monitoring preview
6. Source controls
7. Prompt and format references
8. Publication controls
9. Automation / schedule controls

### Admin blocks

#### Run status row

- window start
- window end
- collected count
- included count
- excluded count
- generated at
- model used
- publication deadline

#### Summary workspace

- generate
- regenerate
- approve
- hold
- publish website
- publish telegram
- publish article

#### Monitoring preview

- list of collected items
- include / exclude per item
- bulk include / exclude by source
- bulk include / exclude by topic
- reset filters
- generate from current filtered set

#### Source registry

- add source
- remove source
- mark as informational
- mark as format reference
- mark as both
- locale applicability
- window applicability
- source type
- priority

#### Publication controls

- auto publish enabled
- manual hold
- website publication status
- telegram publication status
- blog publication status

## SQL-Level Data Model

### `MediaSource`

- `id`
- `tenantId`
- `siteProfile` (`spike`, `1d3x`)
- `localeScope`
- `windowScope`
- `role` (`informational`, `format_reference`)
- `sourceKind` (`telegram`, `web`, `blog`, `x`, `reddit`, `youtube`, `file`, `manual`)
- `title`
- `handle`
- `url`
- `peerId`
- `language`
- `geography`
- `priority`
- `enabled`
- `notes`
- `configJson`
- `createdAt`
- `updatedAt`

### `MediaSourceItem`

- `id`
- `tenantId`
- `siteProfile`
- `sourceId`
- `externalId`
- `publishedAt`
- `collectedAt`
- `language`
- `title`
- `bodyText`
- `canonicalUrl`
- `author`
- `sourceKind`
- `hash`
- `dedupeKey`
- `metadataJson`

### `MediaWindowRun`

- `id`
- `tenantId`
- `siteProfile`
- `locale`
- `windowType` (`day`, `week`, `month`)
- `windowStart`
- `windowEnd`
- `collectionStatus`
- `generationStatus`
- `publicationStatus`
- `sourceCount`
- `itemCount`
- `includedCount`
- `excludedCount`
- `generatedAt`
- `publishedAt`
- `createdAt`
- `updatedAt`

### `MediaWindowDecision`

- `id`
- `runId`
- `sourceItemId`
- `included`
- `reason`
- `editorUserId`
- `updatedAt`

### `MediaTopicCluster`

- `id`
- `runId`
- `key`
- `title`
- `score`
- `itemCount`
- `summary`
- `colorToken`

### `MediaEntity`

- `id`
- `runId`
- `entityType`
- `entityName`
- `mentions`
- `relevanceScore`
- `metadataJson`

### `MediaReport`

- `id`
- `runId`
- `tenantId`
- `siteProfile`
- `locale`
- `reportKind` (`daily_summary`, `weekly_summary`, `monthly_summary`, `weekly_article`)
- `title`
- `body`
- `bodyJson`
- `promptVersion`
- `model`
- `status`
- `approvedAt`
- `publishedAt`

### `MediaAsset`

- `id`
- `reportId`
- `assetKind` (`cover`, `telegram_media`, `blog_cover`)
- `storageUrl`
- `prompt`
- `model`
- `width`
- `height`
- `createdAt`

### `MediaPublication`

- `id`
- `reportId`
- `channel` (`website`, `telegram`, `blog`)
- `scheduledAt`
- `publishedAt`
- `status`
- `externalRef`

## Mapping From Last30Days

### Keep conceptually

- period-based product
- summary-first reading
- distribution context
- monitoring density
- topic clustering
- source-type awareness

### Replace

- opaque abbreviations
- fragile collector assumptions
- weak editor tooling
- static archive feel

### Upgrade

- stronger source registry
- include / exclude editor controls
- locale-specific source pools
- direct publication workflows
- article and cover generation
- SEO / LLMO output model

## Existing Spike Areas To Merge Or Remove

### Move into Media Hub

- daily AI brief
- weekly report workflow
- weekly editorial article workflow
- monthly intelligence layer
- source registry

### Keep in Analytics

- index charts
- value history
- basis analytics
- methodology-driven price exploration

### Remove or merge later

- separate `Market Intelligence`
- duplicated weekly surfaces
- isolated AI brief entry points

## File Plan

### Create

- `src/components/media-hub/public-media-hub.tsx`
- `src/components/media-hub/admin-media-hub-shell.tsx`
- `src/components/media-hub/window-tabs.tsx`
- `src/components/media-hub/monitoring-feed.tsx`
- `src/components/media-hub/topic-clusters.tsx`
- `src/components/media-hub/source-distribution.tsx`
- `src/lib/media-hub.ts`
- `src/lib/media-hub-storage.ts`
- `src/lib/media-hub-collector.ts`
- `src/lib/media-hub-clustering.ts`
- `src/lib/media-hub-reporting.ts`
- `src/app/media-hub/page.tsx`

### Replace / refactor

- `src/app/[locale]/media-hub/page.tsx`
- `src/app/admin/media-hub/page.tsx`
- `src/app/admin/media-hub/monthly/page.tsx`
- `src/app/admin/media-hub/sources/page.tsx`

### Later merge or reduce

- `src/app/[locale]/analytics/page.tsx`
- `src/app/[locale]/market-intelligence/page.tsx`
- `src/app/admin/reports/page.tsx`

## Safe Migration Order

### Phase 1

- shared media hub domain model
- shared public shell
- site profiles for Spike and 1D3X

### Phase 2

- storage tables
- source registry
- media window runs
- item decisions

### Phase 3

- admin day / week / month tabs
- live monitoring preview
- include / exclude controls

### Phase 4

- real monthly pipeline
- 30-day public surface
- public related outputs

### Phase 5

- remove duplicated Spike analytics surfaces
- fold weekly article and report publishing into Media Hub

### Phase 6

- 1D3X international rollout on same engine

## First Implementation Move Completed

This repository now starts that migration with:

- a shared public `Media Hub` shell component
- window switching for `day / week / month`
- a Spike public surface
- a 1D3X public surface
- shared site-profile logic in `src/lib/media-hub.ts`

This is still a scaffold, not the final engine.
The next hard implementation step should be storage + admin tabs + real monitoring ingestion.
