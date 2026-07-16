import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { CortexVisibility } from "@/lib/commodity-intelligence-layer";
import type { CortexContextPack } from "@/lib/commodity-intelligence-layer";
import {
  buildCortexSgrLiteCheckpointFromWorkforcePacket,
  persistCortexSgrLiteCheckpoint,
} from "@/lib/cortex-sgr-lite";

export type CortexWorkforceDiversityMode = "off" | "research" | "adversarial";

export type CortexWorkforceEvidenceRef = {
  capturedAt: string;
  freshness?: string;
  id: string;
  sourceId: string;
  timestamp?: string;
  units?: string;
};

export type CortexWorkforceCandidate = {
  candidateId: string;
  confidence?: "low" | "medium" | "high";
  counterevidence: CortexWorkforceEvidenceRef[];
  evidence: CortexWorkforceEvidenceRef[];
  evidenceChecklist: string[];
  hypothesis: string;
  marketRegime?: string;
  missingData: string[];
  officerReview: "pending" | "accepted" | "rejected" | "blocked";
  probabilityUse: "ranking_hint_only";
  verbalizedProbability?: number;
};

export type CortexMarketWorkforcePacket = {
  assumed: string[];
  blockedBy: string[];
  candidates: CortexWorkforceCandidate[];
  correlationId: string;
  derived: string[];
  diversityMode: CortexWorkforceDiversityMode;
  humanApproval: {
    required: boolean;
    reviewedAt?: string;
    reviewerRole?: string;
    status: "pending" | "approved" | "rejected" | "not_required";
  };
  observed: CortexWorkforceEvidenceRef[];
  outcome: "pending" | "executed" | "published" | "deferred" | "rejected" | "superseded";
  packetType: "market-workforce";
  recommended: string[];
  roles: string[];
  taskId: string;
  trigger: string;
};

export type CortexMarketWorkforceLedgerRecord = {
  correlationId: string;
  createdAt: string;
  diversityMode: CortexWorkforceDiversityMode;
  id: string;
  outcome: CortexMarketWorkforcePacket["outcome"];
  packet: CortexMarketWorkforcePacket;
  packHash: string;
  product: "1D3X Cortex";
  taskId: string;
  tenantId: string;
  visibility: CortexVisibility;
};

export type CortexMarketWorkforceLedgerFilters = {
  correlationId?: string | null;
  limit?: number | null;
  taskId?: string | null;
  tenantId?: string | null;
};

export type CortexMarketWorkforcePacketValidation = {
  errors: string[];
  ok: boolean;
};

let storageReady: Promise<void> | null = null;

export function buildCortexMarketWorkforceLedgerRecord(input: {
  createdAt?: string;
  packet: CortexMarketWorkforcePacket;
  tenantId: string;
  visibility?: CortexVisibility;
}): CortexMarketWorkforceLedgerRecord {
  const packHash = hashCortexMarketWorkforcePacket(input.packet);
  return {
    correlationId: input.packet.correlationId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    diversityMode: input.packet.diversityMode,
    id: `cortex-workforce:${input.tenantId}:${input.packet.taskId}:${packHash.slice(0, 16)}`,
    outcome: input.packet.outcome,
    packet: input.packet,
    packHash,
    product: "1D3X Cortex",
    taskId: input.packet.taskId,
    tenantId: input.tenantId,
    visibility: input.visibility ?? "protected",
  };
}

export function buildCortexMediaHubReportProposalPacket(input: {
  contextPack: CortexContextPack;
  reportId: string;
  reportKind: "daily" | "weekly" | "monthly";
  tenantId: string;
}): CortexMarketWorkforcePacket {
  const knownGaps = input.contextPack.knownGaps;
  return {
    assumed: knownGaps.map((gap) => `unresolved gap: ${gap}`),
    blockedBy: knownGaps.length > 0 ? ["review required for known context gaps"] : [],
    candidates: [{
      candidateId: "citation-and-freshness-review",
      confidence: "low",
      counterevidence: [],
      evidence: input.contextPack.evidence.map(toWorkforceEvidenceRef),
      evidenceChecklist: [
        "Verify every material claim against cited evidence.",
        "Verify timestamps, source freshness and tenant scope before delivery.",
      ],
      hypothesis: "The draft report is suitable for review only after citations, freshness and known gaps are checked.",
      missingData: knownGaps,
      officerReview: "pending",
      probabilityUse: "ranking_hint_only",
    }],
    correlationId: `mediahub-report:${input.tenantId}:${input.reportId}`,
    derived: [
      `reportKind=${input.reportKind}`,
      `evidenceCount=${input.contextPack.evidence.length}`,
      `excludedEvidenceCount=${input.contextPack.excluded.length}`,
    ],
    diversityMode: "off",
    humanApproval: { required: true, reviewerRole: "risk-compliance-officer", status: "pending" },
    observed: input.contextPack.evidence.map(toWorkforceEvidenceRef),
    outcome: "pending",
    packetType: "market-workforce",
    recommended: ["Review the generated SSI/Telegram report before publication or delivery."],
    roles: ["mediahub-report-analyst", "risk-compliance-officer"],
    taskId: `mediahub-report:${input.reportId}`,
    trigger: "ssi-telegram-report-proposal",
  };
}

export async function persistCortexMarketWorkforcePacket(input: {
  packet: CortexMarketWorkforcePacket;
  tenantId: string;
  visibility?: CortexVisibility;
}) {
  if (!hasDatabaseUrl()) return null;

  const record = buildCortexMarketWorkforceLedgerRecord(input);
  await ensureCortexMarketWorkforceLedgerStorage();
  await db.$executeRawUnsafe(
    `
      INSERT INTO "CortexMarketWorkforceLedger" (
        "id", "tenantId", "taskId", "correlationId", "diversityMode",
        "outcome", "visibility", "packHash", "packetJson", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamp)
      ON CONFLICT ("id") DO NOTHING
    `,
    record.id,
    record.tenantId,
    record.taskId,
    record.correlationId,
    record.diversityMode,
    record.outcome,
    record.visibility,
    record.packHash,
    JSON.stringify(record.packet),
    record.createdAt,
  );

  // Shadow-only operational checkpoint. It must never affect a workforce
  // packet's persistence result, publication path, or external delivery.
  try {
    await persistCortexSgrLiteCheckpoint({
      checkpoint: buildCortexSgrLiteCheckpointFromWorkforcePacket({
        createdAt: record.createdAt,
        packet: input.packet,
        sourceVisibility: toSgrLiteVisibility(record.visibility),
      }),
      tenantId: input.tenantId,
    });
  } catch (error) {
    console.warn(
      "Cortex SGR-lite shadow checkpoint was not persisted.",
      error instanceof Error ? error.message : "unknown error",
    );
  }

  return record;
}

export async function listCortexMarketWorkforceRecords(
  filters: CortexMarketWorkforceLedgerFilters = {},
) {
  if (!hasDatabaseUrl()) return [] as CortexMarketWorkforceLedgerRecord[];

  await ensureCortexMarketWorkforceLedgerStorage();
  const query = buildCortexMarketWorkforceListQuery(filters);
  const rows = await db.$queryRawUnsafe<CortexMarketWorkforceLedgerRow[]>(query.sql, ...query.params);
  return rows.map(mapCortexMarketWorkforceRow);
}

export function normalizeCortexMarketWorkforceListLimit(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) return 25;
  return Math.max(1, Math.min(100, Math.trunc(value as number)));
}

/**
 * Workforce packets are durable evidence records. Keep this validation local
 * and deterministic so a malformed or prematurely-approved packet cannot be
 * treated as an operational outcome later.
 */
export function validateCortexMarketWorkforcePacket(value: unknown): CortexMarketWorkforcePacketValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { errors: ["packet must be an object"], ok: false };
  }

  const packet = value as Partial<CortexMarketWorkforcePacket>;
  if (packet.packetType !== "market-workforce") errors.push("packetType must be market-workforce");
  for (const key of ["taskId", "correlationId", "trigger"] as const) {
    if (typeof packet[key] !== "string" || packet[key].trim().length === 0) errors.push(`${key} is required`);
  }
  if (!isDiversityMode(packet.diversityMode)) errors.push("diversityMode is invalid");
  for (const key of ["candidates", "observed", "derived", "assumed", "recommended", "blockedBy", "roles"] as const) {
    if (!Array.isArray(packet[key])) errors.push(`${key} must be an array`);
  }
  if (!isHumanApproval(packet.humanApproval)) errors.push("humanApproval is invalid");
  if (!isOutcome(packet.outcome)) errors.push("outcome is invalid");

  const candidateIds = new Set<string>();
  for (const candidate of Array.isArray(packet.candidates) ? packet.candidates : []) {
    if (!candidate || typeof candidate !== "object") {
      errors.push("candidate must be an object");
      continue;
    }
    const item = candidate as Partial<CortexWorkforceCandidate>;
    if (typeof item.candidateId !== "string" || item.candidateId.trim().length === 0) {
      errors.push("candidateId is required");
    } else if (candidateIds.has(item.candidateId)) {
      errors.push(`candidateId ${item.candidateId} is duplicated`);
    } else {
      candidateIds.add(item.candidateId);
    }
    if (typeof item.hypothesis !== "string" || item.hypothesis.trim().length === 0) errors.push("candidate hypothesis is required");
    if (item.probabilityUse !== "ranking_hint_only") errors.push("candidate probabilityUse must be ranking_hint_only");
    if (item.verbalizedProbability !== undefined && (!Number.isFinite(item.verbalizedProbability) || item.verbalizedProbability < 0 || item.verbalizedProbability > 1)) {
      errors.push("candidate verbalizedProbability must be between 0 and 1");
    }
    if (!isOfficerReview(item.officerReview)) errors.push("candidate officerReview is invalid");
    for (const key of ["evidence", "counterevidence", "evidenceChecklist", "missingData"] as const) {
      if (!Array.isArray(item[key])) errors.push(`candidate ${key} must be an array`);
    }
    for (const ref of [...(item.evidence ?? []), ...(item.counterevidence ?? [])]) {
      if (!isEvidenceRef(ref)) errors.push("candidate evidence reference is invalid");
    }
  }

  for (const ref of Array.isArray(packet.observed) ? packet.observed : []) {
    if (!isEvidenceRef(ref)) errors.push("observed evidence reference is invalid");
  }
  if ((packet.outcome === "executed" || packet.outcome === "published") && packet.humanApproval?.status !== "approved") {
    errors.push("executed or published packets require approved humanApproval");
  }

  return { errors, ok: errors.length === 0 };
}

function isDiversityMode(value: unknown): value is CortexWorkforceDiversityMode {
  return value === "off" || value === "research" || value === "adversarial";
}

function toSgrLiteVisibility(visibility: CortexVisibility): Exclude<CortexVisibility, "secret"> {
  return visibility === "secret" ? "protected" : visibility;
}

function isOutcome(value: unknown): value is CortexMarketWorkforcePacket["outcome"] {
  return value === "pending" || value === "executed" || value === "published" || value === "deferred" || value === "rejected" || value === "superseded";
}

function isOfficerReview(value: unknown): value is CortexWorkforceCandidate["officerReview"] {
  return value === "pending" || value === "accepted" || value === "rejected" || value === "blocked";
}

function isHumanApproval(value: unknown): value is CortexMarketWorkforcePacket["humanApproval"] {
  if (!value || typeof value !== "object") return false;
  const approval = value as Partial<CortexMarketWorkforcePacket["humanApproval"]>;
  return typeof approval.required === "boolean" &&
    (approval.status === "pending" || approval.status === "approved" || approval.status === "rejected" || approval.status === "not_required");
}

function isEvidenceRef(value: unknown): value is CortexWorkforceEvidenceRef {
  if (!value || typeof value !== "object") return false;
  const ref = value as Partial<CortexWorkforceEvidenceRef>;
  return typeof ref.id === "string" && ref.id.trim().length > 0 &&
    typeof ref.sourceId === "string" && ref.sourceId.trim().length > 0 &&
    typeof ref.capturedAt === "string" && !Number.isNaN(Date.parse(ref.capturedAt));
}

function toWorkforceEvidenceRef(evidence: CortexContextPack["evidence"][number]): CortexWorkforceEvidenceRef {
  return {
    capturedAt: evidence.extractedAt,
    id: evidence.id,
    sourceId: evidence.sourceId,
  };
}

async function ensureCortexMarketWorkforceLedgerStorage() {
  if (!hasDatabaseUrl()) return;

  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CortexMarketWorkforceLedger" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "taskId" TEXT NOT NULL,
        "correlationId" TEXT NOT NULL,
        "diversityMode" TEXT NOT NULL,
        "outcome" TEXT NOT NULL,
        "visibility" TEXT NOT NULL,
        "packHash" TEXT NOT NULL,
        "packetJson" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CortexMarketWorkforceLedger_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CortexMarketWorkforceLedger_tenant_task_idx"
      ON "CortexMarketWorkforceLedger"("tenantId", "taskId", "createdAt" DESC)
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CortexMarketWorkforceLedger_correlation_idx"
      ON "CortexMarketWorkforceLedger"("correlationId", "createdAt" DESC)
    `);
  })();

  await storageReady;
}

type CortexMarketWorkforceLedgerRow = {
  correlationId: string;
  createdAt: Date;
  diversityMode: CortexWorkforceDiversityMode;
  id: string;
  outcome: CortexMarketWorkforcePacket["outcome"];
  packHash: string;
  packetJson: CortexMarketWorkforcePacket;
  taskId: string;
  tenantId: string;
  visibility: CortexVisibility;
};

function buildCortexMarketWorkforceListQuery(filters: CortexMarketWorkforceLedgerFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.tenantId) {
    params.push(filters.tenantId);
    conditions.push(`"tenantId" = $${params.length}`);
  }
  if (filters.taskId) {
    params.push(filters.taskId);
    conditions.push(`"taskId" = $${params.length}`);
  }
  if (filters.correlationId) {
    params.push(filters.correlationId);
    conditions.push(`"correlationId" = $${params.length}`);
  }

  params.push(normalizeCortexMarketWorkforceListLimit(filters.limit));
  return {
    params,
    sql: `
      SELECT "id", "tenantId", "taskId", "correlationId", "diversityMode",
        "outcome", "visibility", "packHash", "packetJson", "createdAt"
      FROM "CortexMarketWorkforceLedger"
      ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY "createdAt" DESC
      LIMIT $${params.length}
    `,
  };
}

function mapCortexMarketWorkforceRow(row: CortexMarketWorkforceLedgerRow): CortexMarketWorkforceLedgerRecord {
  return {
    correlationId: row.correlationId,
    createdAt: row.createdAt.toISOString(),
    diversityMode: row.diversityMode,
    id: row.id,
    outcome: row.outcome,
    packet: row.packetJson,
    packHash: row.packHash,
    product: "1D3X Cortex",
    taskId: row.taskId,
    tenantId: row.tenantId,
    visibility: row.visibility,
  };
}

function hashCortexMarketWorkforcePacket(packet: CortexMarketWorkforcePacket) {
  return createHash("sha256")
    .update(stableStringify(packet))
    .digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJson(item)]),
    );
  }
  return value;
}
