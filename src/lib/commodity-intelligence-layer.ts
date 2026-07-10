export const COMMODITY_INTELLIGENCE_PRODUCT_NAME = "1D3X Cortex";

export type CortexVisibility = "public" | "internal" | "protected" | "secret";

export type CortexResourceKind =
  | "action-log"
  | "book-library"
  | "calculation-ledger"
  | "codebase"
  | "content-archive"
  | "development-plan"
  | "index-platform"
  | "commodity-infra"
  | "dynamic-site"
  | "execution-workspace"
  | "landing"
  | "manual"
  | "manual-library"
  | "market-media"
  | "monitor"
  | "public-site"
  | "raw-market-data"
  | "repository";

export type CortexAccessMode =
  | "api-snapshot"
  | "archive-snapshot"
  | "book-ingestion"
  | "calculation-ledger"
  | "codebase-snapshot"
  | "database-snapshot"
  | "development-plan"
  | "event-log"
  | "mediahub-source"
  | "manual-upload"
  | "public-web"
  | "raw-monitoring-snapshot"
  | "respondent-input-snapshot"
  | "repo-docs"
  | "site-snapshot";

export type CortexActionMode =
  | "context-pack"
  | "draft"
  | "analysis"
  | "approval-gated-tool";

export type CortexLifecycleStage =
  | "observe-learn"
  | "assist-propose"
  | "approval-gated-act"
  | "bounded-autonomy";

export const CORTEX_LIFECYCLE: Array<{
  description: string;
  stage: CortexLifecycleStage;
}> = [
  {
    description: "Read ecosystem data, build evidence memory, learn project workflows and assemble bounded context packs.",
    stage: "observe-learn",
  },
  {
    description: "Work inside product assistants with external LLMs for answers, analysis, drafts and reviewable recommendations.",
    stage: "assist-propose",
  },
  {
    description: "Prepare tool proposals that execute only through product auth, exact confirmation, idempotency, audit and rollback paths.",
    stage: "approval-gated-act",
  },
  {
    description: "Enable bounded autonomy per capability only after evals, monitoring, permissions and product-specific safety gates prove readiness.",
    stage: "bounded-autonomy",
  },
];

export type CortexProjectResource = {
  description: string;
  id: string;
  kind: CortexResourceKind;
  name: string;
  ownerProject: "index" | "mn7r" | "cropto" | "1d3x" | "ecosystem";
  visibility: CortexVisibility;
};

export type CortexSource = {
  accessMode: CortexAccessMode;
  allowedActionModes: CortexActionMode[];
  cadence: "on-event" | "on-change" | "hourly" | "daily" | "weekly" | "manual";
  description: string;
  id: string;
  resourceId: string;
  rightsNote: string;
  title: string;
  visibility: CortexVisibility;
};

export type CortexEvidenceItem = {
  extractedAt: string;
  hash?: string;
  id: string;
  sourceId: string;
  summary: string;
  title: string;
  urlOrPath: string;
  visibility: CortexVisibility;
};

export type CortexContextPack = {
  createdAt: string;
  evidence: CortexEvidenceItem[];
  excluded: Array<{
    evidenceId: string;
    reason: string;
    visibility: CortexVisibility;
  }>;
  knownGaps: string[];
  product: typeof COMMODITY_INTELLIGENCE_PRODUCT_NAME;
  purpose:
    | "action-analysis"
    | "codebase-review"
    | "execution-context"
    | "market-report"
    | "monitor-index-comparison"
    | "project-recommendation"
    | "source-review";
  query: string;
  sourceIds: string[];
};

export type CortexMarketReportKind = "daily" | "weekly" | "monthly";

export type CortexMarketReportTenant = "spike" | "platform";

export type CortexMarketReportInput = {
  latestData?: Array<{
    basis: string;
    changeAbs: number | null;
    commodityCode: string;
    commodityId: string;
    commodityNameEn: string;
    commodityNameUk: string;
    date: string;
    valueUsdPerMt: number | null;
  }>;
  manualMaterials?: Array<{
    extractedText: string;
    id: string;
    kind: string;
    originalFilename: string | null;
    originalUrl: string | null;
    receivedAt: Date;
    sourceDomain: string | null;
    sourceType: string;
    summary: string;
    tenantId: string;
  }>;
  monitoringLedgerEvidence?: Array<{
    extractedAt: Date;
    id: string;
    processingState: string;
    rejectionReason?: string;
    relevanceScore: number;
    source: string;
    sourceType: string;
    sourceUrl?: string;
    summary: string;
    tags: string[];
    title: string;
  }>;
  calculationEvidence?: Array<{
    basis: string;
    calculatedAt: Date;
    commodityCode: string;
    id: string;
    summary: string;
    tenantId: string;
    valueUsdPerMt: number | null;
  }>;
  periodEndDate: string;
  periodStartDate: string;
  respondentInputs?: Array<{
    basis: string;
    commodityCode: string;
    id: string;
    respondentType?: string;
    submittedAt: Date;
    summary: string;
    tenantId: string;
    valueUsdPerMt: number | null;
  }>;
  reportKind: CortexMarketReportKind;
  snapshots?: Array<{
    feed: Array<{
      id: string;
      processingState?: "accepted_after_scoring" | "fallback_accepted" | "manually_injected";
      rejectionReason?: string;
      relevanceScore?: number;
      source: string;
      sourceType: string;
      sourceUrl?: string;
      summary: string;
      tags: string[];
      time: string;
      title: string;
    }>;
    window: string;
  }>;
  tenant: CortexMarketReportTenant;
};

export const CORTEX_PROJECT_RESOURCES: CortexProjectResource[] = [
  {
    description: "Shared benchmark, Context, analytics and public reporting platform.",
    id: "index-platform",
    kind: "index-platform",
    name: "Index Platform",
    ownerProject: "index",
    visibility: "internal",
  },
  {
    description: "1D3X public umbrella, landing and partner entry surface.",
    id: "1d3x-public",
    kind: "landing",
    name: "1D3X",
    ownerProject: "1d3x",
    visibility: "public",
  },
  {
    description: "Private commodity brokerage monitor and EXE operating workspace.",
    id: "mn7r-monitor",
    kind: "monitor",
    name: "MN7R Monitor",
    ownerProject: "mn7r",
    visibility: "protected",
  },
  {
    description: "Commodity infrastructure line covering Cr0pto and Liqua surfaces.",
    id: "cropto-infra",
    kind: "commodity-infra",
    name: "Cr0pto",
    ownerProject: "cropto",
    visibility: "internal",
  },
  {
    description: "Context source and evidence layer for market context.",
    id: "mediahub",
    kind: "market-media",
    name: "Context",
    ownerProject: "index",
    visibility: "internal",
  },
  {
    description: "Raw respondent submissions, imported monitor values, calculation inputs and intermediate SSI calculation traces.",
    id: "index-raw-data",
    kind: "raw-market-data",
    name: "Index raw market and respondent data",
    ownerProject: "index",
    visibility: "protected",
  },
  {
    description: "Index calculation runs, basket inclusion decisions, exclusions, revisions and publication locks.",
    id: "index-calculation-ledger",
    kind: "calculation-ledger",
    name: "Index calculation ledger",
    ownerProject: "index",
    visibility: "protected",
  },
  {
    description: "Public and dynamic web surfaces across Index, MN7R, Cr0pto and related ecosystem products.",
    id: "ecosystem-sites",
    kind: "dynamic-site",
    name: "Ecosystem public and dynamic sites",
    ownerProject: "ecosystem",
    visibility: "public",
  },
  {
    description: "Manuals, public guides, books, playbooks and training materials attached to ecosystem products.",
    id: "ecosystem-knowledge-library",
    kind: "manual-library",
    name: "Ecosystem manuals and books",
    ownerProject: "ecosystem",
    visibility: "internal",
  },
  {
    description: "Repository code, tests, architecture notes, plans and development history for all ecosystem products.",
    id: "ecosystem-codebases",
    kind: "codebase",
    name: "Ecosystem codebases and plans",
    ownerProject: "ecosystem",
    visibility: "protected",
  },
  {
    description: "Product, user, operator and agent actions that Cortex may analyze after redaction and workflow allowlisting.",
    id: "ecosystem-action-memory",
    kind: "action-log",
    name: "Ecosystem action and event memory",
    ownerProject: "ecosystem",
    visibility: "protected",
  },
  {
    description: "Historical reports, source snapshots, generated artifacts and structured archives retained for trend and change analysis.",
    id: "ecosystem-archives",
    kind: "content-archive",
    name: "Ecosystem archives",
    ownerProject: "ecosystem",
    visibility: "internal",
  },
];

export const CORTEX_INITIAL_SOURCES: CortexSource[] = [
  {
    accessMode: "repo-docs",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "on-change",
    description: "Cortex plan, Context runtime policy, source audits and database docs.",
    id: "index-docs",
    resourceId: "index-platform",
    rightsNote: "Repo-local project documentation.",
    title: "Index repository documentation",
    visibility: "internal",
  },
  {
    accessMode: "mediahub-source",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "hourly",
    description: "Public agro-commodity news, logistics, crop and policy source inventory.",
    id: "mediahub-global-sources",
    resourceId: "mediahub",
    rightsNote: "Respect source rights, robots/ToS and source-specific retention notes.",
    title: "Context global source registry",
    visibility: "public",
  },
  {
    accessMode: "raw-monitoring-snapshot",
    allowedActionModes: ["context-pack", "analysis"],
    cadence: "hourly",
    description: "Raw monitored Context items before report digesting: fetched RSS/API/search/Telegram candidates, source metadata, scores, tags and rejection reasons.",
    id: "mediahub-raw-monitoring-items",
    resourceId: "mediahub",
    rightsNote: "Keep original source metadata, fetch time, URL and processing status; external model calls receive only approved excerpts after dedupe, relevance and rights checks.",
    title: "Context raw monitored items",
    visibility: "protected",
  },
  {
    accessMode: "manual-upload",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "manual",
    description: "Materials submitted through @idex_grains_bot for SSI and 1D3X daily, weekly and monthly reports.",
    id: "mediahub-telegram-materials",
    resourceId: "mediahub",
    rightsNote: "Use project/report tags (#ssi, #1d3x, #daily, #weekly, #monthly); store source metadata and redact private submissions before model calls.",
    title: "1D3X/SSI Telegram material intake",
    visibility: "internal",
  },
  {
    accessMode: "database-snapshot",
    allowedActionModes: ["context-pack", "analysis"],
    cadence: "daily",
    description: "Published index values and locked historical public values.",
    id: "published-index-values",
    resourceId: "index-platform",
    rightsNote: "Use published values only; do not expose draft respondent submissions.",
    title: "Published Index values",
    visibility: "public",
  },
  {
    accessMode: "respondent-input-snapshot",
    allowedActionModes: ["context-pack", "analysis"],
    cadence: "on-event",
    description: "Raw SSI respondent submissions, admin-entered prices and automatic MN7R respondent imports before aggregation and publication.",
    id: "ssi-respondent-inputs",
    resourceId: "index-raw-data",
    rightsNote: "Protected source: redact respondent identity, contact, IP/session and counterparty-sensitive notes before any external model context.",
    title: "SSI raw respondent and imported inputs",
    visibility: "protected",
  },
  {
    accessMode: "calculation-ledger",
    allowedActionModes: ["context-pack", "analysis"],
    cadence: "on-event",
    description: "SSI calculation runs, inclusion/exclusion decisions, baskets, minimum respondent gates, rounding, revisions and publication locks.",
    id: "ssi-calculation-ledger",
    resourceId: "index-calculation-ledger",
    rightsNote: "Protected source: expose formulas, aggregate diagnostics and run IDs; keep private respondent-level records behind redaction gates.",
    title: "SSI calculation and publication ledger",
    visibility: "protected",
  },
  {
    accessMode: "repo-docs",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "on-change",
    description: "MN7R public-safe docs and AI-layer contracts.",
    id: "mn7r-public-docs",
    resourceId: "mn7r-monitor",
    rightsNote: "Public-safe wording only; protected workspace records remain excluded.",
    title: "MN7R public and product docs",
    visibility: "internal",
  },
  {
    accessMode: "api-snapshot",
    allowedActionModes: ["context-pack", "analysis", "draft", "approval-gated-tool"],
    cadence: "daily",
    description: "Governed monitor signals used for monitor-vs-index comparison, assistant context and approval-gated internal tools.",
    id: "mn7r-monitor-readonly",
    resourceId: "mn7r-monitor",
    rightsNote: "Assistant/tool use must go through MN7R auth, redaction, audit and approval gates.",
    title: "MN7R governed monitor context",
    visibility: "protected",
  },
  {
    accessMode: "event-log",
    allowedActionModes: ["context-pack", "analysis", "approval-gated-tool"],
    cadence: "on-event",
    description: "MN7R broker/operator/user-entered quotes, bids, offers, deal notes, corrections and workflow events used for monitor analysis.",
    id: "mn7r-broker-user-inputs",
    resourceId: "mn7r-monitor",
    rightsNote: "Protected source: use MN7R-local auth, role scoping, redaction and audit IDs; do not export raw counterparties or sensitive commercial notes to external models.",
    title: "MN7R broker and user input events",
    visibility: "protected",
  },
  {
    accessMode: "api-snapshot",
    allowedActionModes: ["context-pack", "analysis"],
    cadence: "daily",
    description: "Derived correlations between MN7R monitor inputs, SSI respondent inputs, published index movements and Context events.",
    id: "mn7r-index-correlation-signals",
    resourceId: "mn7r-monitor",
    rightsNote: "Use aggregate and redacted correlation features by default; raw event drill-down remains approval-gated.",
    title: "MN7R/SSI/Context correlation signals",
    visibility: "protected",
  },
  {
    accessMode: "public-web",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "weekly",
    description: "Public Cr0pto/Liqua product surfaces and commodity-infra positioning.",
    id: "cropto-public-surfaces",
    resourceId: "cropto-infra",
    rightsNote: "Public pages only until a repo-local ingestion contract is added.",
    title: "Cr0pto public surfaces",
    visibility: "public",
  },
  {
    accessMode: "site-snapshot",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "daily",
    description: "Static and dynamic product-site content across Index, 1D3X, SSI, MN7R, Cr0pto and smaller ecosystem sites.",
    id: "ecosystem-site-content",
    resourceId: "ecosystem-sites",
    rightsNote: "Capture public route content, sitemap-visible pages, dynamic report pages and dated snapshots with canonical URLs and hashes.",
    title: "Ecosystem site content snapshots",
    visibility: "public",
  },
  {
    accessMode: "book-ingestion",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "on-change",
    description: "Manuals, product guides, public books, uploaded PDFs, playbooks and teaching materials attached to ecosystem products.",
    id: "ecosystem-manuals-books",
    resourceId: "ecosystem-knowledge-library",
    rightsNote: "Preserve source paths, edition/version metadata, language and rights notes; do not treat stale manuals as current behavior without freshness checks.",
    title: "Ecosystem manuals, books and playbooks",
    visibility: "internal",
  },
  {
    accessMode: "codebase-snapshot",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "on-change",
    description: "Code, tests, schemas, route contracts, agent docs and implementation structure across active and paused ecosystem repositories.",
    id: "ecosystem-code-snapshots",
    resourceId: "ecosystem-codebases",
    rightsNote: "Use repo permissions; include commit SHA, file path, owner project and test/build evidence; secrets and private env files are excluded.",
    title: "Ecosystem codebase snapshots",
    visibility: "protected",
  },
  {
    accessMode: "development-plan",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "on-change",
    description: "Roadmaps, TODOs, implementation plans, release notes, ADRs and product recommendations across ecosystem repositories.",
    id: "ecosystem-development-plans",
    resourceId: "ecosystem-codebases",
    rightsNote: "Keep plan status, date, owner project and evidence strength; distinguish intended work from implemented behavior.",
    title: "Ecosystem development plans and recommendations",
    visibility: "internal",
  },
  {
    accessMode: "event-log",
    allowedActionModes: ["context-pack", "analysis", "approval-gated-tool"],
    cadence: "on-event",
    description: "Approved product actions, operator actions, assistant/tool proposals, outcomes and correction events across ecosystem products.",
    id: "ecosystem-action-events",
    resourceId: "ecosystem-action-memory",
    rightsNote: "Only ingest events from explicit workflow allowlists with redaction, actor scoping, audit IDs and product-local permission checks.",
    title: "Ecosystem action and update events",
    visibility: "protected",
  },
  {
    accessMode: "archive-snapshot",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "daily",
    description: "Historical reports, Context publications, index archives, source bundles, generated artifacts and retained snapshots.",
    id: "ecosystem-content-archives",
    resourceId: "ecosystem-archives",
    rightsNote: "Keep immutable archive IDs, period coverage, source hashes and retention policy; never overwrite historical evidence in place.",
    title: "Ecosystem content and data archives",
    visibility: "internal",
  },
];

export function findCortexSource(sourceId: string, sources = CORTEX_INITIAL_SOURCES) {
  return sources.find((source) => source.id === sourceId) ?? null;
}

export function canUseVisibilityInExternalModel(
  visibility: CortexVisibility,
  options: { allowProtected?: boolean } = {},
) {
  if (visibility === "secret") {
    return false;
  }

  if (visibility === "protected") {
    return options.allowProtected === true;
  }

  return true;
}

export function buildCortexContextPack(input: {
  allowProtected?: boolean;
  createdAt?: string;
  evidence: CortexEvidenceItem[];
  knownGaps?: string[];
  purpose: CortexContextPack["purpose"];
  query: string;
  sources?: CortexSource[];
}): CortexContextPack {
  const allowedEvidence: CortexEvidenceItem[] = [];
  const excluded: CortexContextPack["excluded"] = [];

  for (const item of input.evidence) {
    const source = findCortexSource(item.sourceId, input.sources);
    const visibility = mostRestrictiveVisibility(item.visibility, source?.visibility);
    if (canUseVisibilityInExternalModel(visibility, { allowProtected: input.allowProtected })) {
      allowedEvidence.push({ ...item, visibility });
    } else {
      excluded.push({
        evidenceId: item.id,
        reason: visibility === "secret"
          ? "Secret evidence is never exported to model context."
          : "Protected evidence requires an explicit workflow allowlist.",
        visibility,
      });
    }
  }

  return {
    createdAt: input.createdAt ?? new Date().toISOString(),
    evidence: dedupeCortexEvidence(allowedEvidence),
    excluded,
    knownGaps: input.knownGaps ?? [],
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    purpose: input.purpose,
    query: input.query,
    sourceIds: Array.from(new Set(allowedEvidence.map((item) => item.sourceId))).sort(),
  };
}

export function buildCortexMarketReportContextPack(
  input: CortexMarketReportInput,
): CortexContextPack {
  const evidence: CortexEvidenceItem[] = [
    ...buildIndexEvidence(input),
    ...buildRespondentInputEvidence(input),
    ...buildCalculationEvidence(input),
    ...buildManualMaterialEvidence(input),
    ...buildMonitoringLedgerEvidence(input),
    ...buildRawMonitoringEvidence(input),
    ...buildMonitoringEvidence(input),
  ];

  return buildCortexContextPack({
    createdAt: `${input.periodEndDate}T23:59:59.000Z`,
    evidence,
    knownGaps: buildMarketReportKnownGaps(input, evidence),
    purpose: "market-report",
    query: `${input.tenant}:${input.reportKind}:${input.periodStartDate}:${input.periodEndDate}`,
  });
}

export function mergeCortexContextPacks(input: {
  createdAt?: string;
  primary: CortexContextPack;
  secondary?: CortexContextPack;
}): CortexContextPack {
  if (!input.secondary) return input.primary;

  return {
    createdAt: input.createdAt ?? input.primary.createdAt,
    evidence: dedupeCortexEvidence([
      ...input.primary.evidence,
      ...input.secondary.evidence,
    ]),
    excluded: [
      ...input.primary.excluded,
      ...input.secondary.excluded,
    ],
    knownGaps: Array.from(new Set([
      ...input.primary.knownGaps,
      ...input.secondary.knownGaps,
    ])),
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    purpose: input.primary.purpose,
    query: `${input.primary.query} + ${input.secondary.query}`,
    sourceIds: Array.from(new Set([
      ...input.primary.sourceIds,
      ...input.secondary.sourceIds,
    ])).sort(),
  };
}

function buildIndexEvidence(input: CortexMarketReportInput): CortexEvidenceItem[] {
  return (input.latestData ?? [])
    .filter((item) => item.valueUsdPerMt !== null)
    .slice(0, 40)
    .map((item) => ({
      extractedAt: `${input.periodEndDate}T23:59:59.000Z`,
      id: `cortex:index:${item.commodityId}:${item.basis}:${item.date || input.periodEndDate}`,
      sourceId: "published-index-values",
      summary: [
        `${item.commodityNameEn || item.commodityCode}: ${item.valueUsdPerMt} USD/t`,
        `basis ${item.basis}`,
        item.changeAbs == null ? null : `change ${item.changeAbs}`,
      ].filter(Boolean).join("; "),
      title: `Published index ${item.commodityCode}`,
      urlOrPath: input.tenant === "spike" ? "https://spike.1d3x.com/" : "https://1d3x.com/",
      visibility: "public" as const,
    }));
}

function buildRespondentInputEvidence(input: CortexMarketReportInput): CortexEvidenceItem[] {
  return (input.respondentInputs ?? [])
    .filter((item) => item.tenantId === tenantToMaterialTenant(input.tenant))
    .map((item) => ({
      extractedAt: item.submittedAt.toISOString(),
      id: `cortex:respondent-input:${item.id}`,
      sourceId: "ssi-respondent-inputs",
      summary: compactCortexText([
        item.commodityCode,
        item.basis,
        item.valueUsdPerMt == null ? "value unavailable" : `${item.valueUsdPerMt} USD/t`,
        item.respondentType ? `respondent type ${item.respondentType}` : null,
        item.summary,
      ].filter(Boolean).join("; ")),
      title: `SSI raw input ${item.commodityCode}`,
      urlOrPath: `ssi-respondent-input:${item.id}`,
      visibility: "protected" as const,
    }))
    .filter((item) => item.summary.length > 0)
    .slice(0, input.reportKind === "daily" ? 40 : input.reportKind === "weekly" ? 100 : 160);
}

function buildCalculationEvidence(input: CortexMarketReportInput): CortexEvidenceItem[] {
  return (input.calculationEvidence ?? [])
    .filter((item) => item.tenantId === tenantToMaterialTenant(input.tenant))
    .map((item) => ({
      extractedAt: item.calculatedAt.toISOString(),
      id: `cortex:calculation:${item.id}`,
      sourceId: "ssi-calculation-ledger",
      summary: compactCortexText([
        item.commodityCode,
        item.basis,
        item.valueUsdPerMt == null ? "published value unavailable" : `${item.valueUsdPerMt} USD/t`,
        item.summary,
      ].filter(Boolean).join("; ")),
      title: `SSI calculation ${item.commodityCode}`,
      urlOrPath: `ssi-calculation:${item.id}`,
      visibility: "protected" as const,
    }))
    .filter((item) => item.summary.length > 0)
    .slice(0, input.reportKind === "daily" ? 30 : input.reportKind === "weekly" ? 80 : 120);
}

function buildRawMonitoringEvidence(input: CortexMarketReportInput): CortexEvidenceItem[] {
  return (input.snapshots ?? [])
    .flatMap((snapshot) =>
      snapshot.feed.map((item) => ({
        extractedAt: `${input.periodEndDate}T23:59:59.000Z`,
        id: `cortex:raw-feed:${snapshot.window}:${item.id}`,
        sourceId: "mediahub-raw-monitoring-items",
        summary: compactCortexText([
          `source=${item.source}`,
          `sourceType=${item.sourceType}`,
          `state=${item.processingState ?? "accepted_snapshot_item"}`,
          item.relevanceScore == null ? null : `score=${item.relevanceScore}`,
          item.rejectionReason ? `rejectionReason=${item.rejectionReason}` : null,
          item.tags.length > 0 ? `tags=${item.tags.join(", ")}` : null,
          item.summary,
        ].filter(Boolean).join("; ")),
        title: `Raw Context item: ${item.title}`,
        urlOrPath: item.sourceUrl || `mediahub-raw-feed:${snapshot.window}:${item.id}`,
        visibility: "protected" as const,
      })),
    )
    .filter((item) => item.summary.length > 0)
    .slice(0, input.reportKind === "daily" ? 40 : input.reportKind === "weekly" ? 120 : 180);
}

function buildMonitoringLedgerEvidence(input: CortexMarketReportInput): CortexEvidenceItem[] {
  return (input.monitoringLedgerEvidence ?? [])
    .map((item) => ({
      extractedAt: item.extractedAt.toISOString(),
      id: `cortex:monitoring-ledger:${item.id}`,
      sourceId: "mediahub-raw-monitoring-items",
      summary: compactCortexText([
        `source=${item.source}`,
        `sourceType=${item.sourceType}`,
        `state=${item.processingState}`,
        `score=${item.relevanceScore}`,
        item.rejectionReason ? `rejectionReason=${item.rejectionReason}` : null,
        item.tags.length > 0 ? `tags=${item.tags.join(", ")}` : null,
        item.summary,
      ].filter(Boolean).join("; ")),
      title: `Context monitoring ledger: ${item.title}`,
      urlOrPath: item.sourceUrl || `mediahub-monitoring-ledger:${item.id}`,
      visibility: "protected" as const,
    }))
    .filter((item) => item.summary.length > 0)
    .slice(0, input.reportKind === "daily" ? 80 : input.reportKind === "weekly" ? 180 : 260);
}

function buildManualMaterialEvidence(input: CortexMarketReportInput): CortexEvidenceItem[] {
  return (input.manualMaterials ?? [])
    .filter((material) => isManualMaterialRelevantToReport(material.kind, input.reportKind))
    .filter((material) => material.tenantId === tenantToMaterialTenant(input.tenant))
    .map((material) => {
      const label = material.sourceDomain || material.originalFilename || material.originalUrl || material.id;
      return {
        extractedAt: material.receivedAt.toISOString(),
        id: `cortex:material:${material.id}`,
        sourceId: material.sourceType.startsWith("telegram")
          ? "mediahub-telegram-materials"
          : "index-docs",
        summary: compactCortexText(material.summary || material.extractedText),
        title: `Context material: ${label}`,
        urlOrPath: material.originalUrl || `mediahub-material:${material.id}`,
        visibility: "internal" as const,
      };
    })
    .filter((item) => item.summary.length > 0)
    .slice(0, input.reportKind === "daily" ? 30 : input.reportKind === "weekly" ? 60 : 90);
}

function buildMonitoringEvidence(input: CortexMarketReportInput): CortexEvidenceItem[] {
  return (input.snapshots ?? [])
    .flatMap((snapshot) =>
      snapshot.feed.map((item) => ({
        extractedAt: `${input.periodEndDate}T23:59:59.000Z`,
        id: `cortex:feed:${item.id}`,
        sourceId: "mediahub-global-sources",
        summary: compactCortexText(`${item.summary} Tags: ${item.tags.join(", ")}`),
        title: item.title,
        urlOrPath: `mediahub-feed:${snapshot.window}:${item.id}`,
        visibility: "public" as const,
      })),
    )
    .filter((item) => item.summary.length > 0)
    .slice(0, input.reportKind === "daily" ? 40 : input.reportKind === "weekly" ? 100 : 150);
}

function buildMarketReportKnownGaps(
  input: CortexMarketReportInput,
  evidence: CortexEvidenceItem[],
) {
  const gaps: string[] = [];
  if (!input.manualMaterials?.some((material) => material.sourceType.startsWith("telegram"))) {
    gaps.push("No Telegram bot materials were included for this report context.");
  }
  if (!input.latestData?.some((item) => item.valueUsdPerMt !== null) && input.tenant === "spike") {
    gaps.push("No published SSI index values were included in this report context.");
  }
  if (!evidence.some((item) => item.sourceId === "mediahub-global-sources")) {
    gaps.push("No monitored Context feed evidence was included.");
  }
  return gaps;
}

function tenantToMaterialTenant(tenant: CortexMarketReportTenant) {
  return tenant === "spike" ? "spike-ua" : "1d3x";
}

function isManualMaterialRelevantToReport(kind: string, reportKind: CortexMarketReportKind) {
  if (kind === "source_candidate") {
    return reportKind !== "daily";
  }
  return kind === `${reportKind}_material`;
}

function compactCortexText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 900);
}

function dedupeCortexEvidence(items: CortexEvidenceItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function mostRestrictiveVisibility(
  evidenceVisibility: CortexVisibility,
  sourceVisibility: CortexVisibility | undefined,
): CortexVisibility {
  const rank: Record<CortexVisibility, number> = {
    public: 0,
    internal: 1,
    protected: 2,
    secret: 3,
  };
  const source = sourceVisibility ?? evidenceVisibility;
  return rank[source] > rank[evidenceVisibility] ? source : evidenceVisibility;
}
