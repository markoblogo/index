import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { CortexContextPack, CortexVisibility } from "@/lib/commodity-intelligence-layer";
import {
  buildCortexMediaHubReportProposalPacket,
  persistCortexMarketWorkforcePacket,
} from "@/lib/cortex-market-workforce-ledger";

export type CortexLedgerTarget = {
  entityId?: string | null;
  entityType: "mediahub-report" | "manual-analysis" | "monitor-comparison" | "execution-context";
  periodEndDate?: string | null;
  periodStartDate?: string | null;
  reportKind?: string | null;
  tenantId: string;
};

export type CortexContextPackLedgerRecord = {
  createdAt: string;
  id: string;
  metrics: {
    evidenceCount: number;
    excludedCount: number;
    knownGapCount: number;
  };
  pack: CortexContextPack;
  packHash: string;
  product: CortexContextPack["product"];
  purpose: CortexContextPack["purpose"];
  query: string;
  sourceIds: string[];
  target: CortexLedgerTarget;
  visibility: CortexVisibility;
};

export type CortexLedgerListFilters = {
  entityType?: CortexLedgerTarget["entityType"] | null;
  limit?: number | null;
  purpose?: CortexContextPack["purpose"] | null;
  reportKind?: string | null;
  tenantId?: string | null;
};

let storageReady: Promise<void> | null = null;

export function buildCortexContextPackLedgerRecord(input: {
  createdAt?: string;
  pack: CortexContextPack;
  target: CortexLedgerTarget;
}): CortexContextPackLedgerRecord {
  const normalizedTarget = normalizeCortexLedgerTarget(input.target);
  const sourceIds = [...input.pack.sourceIds].sort();
  const visibility = getCortexPackDominantVisibility(
    input.pack.evidence.map((item) => item.visibility),
  );

  return {
    createdAt: input.createdAt ?? new Date().toISOString(),
    id: buildCortexLedgerRecordId(normalizedTarget),
    metrics: {
      evidenceCount: input.pack.evidence.length,
      excludedCount: input.pack.excluded.length,
      knownGapCount: input.pack.knownGaps.length,
    },
    pack: input.pack,
    packHash: hashCortexContextPack(input.pack),
    product: input.pack.product,
    purpose: input.pack.purpose,
    query: input.pack.query,
    sourceIds,
    target: normalizedTarget,
    visibility,
  };
}

export function getCortexPackDominantVisibility(items: CortexVisibility[]): CortexVisibility {
  const rank: Record<CortexVisibility, number> = {
    public: 0,
    internal: 1,
    protected: 2,
    secret: 3,
  };

  return items.reduce<CortexVisibility>(
    (dominant, item) => rank[item] > rank[dominant] ? item : dominant,
    "public",
  );
}

export async function persistCortexContextPack(input: {
  pack: CortexContextPack;
  target: CortexLedgerTarget;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const record = buildCortexContextPackLedgerRecord(input);
  await ensureCortexContextPackLedgerStorage();
  await db.$executeRawUnsafe(
    `
      INSERT INTO "CortexContextPackLedger" (
        "id", "tenantId", "entityType", "entityId", "purpose", "query",
        "product", "visibility", "sourceIds", "metricsJson", "packHash",
        "packJson", "periodStart", "periodEnd", "reportKind", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9::jsonb, $10::jsonb, $11,
        $12::jsonb, $13::date, $14::date, $15, $16::timestamp, NOW()
      )
      ON CONFLICT ("id")
      DO UPDATE SET
        "purpose" = EXCLUDED."purpose",
        "query" = EXCLUDED."query",
        "product" = EXCLUDED."product",
        "visibility" = EXCLUDED."visibility",
        "sourceIds" = EXCLUDED."sourceIds",
        "metricsJson" = EXCLUDED."metricsJson",
        "packHash" = EXCLUDED."packHash",
        "packJson" = EXCLUDED."packJson",
        "periodStart" = EXCLUDED."periodStart",
        "periodEnd" = EXCLUDED."periodEnd",
        "reportKind" = EXCLUDED."reportKind",
        "updatedAt" = NOW()
    `,
    record.id,
    record.target.tenantId,
    record.target.entityType,
    record.target.entityId ?? null,
    record.purpose,
    record.query,
    record.product,
    record.visibility,
    JSON.stringify(record.sourceIds),
    JSON.stringify(record.metrics),
    record.packHash,
    JSON.stringify(record.pack),
    record.target.periodStartDate ?? null,
    record.target.periodEndDate ?? null,
    record.target.reportKind ?? null,
    record.createdAt,
  );

  return record;
}

export async function persistMediaHubReportCortexContextPack(input: {
  content: {
    llm?: {
      cortexContextPack?: CortexContextPack;
    };
  };
  id: string;
  kind: "daily" | "weekly" | "monthly";
  periodEndDate: string;
  periodStartDate: string;
  tenantId: string;
}) {
  const pack = input.content.llm?.cortexContextPack;
  if (!pack) {
    return null;
  }

  const contextRecord = await persistCortexContextPack({
    pack,
    target: {
      entityId: input.id,
      entityType: "mediahub-report",
      periodEndDate: input.periodEndDate,
      periodStartDate: input.periodStartDate,
      reportKind: input.kind,
      tenantId: input.tenantId,
    },
  });
  await persistCortexMarketWorkforcePacket({
    packet: buildCortexMediaHubReportProposalPacket({
      contextPack: pack,
      reportId: input.id,
      reportKind: input.kind,
      tenantId: input.tenantId,
    }),
    tenantId: input.tenantId,
    visibility: "protected",
  });
  return contextRecord;
}

export async function getCortexContextPackRecord(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureCortexContextPackLedgerStorage();
  const rows = await db.$queryRawUnsafe<Array<{
    createdAt: Date;
    entityId: string | null;
    entityType: CortexLedgerTarget["entityType"];
    id: string;
    metricsJson: unknown;
    packHash: string;
    packJson: CortexContextPack;
    periodEnd: Date | null;
    periodStart: Date | null;
    product: CortexContextPack["product"];
    purpose: CortexContextPack["purpose"];
    query: string;
    reportKind: string | null;
    sourceIds: unknown;
    tenantId: string;
    visibility: CortexVisibility;
  }>>(
    `
      SELECT "id", "tenantId", "entityType", "entityId", "purpose", "query",
        "product", "visibility", "sourceIds", "metricsJson", "packHash",
        "packJson", "periodStart", "periodEnd", "reportKind", "createdAt"
      FROM "CortexContextPackLedger"
      WHERE "id" = $1
      LIMIT 1
    `,
    id,
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    metrics: parseCortexLedgerMetrics(row.metricsJson),
    pack: row.packJson,
    packHash: row.packHash,
    product: row.product,
    purpose: row.purpose,
    query: row.query,
    sourceIds: parseSourceIds(row.sourceIds),
    target: {
      entityId: row.entityId,
      entityType: row.entityType,
      periodEndDate: row.periodEnd ? toIsoDate(row.periodEnd) : null,
      periodStartDate: row.periodStart ? toIsoDate(row.periodStart) : null,
      reportKind: row.reportKind,
      tenantId: row.tenantId,
    },
    visibility: row.visibility,
  } satisfies CortexContextPackLedgerRecord;
}

export async function listCortexContextPackRecords(
  filters: CortexLedgerListFilters = {},
) {
  if (!hasDatabaseUrl()) {
    return [] as CortexContextPackLedgerRecord[];
  }

  await ensureCortexContextPackLedgerStorage();
  const query = buildCortexLedgerListQuery(filters);
  const rows = await db.$queryRawUnsafe<CortexLedgerRow[]>(query.sql, ...query.params);
  return rows.map(mapCortexLedgerRow);
}

export function normalizeCortexLedgerListLimit(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) {
    return 25;
  }

  return Math.max(1, Math.min(100, Math.trunc(value as number)));
}

async function ensureCortexContextPackLedgerStorage() {
  if (!hasDatabaseUrl()) {
    return;
  }

  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CortexContextPackLedger" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT,
        "purpose" TEXT NOT NULL,
        "query" TEXT NOT NULL,
        "product" TEXT NOT NULL,
        "visibility" TEXT NOT NULL,
        "sourceIds" JSONB NOT NULL,
        "metricsJson" JSONB NOT NULL,
        "packHash" TEXT NOT NULL,
        "packJson" JSONB NOT NULL,
        "periodStart" DATE,
        "periodEnd" DATE,
        "reportKind" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CortexContextPackLedger_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CortexContextPackLedger_tenant_entity_idx"
      ON "CortexContextPackLedger"("tenantId", "entityType", "entityId")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CortexContextPackLedger_tenant_purpose_period_idx"
      ON "CortexContextPackLedger"("tenantId", "purpose", "periodEnd" DESC)
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CortexContextPackLedger_packHash_idx"
      ON "CortexContextPackLedger"("packHash")
    `);
  })();

  await storageReady;
}

type CortexLedgerRow = {
  createdAt: Date;
  entityId: string | null;
  entityType: CortexLedgerTarget["entityType"];
  id: string;
  metricsJson: unknown;
  packHash: string;
  packJson: CortexContextPack;
  periodEnd: Date | null;
  periodStart: Date | null;
  product: CortexContextPack["product"];
  purpose: CortexContextPack["purpose"];
  query: string;
  reportKind: string | null;
  sourceIds: unknown;
  tenantId: string;
  visibility: CortexVisibility;
};

function buildCortexLedgerListQuery(filters: CortexLedgerListFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.tenantId) {
    params.push(filters.tenantId);
    conditions.push(`"tenantId" = $${params.length}`);
  }
  if (filters.entityType) {
    params.push(filters.entityType);
    conditions.push(`"entityType" = $${params.length}`);
  }
  if (filters.purpose) {
    params.push(filters.purpose);
    conditions.push(`"purpose" = $${params.length}`);
  }
  if (filters.reportKind) {
    params.push(filters.reportKind);
    conditions.push(`"reportKind" = $${params.length}`);
  }

  params.push(normalizeCortexLedgerListLimit(filters.limit));
  return {
    params,
    sql: `
      SELECT "id", "tenantId", "entityType", "entityId", "purpose", "query",
        "product", "visibility", "sourceIds", "metricsJson", "packHash",
        "packJson", "periodStart", "periodEnd", "reportKind", "createdAt"
      FROM "CortexContextPackLedger"
      ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY "createdAt" DESC
      LIMIT $${params.length}
    `,
  };
}

function mapCortexLedgerRow(row: CortexLedgerRow): CortexContextPackLedgerRecord {
  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    metrics: parseCortexLedgerMetrics(row.metricsJson),
    pack: row.packJson,
    packHash: row.packHash,
    product: row.product,
    purpose: row.purpose,
    query: row.query,
    sourceIds: parseSourceIds(row.sourceIds),
    target: {
      entityId: row.entityId,
      entityType: row.entityType,
      periodEndDate: row.periodEnd ? toIsoDate(row.periodEnd) : null,
      periodStartDate: row.periodStart ? toIsoDate(row.periodStart) : null,
      reportKind: row.reportKind,
      tenantId: row.tenantId,
    },
    visibility: row.visibility,
  };
}

function buildCortexLedgerRecordId(target: CortexLedgerTarget) {
  const entityId = target.entityId || `${target.reportKind ?? "context"}:${target.periodEndDate ?? "open"}`;
  return `cortex-pack:${target.tenantId}:${target.entityType}:${entityId}`;
}

function hashCortexContextPack(pack: CortexContextPack) {
  return createHash("sha256")
    .update(stableStringify(pack))
    .digest("hex");
}

function normalizeCortexLedgerTarget(target: CortexLedgerTarget): CortexLedgerTarget {
  return {
    entityId: target.entityId ?? null,
    entityType: target.entityType,
    periodEndDate: target.periodEndDate ?? null,
    periodStartDate: target.periodStartDate ?? null,
    reportKind: target.reportKind ?? null,
    tenantId: target.tenantId,
  };
}

function parseCortexLedgerMetrics(value: unknown): CortexContextPackLedgerRecord["metrics"] {
  if (!value || typeof value !== "object") {
    return { evidenceCount: 0, excludedCount: 0, knownGapCount: 0 };
  }

  const record = value as Partial<CortexContextPackLedgerRecord["metrics"]>;
  return {
    evidenceCount: Number(record.evidenceCount ?? 0),
    excludedCount: Number(record.excludedCount ?? 0),
    knownGapCount: Number(record.knownGapCount ?? 0),
  };
}

function parseSourceIds(value: unknown) {
  return Array.isArray(value) ? value.map(String).sort() : [];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJson(item)]),
    );
  }

  return value;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
