import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { buildCortexContextPack, type CortexContextPack, type CortexVisibility } from "@/lib/commodity-intelligence-layer";

export type CortexEcosystemProject = "index" | "mediahub" | "mn7r" | "cropto" | "ecosystem";

export type CortexEcosystemEvidenceType =
  | "mediahub-publication"
  | "mediahub-report-draft"
  | "mediahub-source-snapshot"
  | "mn7r-monitor-observation"
  | "ssi-index-snapshot"
  | "ssi-respondent-inputs"
  | "ssi-telegram-draft";

type CortexEcosystemSourceDefinition = {
  cadence: "on-event" | "daily" | "weekly";
  description: string;
  id: string;
  maxAgeHours: number;
  project: CortexEcosystemProject;
  supportedTypes: CortexEcosystemEvidenceType[];
  visibility: Exclude<CortexVisibility, "secret">;
};

export const CORTEX_ECOSYSTEM_SOURCE_REGISTRY: CortexEcosystemSourceDefinition[] = [
  {
    cadence: "on-event",
    description: "Raw SSI respondent input summary. Individual respondent identifiers remain protected.",
    id: "ssi-respondent-inputs",
    maxAgeHours: 30,
    project: "index",
    supportedTypes: ["ssi-respondent-inputs"],
    visibility: "protected",
  },
  {
    cadence: "daily",
    description: "Published SSI index snapshot and its calculation consistency checks.",
    id: "ssi-index-snapshots",
    maxAgeHours: 30,
    project: "index",
    supportedTypes: ["ssi-index-snapshot"],
    visibility: "internal",
  },
  {
    cadence: "daily",
    description: "Rendered SSI Telegram draft fingerprint and deterministic report checks.",
    id: "ssi-telegram-drafts",
    maxAgeHours: 30,
    project: "index",
    supportedTypes: ["ssi-telegram-draft"],
    visibility: "internal",
  },
  {
    cadence: "on-event",
    description: "Raw MediaHub source and relevance-monitoring snapshot summary.",
    id: "mediahub-source-snapshots",
    maxAgeHours: 36,
    project: "mediahub",
    supportedTypes: ["mediahub-source-snapshot"],
    visibility: "protected",
  },
  {
    cadence: "on-event",
    description: "MediaHub report draft backed by a saved Cortex context pack.",
    id: "mediahub-report-drafts",
    maxAgeHours: 36,
    project: "mediahub",
    supportedTypes: ["mediahub-report-draft"],
    visibility: "internal",
  },
  {
    cadence: "on-event",
    description: "Confirmed MediaHub Telegram delivery metadata without report body duplication.",
    id: "mediahub-publications",
    maxAgeHours: 36,
    project: "mediahub",
    supportedTypes: ["mediahub-publication"],
    visibility: "internal",
  },
  {
    cadence: "on-event",
    description: "MN7R Monitor observation summary submitted through the protected Cortex bridge.",
    id: "mn7r-monitor-observations",
    maxAgeHours: 24,
    project: "mn7r",
    supportedTypes: ["mn7r-monitor-observation"],
    visibility: "protected",
  },
];

export type CortexEcosystemEvidenceEvent = {
  entity: { id: string; type: string };
  eventType: CortexEcosystemEvidenceType;
  id: string;
  knownGaps: string[];
  metrics: Record<string, number>;
  occurredAt: string;
  product: "1D3X Cortex";
  project: CortexEcosystemProject;
  provenance: {
    parentEventIds: string[];
    sourceId: string;
    sourceVersion: string;
  };
  recordedAt: string;
  summary: string;
  sourceTenantId?: string;
  tenantId: string;
  visibility: Exclude<CortexVisibility, "secret">;
};

export type CortexEcosystemEvidenceContextPack = {
  createdAt: string;
  evidence: CortexEcosystemEvidenceEvent[];
  freshness: Array<{
    ageHours: number | null;
    sourceId: string;
    status: "fresh" | "missing" | "stale";
  }>;
  knownGaps: string[];
  product: "1D3X Cortex";
  purpose: "ecosystem-evidence";
  sourceIds: string[];
  tenantId: string;
};

export type CortexEcosystemEvidenceValidation = { errors: string[]; ok: boolean };

export type CortexEcosystemEvidenceInput = Omit<CortexEcosystemEvidenceEvent, "id" | "product" | "recordedAt"> & {
  recordedAt?: string;
};

let storageReady: Promise<void> | null = null;

export function buildCortexEcosystemEvidenceEvent(input: CortexEcosystemEvidenceInput): CortexEcosystemEvidenceEvent {
  const normalized = normalizeEventInput(input);
  const fingerprint = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  return {
    ...normalized,
    id: `cortex-evidence:${normalized.tenantId}:${normalized.project}:${normalized.eventType}:${fingerprint.slice(0, 20)}`,
    product: "1D3X Cortex",
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
}

export function validateCortexEcosystemEvidenceEvent(value: unknown): CortexEcosystemEvidenceValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { errors: ["event must be an object"], ok: false };
  const event = value as Partial<CortexEcosystemEvidenceInput>;
  if (!isProject(event.project)) errors.push("project is invalid");
  if (!isEventType(event.eventType)) errors.push("eventType is invalid");
  if (typeof event.tenantId !== "string" || !event.tenantId.trim() || event.tenantId.length > 120) errors.push("tenantId is invalid");
  if (event.sourceTenantId !== undefined && (typeof event.sourceTenantId !== "string" || !event.sourceTenantId.trim() || event.sourceTenantId.length > 120)) errors.push("sourceTenantId is invalid");
  if (typeof event.summary !== "string" || !event.summary.trim() || event.summary.length > 2_000) errors.push("summary is invalid");
  if (typeof event.occurredAt !== "string" || Number.isNaN(Date.parse(event.occurredAt))) errors.push("occurredAt is invalid");
  if (!isVisibility(event.visibility)) errors.push("visibility is invalid");
  if (!isEntity(event.entity)) errors.push("entity is invalid");
  if (!isProvenance(event.provenance)) errors.push("provenance is invalid");
  if (!isStringArray(event.knownGaps, 24, 400)) errors.push("knownGaps is invalid");
  if (!isNumericRecord(event.metrics)) errors.push("metrics is invalid");
  const source = typeof event.provenance?.sourceId === "string" ? getSource(event.provenance.sourceId) : undefined;
  if (!source) errors.push("provenance.sourceId is not registered");
  if (source && event.project !== source.project) errors.push("project does not match registered source");
  if (source && event.eventType && !source.supportedTypes.includes(event.eventType)) errors.push("eventType does not match registered source");
  if (source && event.visibility && event.visibility !== source.visibility) errors.push("visibility does not match registered source");
  return { errors, ok: errors.length === 0 };
}

export async function persistCortexEcosystemEvidenceEvent(input: CortexEcosystemEvidenceInput) {
  const validation = validateCortexEcosystemEvidenceEvent(input);
  if (!validation.ok) throw new Error(`Invalid Cortex ecosystem evidence event: ${validation.errors.join("; ")}`);
  if (!hasDatabaseUrl()) return null;

  const event = buildCortexEcosystemEvidenceEvent(input);
  await ensureStorage();
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexEcosystemEvidenceLedger" ("id", "tenantId", "project", "sourceId", "eventType", "visibility", "occurredAt", "recordJson", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $8::jsonb, $9::timestamp) ON CONFLICT ("id") DO NOTHING`,
    event.id,
    event.tenantId,
    event.project,
    event.provenance.sourceId,
    event.eventType,
    event.visibility,
    event.occurredAt,
    JSON.stringify(event),
    event.recordedAt,
  );
  return event;
}

export async function persistCortexEcosystemEvidenceEvents(inputs: CortexEcosystemEvidenceInput[]) {
  const records = [] as CortexEcosystemEvidenceEvent[];
  for (const input of inputs) {
    const record = await persistCortexEcosystemEvidenceEvent(input);
    if (record) records.push(record);
  }
  return records;
}

export async function listCortexEcosystemEvidenceEvents(input: {
  includeProtected?: boolean;
  limit?: number;
  projects?: CortexEcosystemProject[];
  tenantId: string;
}) {
  if (!hasDatabaseUrl()) return [] as CortexEcosystemEvidenceEvent[];
  await ensureStorage();
  const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 30)));
  const params: unknown[] = [input.tenantId];
  const filters = [`"tenantId" = $1`];
  if (!input.includeProtected) filters.push(`"visibility" IN ('public', 'internal')`);
  if (input.projects?.length) {
    params.push(input.projects);
    filters.push(`"project" = ANY($${params.length}::text[])`);
  }
  params.push(limit);
  const rows = await db.$queryRawUnsafe<Array<{ recordJson: unknown }>>(
    `SELECT "recordJson" FROM "CortexEcosystemEvidenceLedger" WHERE ${filters.join(" AND ")} ORDER BY "occurredAt" DESC, "createdAt" DESC LIMIT $${params.length}`,
    ...params,
  );
  return rows.map((row) => row.recordJson as CortexEcosystemEvidenceEvent);
}

export async function buildCortexEcosystemEvidenceContextPack(input: {
  includeProtected?: boolean;
  projects?: CortexEcosystemProject[];
  tenantId: string;
}): Promise<CortexEcosystemEvidenceContextPack> {
  const evidence = await listCortexEcosystemEvidenceEvents({ ...input, limit: 60 });
  const sourceIds = applicableSources(input.projects).map((source) => source.id);
  const now = Date.now();
  const freshness: CortexEcosystemEvidenceContextPack["freshness"] = applicableSources(input.projects).map((source) => {
    const latest = evidence.find((event) => event.provenance.sourceId === source.id);
    const ageHours = latest ? Math.max(0, (now - Date.parse(latest.occurredAt)) / 3_600_000) : null;
    return {
      ageHours: ageHours == null ? null : Math.round(ageHours * 10) / 10,
      sourceId: source.id,
      status: ageHours == null ? "missing" : ageHours > source.maxAgeHours ? "stale" : "fresh",
    };
  });
  const knownGaps = Array.from(new Set([
    ...evidence.flatMap((event) => event.knownGaps),
    ...freshness.filter((item) => item.status !== "fresh").map((item) => `${item.sourceId} is ${item.status}`),
  ])).sort();
  return {
    createdAt: new Date().toISOString(),
    evidence,
    freshness,
    knownGaps,
    product: "1D3X Cortex",
    purpose: "ecosystem-evidence",
    sourceIds,
    tenantId: input.tenantId,
  };
}

export function renderCortexEcosystemEvidenceAsContextPack(input: {
  allowProtected?: boolean;
  context: CortexEcosystemEvidenceContextPack;
  purpose: CortexContextPack["purpose"];
  query: string;
}): CortexContextPack {
  return buildCortexContextPack({
    allowProtected: input.allowProtected,
    evidence: input.context.evidence.map((event) => ({
      extractedAt: event.recordedAt,
      hash: event.id,
      id: event.id,
      sourceId: event.provenance.sourceId,
      summary: event.summary,
      title: `${event.project}:${event.eventType}`,
      urlOrPath: `cortex-ecosystem-evidence:${event.entity.type}:${event.entity.id}`,
      visibility: event.visibility,
    })),
    knownGaps: input.context.knownGaps,
    purpose: input.purpose,
    query: input.query,
  });
}

export function buildCortexSsiEcosystemEvidenceEvents(input: {
  createdAt: string;
  date: string;
  findings: Array<{ code: string; severity: "critical" | "info" | "warning" }>;
  inputs: Array<{ respondentId: string }>;
  snapshots: Array<unknown>;
  stage: "index_snapshot" | "telegram_draft";
  telegram?: { messageHash: string; messageLength: number };
  tenantId: string;
}): CortexEcosystemEvidenceInput[] {
  const knownGaps = input.findings.filter((finding) => finding.severity !== "info").map((finding) => `integrity:${finding.code}`);
  const base = {
    knownGaps,
    metrics: { findingCount: input.findings.length, warningCount: input.findings.filter((finding) => finding.severity === "warning").length },
    occurredAt: `${input.date}T23:59:59.000Z`,
    project: "index" as const,
    sourceTenantId: input.tenantId,
    tenantId: "ecosystem",
  };
  if (input.stage === "telegram_draft") {
    return [{
      ...base,
      entity: { id: `${input.tenantId}:${input.date}:telegram`, type: "ssi-telegram-draft" },
      eventType: "ssi-telegram-draft",
      metrics: { ...base.metrics, messageLength: input.telegram?.messageLength ?? 0 },
      provenance: { parentEventIds: [], sourceId: "ssi-telegram-drafts", sourceVersion: "ssi-integrity-v1" },
      summary: `SSI Telegram draft checked for ${input.date}; ${input.findings.length} deterministic integrity finding(s).`,
      visibility: "internal",
    }];
  }
  return [
    {
      ...base,
      entity: { id: `${input.tenantId}:${input.date}:inputs`, type: "ssi-respondent-inputs" },
      eventType: "ssi-respondent-inputs",
      metrics: { ...base.metrics, inputCount: input.inputs.length, respondentCount: new Set(input.inputs.map((item) => item.respondentId)).size },
      provenance: { parentEventIds: [], sourceId: "ssi-respondent-inputs", sourceVersion: "ssi-integrity-v1" },
      summary: `SSI respondent input snapshot checked for ${input.date}; ${input.inputs.length} input(s) across ${new Set(input.inputs.map((item) => item.respondentId)).size} respondent(s).`,
      visibility: "protected",
    },
    {
      ...base,
      entity: { id: `${input.tenantId}:${input.date}:index`, type: "ssi-index-snapshot" },
      eventType: "ssi-index-snapshot",
      metrics: { ...base.metrics, positionCount: input.snapshots.length },
      provenance: { parentEventIds: [], sourceId: "ssi-index-snapshots", sourceVersion: "ssi-integrity-v1" },
      summary: `SSI index snapshot checked for ${input.date}; ${input.snapshots.length} market position(s).`,
      visibility: "internal",
    },
  ];
}

export function buildCortexMediaHubEcosystemEvidenceEvents(input: {
  contextPack: { evidence: Array<{ sourceId: string; visibility: CortexVisibility }>; knownGaps: string[]; sourceIds: string[] };
  kind: "daily" | "weekly" | "monthly";
  periodEndDate: string;
  periodStartDate: string;
  reportId: string;
  tenantId: string;
}): CortexEcosystemEvidenceInput[] {
  const rawEvidenceCount = input.contextPack.evidence.filter((item) => item.sourceId === "mediahub-raw-monitoring-items").length;
  const protectedEvidenceCount = input.contextPack.evidence.filter((item) => item.visibility === "protected").length;
  const base = {
    knownGaps: input.contextPack.knownGaps,
    occurredAt: `${input.periodEndDate}T23:59:59.000Z`,
    project: "mediahub" as const,
    sourceTenantId: input.tenantId,
    tenantId: "ecosystem",
  };
  return [
    {
      ...base,
      entity: { id: input.reportId, type: "mediahub-source-snapshot" },
      eventType: "mediahub-source-snapshot",
      metrics: { protectedEvidenceCount, rawEvidenceCount, sourceCount: input.contextPack.sourceIds.length },
      provenance: { parentEventIds: [], sourceId: "mediahub-source-snapshots", sourceVersion: "mediahub-context-v1" },
      summary: `MediaHub ${input.kind} source snapshot for ${input.periodStartDate} to ${input.periodEndDate}; ${rawEvidenceCount} raw monitoring evidence item(s).`,
      visibility: "protected",
    },
    {
      ...base,
      entity: { id: input.reportId, type: "mediahub-report-draft" },
      eventType: "mediahub-report-draft",
      metrics: { evidenceCount: input.contextPack.evidence.length, knownGapCount: input.contextPack.knownGaps.length, sourceCount: input.contextPack.sourceIds.length },
      provenance: { parentEventIds: [], sourceId: "mediahub-report-drafts", sourceVersion: "mediahub-context-v1" },
      summary: `MediaHub ${input.kind} report draft ${input.reportId} is backed by ${input.contextPack.evidence.length} evidence item(s).`,
      visibility: "internal",
    },
  ];
}

export function buildCortexMediaHubPublicationEvidenceEvent(input: {
  kind: "daily" | "weekly" | "monthly";
  messageCount: number;
  periodEndDate: string;
  reportId: string;
  tenantId: string;
}): CortexEcosystemEvidenceInput {
  return {
    entity: { id: input.reportId, type: "mediahub-publication" },
    eventType: "mediahub-publication",
    knownGaps: [],
    metrics: { messageCount: input.messageCount },
    occurredAt: new Date().toISOString(),
    project: "mediahub",
    provenance: { parentEventIds: [], sourceId: "mediahub-publications", sourceVersion: "mediahub-delivery-v1" },
    summary: `MediaHub ${input.kind} report ${input.reportId} delivered to Telegram for ${input.periodEndDate}.`,
    sourceTenantId: input.tenantId,
    tenantId: "ecosystem",
    visibility: "internal",
  };
}

function normalizeEventInput(input: CortexEcosystemEvidenceInput): Omit<CortexEcosystemEvidenceEvent, "id" | "product" | "recordedAt"> {
  return {
    ...input,
    entity: { id: input.entity.id.trim(), type: input.entity.type.trim() },
    knownGaps: [...new Set(input.knownGaps.map((gap) => gap.trim()).filter(Boolean))].sort(),
    metrics: Object.fromEntries(Object.entries(input.metrics).sort(([left], [right]) => left.localeCompare(right))),
    occurredAt: new Date(input.occurredAt).toISOString(),
    provenance: {
      parentEventIds: [...new Set(input.provenance.parentEventIds)].sort(),
      sourceId: input.provenance.sourceId,
      sourceVersion: input.provenance.sourceVersion,
    },
    summary: input.summary.trim(),
    sourceTenantId: input.sourceTenantId?.trim() || undefined,
    tenantId: input.tenantId.trim(),
  };
}

async function ensureStorage() {
  if (!hasDatabaseUrl()) return;
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexEcosystemEvidenceLedger" ("id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "project" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "visibility" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL, "recordJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexEcosystemEvidenceLedger_tenant_occurred_idx" ON "CortexEcosystemEvidenceLedger"("tenantId", "occurredAt" DESC)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexEcosystemEvidenceLedger_tenant_project_source_idx" ON "CortexEcosystemEvidenceLedger"("tenantId", "project", "sourceId", "occurredAt" DESC)`);
  })();
  await storageReady;
}

function applicableSources(projects?: CortexEcosystemProject[]) {
  return projects?.length ? CORTEX_ECOSYSTEM_SOURCE_REGISTRY.filter((source) => projects.includes(source.project)) : CORTEX_ECOSYSTEM_SOURCE_REGISTRY;
}

function getSource(sourceId: string) {
  return CORTEX_ECOSYSTEM_SOURCE_REGISTRY.find((source) => source.id === sourceId);
}

function isProject(value: unknown): value is CortexEcosystemProject {
  return value === "index" || value === "mediahub" || value === "mn7r" || value === "cropto" || value === "ecosystem";
}

function isEventType(value: unknown): value is CortexEcosystemEvidenceType {
  return typeof value === "string" && CORTEX_ECOSYSTEM_SOURCE_REGISTRY.some((source) => source.supportedTypes.includes(value as CortexEcosystemEvidenceType));
}

function isVisibility(value: unknown): value is Exclude<CortexVisibility, "secret"> {
  return value === "public" || value === "internal" || value === "protected";
}

function isEntity(value: unknown): value is CortexEcosystemEvidenceEvent["entity"] {
  if (!value || typeof value !== "object") return false;
  const entity = value as Partial<CortexEcosystemEvidenceEvent["entity"]>;
  return typeof entity.id === "string" && entity.id.trim().length > 0 && entity.id.length <= 200 && typeof entity.type === "string" && entity.type.trim().length > 0 && entity.type.length <= 120;
}

function isProvenance(value: unknown): value is CortexEcosystemEvidenceEvent["provenance"] {
  if (!value || typeof value !== "object") return false;
  const provenance = value as Partial<CortexEcosystemEvidenceEvent["provenance"]>;
  return typeof provenance.sourceId === "string" && provenance.sourceId.trim().length > 0 && typeof provenance.sourceVersion === "string" && provenance.sourceVersion.trim().length > 0 && isStringArray(provenance.parentEventIds, 50, 300);
}

function isStringArray(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => typeof item === "string" && item.length <= maxLength);
}

function isNumericRecord(value: unknown): value is Record<string, number> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.entries(value).length <= 30 && Object.entries(value as Record<string, unknown>).every(([key, item]) => key.length > 0 && key.length <= 80 && typeof item === "number" && Number.isFinite(item));
}
