import { randomUUID, createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { BASKET_SOURCES } from "@/lib/basket/products";
import {
  calculateComposite,
  calculateCorrelation,
  enrichObservation,
  rebaseSeriesTo100,
} from "@/lib/basket/formulas";
import type {
  BasketChartSeries,
  BasketConfidence,
  BasketLatestResponse,
  BasketMarket,
  BasketObservation,
  BasketObservationStatus,
  BasketProductId,
  BasketSource,
  BasketSourceKind,
} from "@/lib/basket/types";

type RawSnapshotStatus = "success" | "failed";
type PublishStatus = "auto_publish" | "review_required" | "published" | "held";

export type BasketRawSnapshotInput = {
  sourceId: string;
  sourceKind: BasketSourceKind;
  url?: string | null;
  status: RawSnapshotStatus;
  content?: string | null;
  error?: string | null;
  parserVersion?: string;
  metadata?: Record<string, unknown>;
};

export type BasketPublishCandidate = {
  id: string;
  productId: BasketProductId | null;
  market: BasketMarket | null;
  date: string | null;
  sourceId: string;
  confidence: BasketConfidence;
  publishStatus: PublishStatus;
  reason: string;
  candidate: Record<string, unknown>;
  createdAt: string;
};

type PublishedValueRow = {
  baselineUsd: unknown;
  confidence: string;
  currencyCode: string | null;
  date: Date | string;
  localPrice: unknown;
  market: string;
  metadataJson: unknown;
  productId: string;
  sourceId: string;
  sourceKind: string;
  sourceLabel: string;
  sourceUrl: string | null;
  status: string;
  valueUsd: unknown;
};

type ExternalSeriesRow = {
  date: Date | string;
  seriesId: string;
  sourceId: string;
  value: unknown;
};

type SourceRow = {
  id: string;
  kind: string;
  label: string;
  url: string | null;
};

let basketStorageReady: Promise<void> | null = null;

export async function ensureBasketStorage() {
  if (!hasDatabaseUrl()) return false;

  basketStorageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BasketSource" (
        "id" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "url" TEXT,
        "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BasketSource_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BasketRawSnapshot" (
        "id" TEXT NOT NULL,
        "sourceId" TEXT NOT NULL,
        "sourceKind" TEXT NOT NULL,
        "url" TEXT,
        "status" TEXT NOT NULL,
        "contentText" TEXT,
        "contentHash" TEXT,
        "error" TEXT,
        "parserVersion" TEXT NOT NULL,
        "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BasketRawSnapshot_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BasketRawSnapshot_source_created_idx"
      ON "BasketRawSnapshot"("sourceId", "createdAt")
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BasketObservation" (
        "id" TEXT NOT NULL,
        "rawSnapshotId" TEXT,
        "sourceId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "market" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "valueUsd" DOUBLE PRECISION,
        "baselineUsd" DOUBLE PRECISION NOT NULL,
        "localPrice" DOUBLE PRECISION,
        "currencyCode" TEXT,
        "confidence" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BasketObservation_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BasketObservation_product_market_date_source_key"
      ON "BasketObservation"("productId", "market", "date", "sourceId")
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BasketPublishCandidate" (
        "id" TEXT NOT NULL,
        "rawSnapshotId" TEXT,
        "sourceId" TEXT NOT NULL,
        "productId" TEXT,
        "market" TEXT,
        "date" DATE,
        "confidence" TEXT NOT NULL,
        "publishStatus" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "candidateJson" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BasketPublishCandidate_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BasketPublishCandidate_status_created_idx"
      ON "BasketPublishCandidate"("publishStatus", "createdAt")
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BasketPublishedValue" (
        "id" TEXT NOT NULL,
        "candidateId" TEXT,
        "rawSnapshotId" TEXT,
        "sourceId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "market" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "valueUsd" DOUBLE PRECISION,
        "baselineUsd" DOUBLE PRECISION NOT NULL,
        "localPrice" DOUBLE PRECISION,
        "currencyCode" TEXT,
        "confidence" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BasketPublishedValue_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BasketPublishedValue_product_market_date_source_key"
      ON "BasketPublishedValue"("productId", "market", "date", "sourceId")
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BasketExternalSeriesObservation" (
        "id" TEXT NOT NULL,
        "rawSnapshotId" TEXT,
        "sourceId" TEXT NOT NULL,
        "seriesId" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "value" DOUBLE PRECISION NOT NULL,
        "confidence" TEXT NOT NULL DEFAULT 'verified',
        "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BasketExternalSeriesObservation_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BasketExternalSeriesObservation_source_series_date_key"
      ON "BasketExternalSeriesObservation"("sourceId", "seriesId", "date")
    `);
  })();

  await basketStorageReady;
  await upsertBasketSources(Object.values(BASKET_SOURCES));
  return true;
}

export async function upsertBasketSources(sources: BasketSource[]) {
  if (!hasDatabaseUrl()) return;
  if (basketStorageReady) await basketStorageReady;

  for (const source of sources) {
    await db.$executeRawUnsafe(
      `
        INSERT INTO "BasketSource" ("id", "label", "kind", "url", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "label" = EXCLUDED."label",
          "kind" = EXCLUDED."kind",
          "url" = EXCLUDED."url",
          "updatedAt" = NOW()
      `,
      source.id,
      source.label,
      source.kind,
      source.url ?? null,
    );
  }
}

export async function saveBasketRawSnapshot(input: BasketRawSnapshotInput) {
  if (!(await ensureReady())) return null;

  const id = randomUUID();
  await db.$executeRawUnsafe(
    `
      INSERT INTO "BasketRawSnapshot" (
        "id", "sourceId", "sourceKind", "url", "status", "contentText",
        "contentHash", "error", "parserVersion", "metadataJson", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
    `,
    id,
    input.sourceId,
    input.sourceKind,
    input.url ?? null,
    input.status,
    input.content ?? null,
    input.content ? createHash("sha256").update(input.content).digest("hex") : null,
    input.error ?? null,
    input.parserVersion ?? "basket-monitoring-v1",
    JSON.stringify(input.metadata ?? {}),
  );

  return id;
}

export function buildBasketPublishCandidates(input: {
  bigMac: BasketObservation[];
  fred: Array<{ key: string; observations: unknown[] }>;
  rawSnapshotId?: string | null;
}): Omit<BasketPublishCandidate, "id" | "createdAt">[] {
  const bigMac = input.bigMac.map((item) => ({
    candidate: item as unknown as Record<string, unknown>,
    confidence: item.confidence,
    date: item.date,
    market: item.market,
    productId: item.product,
    publishStatus:
      item.confidence === "verified" && item.status === "published"
        ? ("auto_publish" as const)
        : ("review_required" as const),
    reason:
      item.confidence === "verified" && item.status === "published"
        ? "Big Mac verified source auto-publish."
        : "Big Mac source requires review.",
    sourceId: item.source.id,
  }));

  const fred = input.fred.map((item) => ({
    candidate: item as unknown as Record<string, unknown>,
    confidence: "verified" as const,
    date: null,
    market: null,
    productId: null,
    publishStatus: "auto_publish" as const,
    reason: "FRED external series verified source auto-publish.",
    sourceId: item.key,
  }));

  return [
    ...bigMac,
    ...fred,
    {
      candidate: { product: "latte", sourceId: BASKET_SOURCES.starbucksMonitor.id },
      confidence: "monitored",
      date: null,
      market: null,
      productId: "latte",
      publishStatus: "review_required",
      reason: "Starbucks remains monitored until source verification is durable.",
      sourceId: BASKET_SOURCES.starbucksMonitor.id,
    },
    {
      candidate: { product: "iphone", sourceId: BASKET_SOURCES.appleStore.id },
      confidence: "seed",
      date: null,
      market: null,
      productId: "iphone",
      publishStatus: "review_required",
      reason: "iPhone remains seed/monitored until retail parser is durable.",
      sourceId: BASKET_SOURCES.appleStore.id,
    },
  ];
}

export async function saveBasketPublishCandidates(
  candidates: Omit<BasketPublishCandidate, "id" | "createdAt">[],
  rawSnapshotId?: string | null,
) {
  if (!(await ensureReady())) return [];

  const saved: BasketPublishCandidate[] = [];
  for (const candidate of candidates) {
    const id = randomUUID();
    await db.$executeRawUnsafe(
      `
        INSERT INTO "BasketPublishCandidate" (
          "id", "rawSnapshotId", "sourceId", "productId", "market", "date",
          "confidence", "publishStatus", "reason", "candidateJson", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10::jsonb, NOW(), NOW())
      `,
      id,
      rawSnapshotId ?? null,
      candidate.sourceId,
      candidate.productId,
      candidate.market,
      candidate.date,
      candidate.confidence,
      candidate.publishStatus,
      candidate.reason,
      JSON.stringify(candidate.candidate),
    );
    saved.push({ ...candidate, createdAt: new Date().toISOString(), id });
  }

  return saved;
}

export async function upsertBasketObservations(
  observations: BasketObservation[],
  rawSnapshotId?: string | null,
) {
  if (!(await ensureReady())) return 0;

  for (const observation of observations) {
    await db.$executeRawUnsafe(
      `
        INSERT INTO "BasketObservation" (
          "id", "rawSnapshotId", "sourceId", "productId", "market", "date",
          "valueUsd", "baselineUsd", "localPrice", "currencyCode",
          "confidence", "status", "metadataJson", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW(), NOW())
        ON CONFLICT ("productId", "market", "date", "sourceId") DO UPDATE SET
          "rawSnapshotId" = EXCLUDED."rawSnapshotId",
          "valueUsd" = EXCLUDED."valueUsd",
          "baselineUsd" = EXCLUDED."baselineUsd",
          "localPrice" = EXCLUDED."localPrice",
          "currencyCode" = EXCLUDED."currencyCode",
          "confidence" = EXCLUDED."confidence",
          "status" = EXCLUDED."status",
          "metadataJson" = EXCLUDED."metadataJson",
          "updatedAt" = NOW()
      `,
      randomUUID(),
      rawSnapshotId ?? null,
      observation.source.id,
      observation.product,
      observation.market,
      observation.date,
      observation.valueUsd,
      observation.baselineUsd,
      observation.localPrice ?? null,
      observation.currencyCode ?? null,
      observation.confidence,
      observation.status,
      JSON.stringify({ note: observation.note ?? null }),
    );
  }

  return observations.length;
}

export async function upsertBasketExternalSeriesObservations(
  rows: Array<{ date: string; seriesId: string; value: number; sourceId: string; confidence: "verified" }>,
  rawSnapshotId?: string | null,
) {
  if (!(await ensureReady())) return 0;

  for (const row of rows) {
    await db.$executeRawUnsafe(
      `
        INSERT INTO "BasketExternalSeriesObservation" (
          "id", "rawSnapshotId", "sourceId", "seriesId", "date",
          "value", "confidence", "metadataJson", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5::date, $6, $7, '{}'::jsonb, NOW(), NOW())
        ON CONFLICT ("sourceId", "seriesId", "date") DO UPDATE SET
          "rawSnapshotId" = EXCLUDED."rawSnapshotId",
          "value" = EXCLUDED."value",
          "confidence" = EXCLUDED."confidence",
          "updatedAt" = NOW()
      `,
      randomUUID(),
      rawSnapshotId ?? null,
      row.sourceId,
      row.seriesId,
      row.date,
      row.value,
      row.confidence,
    );
  }

  return rows.length;
}

export async function publishBasketAutoCandidates() {
  if (!(await ensureReady())) return { published: 0, held: 0 };

  const rows = await db.$queryRawUnsafe<Array<{ id: string; candidateJson: unknown }>>(
    `
      SELECT "id", "candidateJson"
      FROM "BasketPublishCandidate"
      WHERE "publishStatus" = 'auto_publish'
      ORDER BY "createdAt" ASC
    `,
  );
  let published = 0;
  let held = 0;

  for (const row of rows) {
    const candidate = parseJsonRecord(row.candidateJson);
    if (isPublishedValueCandidate(candidate)) {
      await upsertPublishedValue(candidate, row.id);
      await markCandidate(row.id, "published");
      published += 1;
    } else {
      await markCandidate(row.id, "held");
      held += 1;
    }
  }

  return { published, held };
}

export async function getBasketPublishCandidates() {
  if (!(await ensureReady())) return null;

  const rows = await db.$queryRawUnsafe<
    Array<{
      candidateJson: unknown;
      confidence: string;
      createdAt: Date;
      date: Date | null;
      id: string;
      market: string | null;
      productId: string | null;
      publishStatus: string;
      reason: string;
      sourceId: string;
    }>
  >(
    `
      SELECT *
      FROM "BasketPublishCandidate"
      ORDER BY "createdAt" DESC
      LIMIT 200
    `,
  );

  return rows.map((row) => ({
    candidate: parseJsonRecord(row.candidateJson),
    confidence: normalizeConfidence(row.confidence),
    createdAt: row.createdAt.toISOString(),
    date: row.date ? formatDate(row.date) : null,
    id: row.id,
    market: normalizeNullableMarket(row.market),
    productId: normalizeNullableProduct(row.productId),
    publishStatus: normalizePublishStatus(row.publishStatus),
    reason: row.reason,
    sourceId: row.sourceId,
  }));
}

export async function getBasketLatestFromStorage(
  market: BasketMarket,
): Promise<BasketLatestResponse | null> {
  if (!(await ensureReady())) return null;

  const rows = await db.$queryRawUnsafe<PublishedValueRow[]>(
    `
      SELECT DISTINCT ON (p."productId")
        p.*, s."label" AS "sourceLabel", s."kind" AS "sourceKind", s."url" AS "sourceUrl"
      FROM "BasketPublishedValue" p
      LEFT JOIN "BasketSource" s ON s."id" = p."sourceId"
      WHERE p."market" = $1 AND p."status" = 'published'
      ORDER BY p."productId", p."date" DESC, p."publishedAt" DESC
    `,
    market,
  );

  if (rows.length === 0) return null;

  const products = rows.map((row) =>
    enrichObservation(mapPublishedValueRow(row), {
      changeYoY: null,
      sparkline: [],
    }),
  );

  return {
    composite: calculateComposite(products),
    market,
    products,
    updatedAt: new Date().toISOString(),
  };
}

export async function getBasketHistoryFromStorage(market: BasketMarket) {
  if (!(await ensureReady())) return null;

  const published = await db.$queryRawUnsafe<PublishedValueRow[]>(
    `
      SELECT p.*, s."label" AS "sourceLabel", s."kind" AS "sourceKind", s."url" AS "sourceUrl"
      FROM "BasketPublishedValue" p
      LEFT JOIN "BasketSource" s ON s."id" = p."sourceId"
      WHERE p."market" = $1 AND p."status" = 'published'
      ORDER BY p."productId", p."date" ASC
    `,
    market,
  );

  const grouped = groupBy(published, (row) => row.productId);
  const productSeries = [...grouped.entries()]
    .map(([productId, rows]) => {
      if (rows.length < 2) return null;
      return makeStoredSeries(productId, rows);
    })
    .filter((item): item is BasketChartSeries => Boolean(item));

  if (productSeries.length === 0) return null;

  const external = await getExternalSeriesFromStorage();
  return [...productSeries, ...external];
}

export async function getBasketCompareFromStorage(market: BasketMarket) {
  const series = await getBasketHistoryFromStorage(market);
  if (!series) return null;

  const basket = series.find((item) => item.id === "basket") ?? series[0];
  return {
    correlations: series.map((item) => ({
      correlationToBasket:
        item.id === basket.id
          ? 1
          : calculateCorrelation(
              basket.points.map((point) => point.value),
              item.points.map((point) => point.value),
            ),
      id: item.id,
      label: item.label,
    })),
    generatedAt: new Date().toISOString(),
    market,
    mode: "rebasedTo100",
    series,
  };
}

export async function getBasketSourcesFromStorage() {
  if (!(await ensureReady())) return null;

  const rows = await db.$queryRawUnsafe<SourceRow[]>(
    `
      SELECT "id", "label", "kind", "url"
      FROM "BasketSource"
      WHERE "enabled" = TRUE
      ORDER BY "id" ASC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as BasketSourceKind,
    label: row.label,
    url: row.url ?? undefined,
  }));
}

async function getExternalSeriesFromStorage() {
  const rows = await db.$queryRawUnsafe<ExternalSeriesRow[]>(
    `
      SELECT "sourceId", "seriesId", "date", "value"
      FROM "BasketExternalSeriesObservation"
      ORDER BY "seriesId", "date" ASC
    `,
  );
  const grouped = groupBy(rows, (row) => row.seriesId);

  return [...grouped.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([seriesId, items]) => ({
      color: externalColor(seriesId),
      id: seriesId.toLowerCase(),
      label: seriesId,
      points: rebaseSeriesTo100(
        items.map((item) => ({ date: formatDate(item.date), value: toNumber(item.value) })),
      ),
      source: items[0]?.sourceId ?? "external",
    }));
}

async function ensureReady() {
  return ensureBasketStorage();
}

async function upsertPublishedValue(candidate: BasketObservation, candidateId: string) {
  await db.$executeRawUnsafe(
    `
      INSERT INTO "BasketPublishedValue" (
        "id", "candidateId", "sourceId", "productId", "market", "date",
        "valueUsd", "baselineUsd", "localPrice", "currencyCode",
        "confidence", "status", "metadataJson", "publishedAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, 'published', $12::jsonb, NOW(), NOW())
      ON CONFLICT ("productId", "market", "date", "sourceId") DO UPDATE SET
        "candidateId" = EXCLUDED."candidateId",
        "valueUsd" = EXCLUDED."valueUsd",
        "baselineUsd" = EXCLUDED."baselineUsd",
        "localPrice" = EXCLUDED."localPrice",
        "currencyCode" = EXCLUDED."currencyCode",
        "confidence" = EXCLUDED."confidence",
        "status" = 'published',
        "metadataJson" = EXCLUDED."metadataJson",
        "updatedAt" = NOW()
    `,
    randomUUID(),
    candidateId,
    candidate.source.id,
    candidate.product,
    candidate.market,
    candidate.date,
    candidate.valueUsd,
    candidate.baselineUsd,
    candidate.localPrice ?? null,
    candidate.currencyCode ?? null,
    candidate.confidence,
    JSON.stringify({ note: candidate.note ?? null }),
  );
}

async function markCandidate(id: string, status: PublishStatus) {
  await db.$executeRawUnsafe(
    `
      UPDATE "BasketPublishCandidate"
      SET "publishStatus" = $2, "updatedAt" = NOW()
      WHERE "id" = $1
    `,
    id,
    status,
  );
}

function mapPublishedValueRow(row: PublishedValueRow): BasketObservation {
  return {
    baselineUsd: toNumber(row.baselineUsd),
    confidence: normalizeConfidence(row.confidence),
    currencyCode: row.currencyCode,
    date: formatDate(row.date),
    localPrice: row.localPrice === null ? null : toNumber(row.localPrice),
    market: normalizeMarket(row.market),
    product: normalizeProduct(row.productId),
    source: {
      id: row.sourceId,
      kind: row.sourceKind as BasketSourceKind,
      label: row.sourceLabel,
      url: row.sourceUrl ?? undefined,
    },
    status: normalizeStatus(row.status),
    valueUsd: row.valueUsd === null ? null : toNumber(row.valueUsd),
  };
}

function makeStoredSeries(id: string, rows: PublishedValueRow[]): BasketChartSeries {
  return {
    color: id === "bigmac" ? "#ffc42e" : id === "latte" ? "#70f2bd" : "#b96cff",
    id,
    label: id,
    points: rebaseSeriesTo100(
      rows
        .map((row) => ({ date: formatDate(row.date), value: row.valueUsd === null ? Number.NaN : toNumber(row.valueUsd) }))
        .filter((point) => Number.isFinite(point.value)),
    ),
    source: rows[0]?.sourceLabel ?? rows[0]?.sourceId ?? "Basket",
  };
}

function isPublishedValueCandidate(value: Record<string, unknown>): value is BasketObservation {
  return (
    value.product === "bigmac" &&
    typeof value.market === "string" &&
    typeof value.date === "string" &&
    typeof value.baselineUsd === "number" &&
    typeof value.source === "object" &&
    value.source !== null
  );
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

function parseJsonRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatDate(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function normalizeConfidence(value: string): BasketConfidence {
  if (value === "verified" || value === "monitored" || value === "seed" || value === "unavailable") return value;
  return "seed";
}

function normalizeStatus(value: string): BasketObservationStatus {
  if (value === "published" || value === "monitored" || value === "unavailable") return value;
  return "monitored";
}

function normalizeMarket(value: string): BasketMarket {
  return value === "US" || value === "UA" || value === "GLOBAL" ? value : "GLOBAL";
}

function normalizeNullableMarket(value: string | null): BasketMarket | null {
  return value ? normalizeMarket(value) : null;
}

function normalizeProduct(value: string): BasketProductId {
  return value === "latte" || value === "iphone" ? value : "bigmac";
}

function normalizeNullableProduct(value: string | null): BasketProductId | null {
  return value ? normalizeProduct(value) : null;
}

function normalizePublishStatus(value: string): PublishStatus {
  if (value === "auto_publish" || value === "review_required" || value === "published" || value === "held") return value;
  return "review_required";
}

function externalColor(seriesId: string) {
  if (seriesId === "DTWEXBGS") return "#4aa3ff";
  if (seriesId === "DCOILBRENTEU") return "#ff7043";
  return "#ffd166";
}
