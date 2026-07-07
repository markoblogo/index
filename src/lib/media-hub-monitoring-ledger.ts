import "server-only";

import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { CortexMarketReportInput } from "@/lib/commodity-intelligence-layer";

export type MediaHubMonitoringLedgerState =
  | "accepted_after_scoring"
  | "discarded_capacity"
  | "discarded_low_relevance"
  | "fallback_accepted"
  | "rejected_unsafe";

export type MediaHubMonitoringLedgerRecordInput = {
  cacheKey: string;
  cropTags?: string[];
  itemId: string;
  publishedAt: string;
  regionTags?: string[];
  rejectionReason?: string | null;
  relevanceScore: number;
  runKey: string;
  source: string;
  sourceType: string;
  state: MediaHubMonitoringLedgerState;
  summary: string;
  title: string;
  topicTags?: string[];
  url?: string;
};

type MediaHubMonitoringLedgerRow = {
  id: string;
  cacheKey: string;
  cropTagsJson: unknown;
  itemHash: string;
  publishedAt: Date;
  regionTagsJson: unknown;
  rejectionReason: string | null;
  relevanceScore: number;
  runKey: string;
  source: string;
  sourceType: string;
  state: MediaHubMonitoringLedgerState;
  summary: string;
  title: string;
  topicTagsJson: unknown;
  url: string | null;
};

export async function persistMediaHubMonitoringLedgerRecords(
  records: MediaHubMonitoringLedgerRecordInput[],
) {
  if (!hasDatabaseUrl() || records.length === 0) return;

  await ensureMediaHubMonitoringLedgerStorage();
  for (const record of records.slice(0, 500)) {
    await db.$executeRawUnsafe(
      `
        INSERT INTO "MediaHubMonitoringLedger" (
          "id", "runKey", "cacheKey", "itemHash", "source", "sourceType",
          "title", "summary", "url", "publishedAt", "relevanceScore",
          "topicTagsJson", "cropTagsJson", "regionTagsJson", "state",
          "rejectionReason"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12::jsonb, $13::jsonb, $14::jsonb, $15,
          $16
        )
        ON CONFLICT ("id") DO UPDATE SET
          "relevanceScore" = EXCLUDED."relevanceScore",
          "state" = EXCLUDED."state",
          "rejectionReason" = EXCLUDED."rejectionReason",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      ledgerRecordId(record),
      record.runKey,
      record.cacheKey,
      itemHash(record),
      record.source,
      record.sourceType,
      record.title,
      record.summary,
      record.url ?? null,
      new Date(record.publishedAt),
      record.relevanceScore,
      JSON.stringify(record.topicTags ?? []),
      JSON.stringify(record.cropTags ?? []),
      JSON.stringify(record.regionTags ?? []),
      record.state,
      record.rejectionReason ?? null,
    );
  }
}

export async function buildCortexMediaHubMonitoringLedgerEvidence(input: {
  limit?: number;
  periodEndDate: string;
  periodStartDate: string;
}): Promise<NonNullable<CortexMarketReportInput["monitoringLedgerEvidence"]>> {
  if (!hasDatabaseUrl()) return [];

  await ensureMediaHubMonitoringLedgerStorage();
  const rows = await db.$queryRawUnsafe<MediaHubMonitoringLedgerRow[]>(
    `
      SELECT
        "id", "runKey", "cacheKey", "itemHash", "source", "sourceType",
        "title", "summary", "url", "publishedAt", "relevanceScore",
        "topicTagsJson", "cropTagsJson", "regionTagsJson", "state",
        "rejectionReason"
      FROM "MediaHubMonitoringLedger"
      WHERE "publishedAt" >= $1 AND "publishedAt" <= $2
      ORDER BY "publishedAt" DESC, "relevanceScore" DESC
      LIMIT $3
    `,
    dateToUtcDate(input.periodStartDate),
    endDateToUtcDate(input.periodEndDate),
    normalizeLimit(input.limit),
  );

  return rows.map((row) => ({
    extractedAt: row.publishedAt,
    id: row.id,
    processingState: row.state,
    rejectionReason: row.rejectionReason ?? undefined,
    relevanceScore: row.relevanceScore,
    source: row.source,
    sourceType: row.sourceType,
    sourceUrl: row.url ?? undefined,
    summary: row.summary,
    tags: uniqueStrings([
      ...parseStringArray(row.topicTagsJson),
      ...parseStringArray(row.cropTagsJson),
      ...parseStringArray(row.regionTagsJson),
    ]).slice(0, 8),
    title: row.title,
  }));
}

async function ensureMediaHubMonitoringLedgerStorage() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MediaHubMonitoringLedger" (
      "id" TEXT NOT NULL,
      "runKey" TEXT NOT NULL,
      "cacheKey" TEXT NOT NULL,
      "itemHash" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "sourceType" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "url" TEXT,
      "publishedAt" TIMESTAMP(3) NOT NULL,
      "relevanceScore" DOUBLE PRECISION NOT NULL,
      "topicTagsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "cropTagsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "regionTagsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "state" TEXT NOT NULL,
      "rejectionReason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MediaHubMonitoringLedger_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubMonitoringLedger_published_state_idx"
    ON "MediaHubMonitoringLedger"("publishedAt" DESC, "state", "relevanceScore" DESC)
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubMonitoringLedger_cache_run_idx"
    ON "MediaHubMonitoringLedger"("cacheKey", "runKey")
  `);
}

function ledgerRecordId(record: MediaHubMonitoringLedgerRecordInput) {
  return createHash("sha1")
    .update(`${record.runKey}|${itemHash(record)}|${record.state}`)
    .digest("hex")
    .slice(0, 32);
}

function itemHash(record: MediaHubMonitoringLedgerRecordInput) {
  return createHash("sha1")
    .update(`${record.source}|${record.title}|${record.url ?? ""}|${record.publishedAt}`)
    .digest("hex")
    .slice(0, 32);
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function endDateToUtcDate(date: string) {
  return new Date(`${date}T23:59:59.999Z`);
}

function normalizeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 200;
  return Math.max(1, Math.min(1_000, Math.trunc(value ?? 200)));
}

function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
