import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";

export type CortexAssistantAuditRecord = {
  contextPackId: string;
  createdAt: string;
  evidenceCount: number;
  id: string;
  knownGapCount: number;
  model: string;
  product: "1D3X Cortex";
  project: "mn7r";
  provider: "openai";
  purpose: "execution-context";
  requestId: string;
  surface: "exe-assistant";
};

export function buildCortexAssistantAuditRecord(input: {
  contextPack: unknown;
  createdAt?: string;
  evidenceCount: number;
  knownGapCount: number;
  model: string;
  query: string;
}): CortexAssistantAuditRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const contextPackId = `cortex-pack:${hashValue(input.contextPack).slice(0, 24)}`;
  const requestId = `cortex-assistant:${hashValue({ contextPackId, createdAt, query: input.query }).slice(0, 24)}`;
  return {
    contextPackId,
    createdAt,
    evidenceCount: input.evidenceCount,
    id: requestId,
    knownGapCount: input.knownGapCount,
    model: input.model,
    product: "1D3X Cortex",
    project: "mn7r",
    provider: "openai",
    purpose: "execution-context",
    requestId,
    surface: "exe-assistant",
  };
}

export async function persistCortexAssistantAuditRecord(record: CortexAssistantAuditRecord) {
  if (!hasDatabaseUrl()) return null;

  await ensureCortexAssistantAuditStorage();
  await db.$executeRawUnsafe(
    `
      INSERT INTO "CortexAssistantAuditLedger" (
        "id", "requestId", "contextPackId", "project", "surface", "provider",
        "model", "purpose", "evidenceCount", "knownGapCount", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamp)
      ON CONFLICT ("id") DO NOTHING
    `,
    record.id,
    record.requestId,
    record.contextPackId,
    record.project,
    record.surface,
    record.provider,
    record.model,
    record.purpose,
    record.evidenceCount,
    record.knownGapCount,
    record.createdAt,
  );
  return record;
}

let storageReady: Promise<void> | null = null;

async function ensureCortexAssistantAuditStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CortexAssistantAuditLedger" (
        "id" TEXT NOT NULL,
        "requestId" TEXT NOT NULL,
        "contextPackId" TEXT NOT NULL,
        "project" TEXT NOT NULL,
        "surface" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "model" TEXT NOT NULL,
        "purpose" TEXT NOT NULL,
        "evidenceCount" INTEGER NOT NULL,
        "knownGapCount" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CortexAssistantAuditLedger_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CortexAssistantAuditLedger_pack_idx"
      ON "CortexAssistantAuditLedger"("contextPackId", "createdAt" DESC)
    `);
  })();
  await storageReady;
}

function hashValue(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortJson(nested)]),
  );
}
