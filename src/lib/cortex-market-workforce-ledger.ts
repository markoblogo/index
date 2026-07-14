import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { CortexVisibility } from "@/lib/commodity-intelligence-layer";

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
