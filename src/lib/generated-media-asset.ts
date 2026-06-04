import "server-only";

import { randomUUID } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";

type GeneratedMediaAssetRow = {
  assetKind: string;
  base64Data: string;
  contentType: string;
  createdAt: Date;
  fileName: string;
  id: string;
  metadataJson: unknown;
  reportId: string | null;
  tenantId: string;
  updatedAt: Date;
};

export type GeneratedMediaAsset = {
  assetKind: string;
  base64Data: string;
  contentType: string;
  createdAt: string;
  fileName: string;
  id: string;
  metadata: Record<string, unknown>;
  reportId: string | null;
  updatedAt: string;
};

let generatedMediaStorageReady: Promise<void> | null = null;

export async function createGeneratedMediaAsset(input: {
  assetKind: string;
  base64Data: string;
  contentType: string;
  fileName: string;
  metadata?: Record<string, unknown>;
  reportId?: string | null;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureGeneratedMediaAssetStorage();
  const id = randomUUID();

  await db.$executeRawUnsafe(
    `
      INSERT INTO "GeneratedMediaAsset" (
        "id", "tenantId", "reportId", "assetKind", "contentType", "fileName",
        "base64Data", "metadataJson", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8::jsonb, NOW(), NOW()
      )
    `,
    id,
    getActiveIndexConfig().id,
    input.reportId ?? null,
    input.assetKind,
    input.contentType,
    input.fileName,
    input.base64Data,
    JSON.stringify(input.metadata ?? {}),
  );

  return getGeneratedMediaAssetById(id);
}

export async function getGeneratedMediaAssetById(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureGeneratedMediaAssetStorage();
  const rows = await db.$queryRawUnsafe<GeneratedMediaAssetRow[]>(
    `
      SELECT *
      FROM "GeneratedMediaAsset"
      WHERE "tenantId" = $1 AND "id" = $2
      LIMIT 1
    `,
    getActiveIndexConfig().id,
    id,
  );

  return rows[0] ? mapGeneratedMediaAssetRow(rows[0]) : null;
}

async function ensureGeneratedMediaAssetStorage() {
  if (!hasDatabaseUrl()) {
    return;
  }

  generatedMediaStorageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GeneratedMediaAsset" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "reportId" TEXT,
        "assetKind" TEXT NOT NULL,
        "contentType" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "base64Data" TEXT NOT NULL,
        "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GeneratedMediaAsset_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "GeneratedMediaAsset_tenantId_assetKind_createdAt_idx"
      ON "GeneratedMediaAsset"("tenantId", "assetKind", "createdAt")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "GeneratedMediaAsset_tenantId_reportId_idx"
      ON "GeneratedMediaAsset"("tenantId", "reportId")
    `);
  })();

  await generatedMediaStorageReady;
}

function mapGeneratedMediaAssetRow(row: GeneratedMediaAssetRow): GeneratedMediaAsset {
  return {
    assetKind: row.assetKind,
    base64Data: row.base64Data,
    contentType: row.contentType,
    createdAt: row.createdAt.toISOString(),
    fileName: row.fileName,
    id: row.id,
    metadata:
      row.metadataJson && typeof row.metadataJson === "object"
        ? (row.metadataJson as Record<string, unknown>)
        : {},
    reportId: row.reportId,
    updatedAt: row.updatedAt.toISOString(),
  };
}
