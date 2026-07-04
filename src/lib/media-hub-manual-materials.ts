import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { fetchWithTimeout as fetchExternalWithTimeout } from "@/lib/fetch-timeout";
import type { MediaHubPublicationKind } from "@/lib/media-hub-publication-scheduler";

export type MediaHubManualMaterialKind =
  | "daily_material"
  | "weekly_material"
  | "monthly_material"
  | "source_candidate";

export type MediaHubManualMaterialSourceType =
  | "telegram_file"
  | "telegram_link"
  | "telegram_text"
  | "corporate_telegram_group"
  | "admin_upload"
  | "admin_link"
  | "scheduled_api"
  | "scheduled_pdf"
  | "scheduled_html";

export type MediaHubManualMaterialTenant = "spike-ua" | "1d3x" | "corporate-unrouted";

const OPENAI_VISUAL_SUMMARY_TIMEOUT_MS = 45_000;

export type MaterialIngestResult = {
  extractionStatus: string;
  id?: string;
  kind: MediaHubManualMaterialKind;
  message: string;
  tenantId: MediaHubManualMaterialTenant;
};

type MaterialRow = {
  id: string;
  tenantId: string;
  kind: string;
  sourceType: string;
  originalUrl: string | null;
  canonicalUrl: string | null;
  sourceDomain: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  contentHash: string;
  reportingDate: Date;
  reportingWeekStart: Date;
  reportingWeekEnd: Date;
  reportingMonth: string;
  receivedAt: Date;
  receivedFrom: string;
  telegramChatId: string | null;
  telegramMessageId: string | null;
  telegramFromId: string | null;
  hashtagsJson: unknown;
  extractedText: string | null;
  extractedTablesJson: unknown;
  extractedFactsJson: unknown;
  summary: string | null;
  language: string | null;
  extractionStatus: string;
  sourceRegistrationStatus: string;
  usedInReportId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MaterialAssetRow = {
  assetType: string;
  byteSize: number | null;
  confidence: number | null;
  createdAt: Date;
  extractedText: string | null;
  id: string;
  materialId: string;
  metadataJson: unknown;
  mimeType: string | null;
  pageNumber: number | null;
  storagePath: string | null;
  visualSummary: string | null;
};

export type MediaHubManualMaterialAssetDigest = {
  assetType: string;
  byteSize: number | null;
  confidence: number | null;
  extractedText: string;
  id: string;
  metadata: unknown;
  mimeType: string | null;
  pageNumber: number | null;
  storagePath: string | null;
  visualSummary: string;
};

export type MediaHubManualMaterialDigest = {
  assets: MediaHubManualMaterialAssetDigest[];
  extractedFacts: unknown;
  extractedTables: unknown;
  extractedText: string;
  extractionStatus: string;
  id: string;
  kind: string;
  receivedAt: Date;
  originalFilename: string | null;
  originalUrl: string | null;
  sourceDomain: string | null;
  sourceRegistrationStatus: string;
  sourceType: string;
  summary: string;
  tenantId: string;
  usedInReportId: string | null;
};

type MaterialRowWithAssets = MaterialRow & {
  assets: MediaHubManualMaterialAssetDigest[];
};

type ExtractedMaterialAssetDraft = {
  assetType: "original" | "preview_image" | "extracted_text" | "visual_summary";
  bytes?: Buffer;
  byteSize?: number;
  confidence?: number;
  extractedText?: string;
  metadata?: Record<string, unknown>;
  mimeType?: string;
  pageNumber?: number;
  storagePath?: string;
  visualSummary?: string;
};

type ExtractedMaterialContent = {
  assets: ExtractedMaterialAssetDraft[];
  extractedFacts: Array<Record<string, unknown>>;
  extractedTables: Array<Record<string, unknown>>;
  extractedText: string;
  extractionStatus: string;
};

const MAX_EXTRACTED_TEXT_CHARS = 18_000;
const MAX_SUMMARY_CHARS = 900;
const DEFAULT_MAX_FILE_MB = 20;
const DEFAULT_MAX_ORIGINAL_DB_MB = 8;
const DEFAULT_MAX_PREVIEW_PAGES = 3;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
  "text/html",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const SCHEDULED_SOURCES = [
  {
    id: "zaner_netags_grain_oilseed",
    sourceType: "scheduled_html" as const,
    tenantIds: ["1d3x", "spike-ua"] as const,
    url: "https://www.zaner.com/3.0/market_information/ht_stream.asp?page=netags",
  },
  {
    id: "zaner_netags_grain_oilseed_pdf",
    sourceType: "scheduled_pdf" as const,
    tenantIds: ["1d3x", "spike-ua"] as const,
    url: "https://www.zaner.com/hightower/netags.pdf",
  },
  {
    id: "tbc_edible_oils_daily",
    sourceType: "scheduled_pdf" as const,
    tenantIds: ["1d3x", "spike-ua"] as const,
    url: "https://tbcingr.com/reports/archive/edible-oils/Edible%20oils%20daily.pdf",
  },
];

export function parseMediaHubMaterialHashtags(text = "") {
  const tags = [...text.matchAll(/(^|\s)#([a-zA-Z0-9_]+)/g)].map((match) =>
    match[2].toLowerCase(),
  );
  const tenantIds: MediaHubManualMaterialTenant[] = [];
  if (tags.includes("ssi")) tenantIds.push("spike-ua");
  if (tags.includes("1d3x") || tags.includes("id3x")) tenantIds.push("1d3x");

  const kind: MediaHubManualMaterialKind = tags.includes("daily")
    ? "daily_material"
    : tags.includes("monthly")
      ? "monthly_material"
      : tags.includes("source")
        ? "source_candidate"
        : "weekly_material";

  return {
    hashtags: tags,
    kind,
    tenantIds,
  };
}

export function extractUrlsFromText(text = "") {
  return [...text.matchAll(/https?:\/\/[^\s<>"')]+/gi)]
    .map((match) => canonicalizeMediaHubMaterialUrl(match[0]))
    .filter(Boolean);
}

export function canonicalizeMediaHubMaterialUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ["fbclid", "gclid", "mc_cid", "mc_eid", "ocid", "ref"].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function getMediaHubManualMaterialPeriod(
  date = new Date(),
  kind: MediaHubManualMaterialKind = "weekly_material",
) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = current.getUTCDay() || 7;
  const weekStart = new Date(current);
  weekStart.setUTCDate(current.getUTCDate() - weekday + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 5);
  const monthStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
  const monthEnd = new Date(current);

  return {
    reportingDate: toIsoDate(current),
    reportingMonth: `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`,
    reportingWeekEnd: toIsoDate(kind === "monthly_material" ? monthEnd : weekEnd),
    reportingWeekStart: toIsoDate(kind === "monthly_material" ? monthStart : weekStart),
  };
}

export async function ingestMediaHubLinkMaterial(input: {
  kind: MediaHubManualMaterialKind;
  notes?: string;
  receivedFrom: "telegram" | "admin" | "scheduler";
  sourceType: Extract<MediaHubManualMaterialSourceType, "telegram_link" | "admin_link" | "scheduled_html" | "scheduled_pdf">;
  telegramChatId?: string;
  telegramFromId?: string;
  telegramMessageId?: string;
  tenantId: MediaHubManualMaterialTenant;
  url: string;
}) {
  const canonicalUrl = canonicalizeMediaHubMaterialUrl(input.url);
  if (!canonicalUrl) {
    return buildResult(input.tenantId, input.kind, "failed", "Invalid URL.");
  }
  if (isUnsafeMaterialUrl(canonicalUrl)) {
    return buildResult(input.tenantId, input.kind, "failed", "Unsafe URL blocked.");
  }

  const response = await fetchWithTimeout(canonicalUrl);
  if (!response.ok) {
    return buildResult(input.tenantId, input.kind, "failed", `Fetch failed with ${response.status}.`);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "text/html";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > getManualMaterialMaxBytes()) {
    return buildResult(input.tenantId, input.kind, "failed", "File exceeds Media Hub material size limit.");
  }

  const extraction = await extractMaterialContent({
    bytes,
    filename: getBasename(new URL(canonicalUrl).pathname) || undefined,
    mimeType: contentType,
  });

  return storeManualMaterial({
    ...input,
    canonicalUrl,
    contentBytes: bytes,
    extraction,
    mimeType: contentType,
    originalUrl: input.url,
    sourceDomain: new URL(canonicalUrl).hostname,
  });
}

export async function ingestMediaHubFileMaterial(input: {
  bytes: Buffer;
  filename: string;
  kind: MediaHubManualMaterialKind;
  mimeType: string;
  receivedFrom: "telegram" | "admin";
  sourceType: Extract<MediaHubManualMaterialSourceType, "telegram_file" | "admin_upload">;
  telegramChatId?: string;
  telegramFromId?: string;
  telegramMessageId?: string;
  tenantId: MediaHubManualMaterialTenant;
}) {
  if (input.bytes.length > getManualMaterialMaxBytes()) {
    return buildResult(input.tenantId, input.kind, "failed", "File exceeds Media Hub material size limit.");
  }

  const extraction = await extractMaterialContent(input);
  return storeManualMaterial({
    ...input,
    contentBytes: input.bytes,
    extraction,
    originalFilename: input.filename,
  });
}

export async function ingestMediaHubTextMaterial(input: {
  kind: MediaHubManualMaterialKind;
  originalUrl?: string;
  receivedFrom: "telegram" | "admin" | "scheduler";
  sourceDomain?: string;
  sourceType: Extract<MediaHubManualMaterialSourceType, "telegram_text" | "corporate_telegram_group" | "scheduled_api">;
  telegramChatId?: string;
  telegramFromId?: string;
  telegramMessageId?: string;
  tenantId: MediaHubManualMaterialTenant;
  text: string;
}) {
  const text = input.text.trim();
  if (!text) {
    return buildResult(input.tenantId, input.kind, "failed", "Empty text material.");
  }

  return storeManualMaterial({
    ...input,
    contentBytes: Buffer.from(text, "utf8"),
    extraction: {
      assets: [{
        assetType: "extracted_text",
        byteSize: Buffer.byteLength(text, "utf8"),
        confidence: 0.9,
        extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
        mimeType: "text/plain",
        visualSummary: "Plain text material captured for report evidence.",
      }],
      extractedFacts: extractFacts(text),
      extractedTables: [],
      extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
      extractionStatus: "extracted",
    },
    mimeType: "text/plain",
  });
}

export async function ingestScheduledMediaHubSources() {
  if (!hasDatabaseUrl()) {
    return { skippedReason: "database_not_configured", status: "skipped" as const };
  }

  const results: MaterialIngestResult[] = [];
  for (const source of SCHEDULED_SOURCES) {
    for (const tenantId of source.tenantIds) {
      try {
        results.push(await ingestMediaHubLinkMaterial({
          kind: "weekly_material",
          receivedFrom: "scheduler",
          sourceType: source.sourceType,
          tenantId,
          url: source.url,
        }));
      } catch {
        results.push(buildResult(tenantId, "weekly_material", "failed", `${source.id} failed.`));
      }
    }
  }

  return {
    results,
    sourceCount: SCHEDULED_SOURCES.length,
    status: "processed" as const,
  };
}

export async function getManualMaterialsForPeriod(input: {
  kind: Exclude<MediaHubPublicationKind, "none">;
  periodEndDate: string;
  periodStartDate: string;
  tenantId: MediaHubManualMaterialTenant | string;
}) {
  if (!hasDatabaseUrl()) {
    return [] as MediaHubManualMaterialDigest[];
  }

  await ensureMediaHubManualMaterialStorage();

  const materialKind =
    input.kind === "daily"
      ? "daily_material"
      : input.kind === "monthly"
        ? "monthly_material"
        : "weekly_material";
  const fallbackKind = input.kind === "monthly" ? "weekly_material" : materialKind;
  const rows = await db.$queryRawUnsafe<MaterialRow[]>(
    `
      SELECT *
      FROM "MediaHubManualMaterial"
      WHERE "tenantId" = $1
        AND "reportingWeekStart" <= $3::date
        AND "reportingWeekEnd" >= $2::date
        AND "kind" IN ($4, $5, 'source_candidate')
        AND "extractionStatus" IN ('extracted', 'partial', 'unsupported_image_ocr', 'partial_visual_pending')
      ORDER BY "receivedAt" DESC
      LIMIT 32
    `,
    input.tenantId,
    input.periodStartDate,
    input.periodEndDate,
    materialKind,
    fallbackKind,
  );

  return (await attachMaterialAssets(rows)).map((row) => toMaterialDigest(row, 4000));
}

export async function listRecentMediaHubManualMaterials(tenantId?: string) {
  if (!hasDatabaseUrl()) {
    return [] as MediaHubManualMaterialDigest[];
  }

  await ensureMediaHubManualMaterialStorage();

  const rows = await db.$queryRawUnsafe<MaterialRow[]>(
    `
      SELECT *
      FROM "MediaHubManualMaterial"
      WHERE ($1::text IS NULL OR "tenantId" = $1)
      ORDER BY "receivedAt" DESC
      LIMIT 30
    `,
    tenantId ?? null,
  );

  return (await attachMaterialAssets(rows)).map((row) => toMaterialDigest(row));
}

export async function listRecentMediaHubManualMaterialsForChat(chatId: string) {
  if (!hasDatabaseUrl()) {
    return [] as MediaHubManualMaterialDigest[];
  }

  await ensureMediaHubManualMaterialStorage();

  const rows = await db.$queryRawUnsafe<MaterialRow[]>(
    `
      SELECT *
      FROM "MediaHubManualMaterial"
      WHERE "telegramChatId" = $1
      ORDER BY "receivedAt" DESC
      LIMIT 5
    `,
    chatId,
  );

  return (await attachMaterialAssets(rows)).map((row) => toMaterialDigest(row));
}

function toMaterialDigest(row: MaterialRowWithAssets, textLimit = MAX_EXTRACTED_TEXT_CHARS): MediaHubManualMaterialDigest {
  return {
    assets: row.assets,
    extractedFacts: row.extractedFactsJson,
    extractedTables: row.extractedTablesJson,
    extractedText: (row.extractedText ?? "").slice(0, textLimit),
    extractionStatus: row.extractionStatus,
    id: row.id,
    kind: row.kind,
    originalFilename: row.originalFilename,
    originalUrl: row.originalUrl,
    receivedAt: row.receivedAt,
    sourceDomain: row.sourceDomain,
    sourceRegistrationStatus: row.sourceRegistrationStatus,
    sourceType: row.sourceType,
    summary: row.summary ?? "",
    tenantId: row.tenantId,
    usedInReportId: row.usedInReportId,
  };
}

async function attachMaterialAssets(rows: MaterialRow[]): Promise<MaterialRowWithAssets[]> {
  if (rows.length === 0) {
    return [];
  }

  const assets = await db.$queryRawUnsafe<MaterialAssetRow[]>(
    `
      SELECT "id", "materialId", "assetType", "pageNumber", "storagePath",
        "mimeType", "byteSize", "extractedText", "visualSummary", "confidence",
        "metadataJson", "createdAt"
      FROM "MediaHubManualMaterialAsset"
      WHERE "materialId" = ANY($1::text[])
      ORDER BY "materialId", "pageNumber" NULLS LAST, "createdAt" ASC
    `,
    rows.map((row) => row.id),
  );
  const byMaterial = new Map<string, MediaHubManualMaterialAssetDigest[]>();
  for (const asset of assets) {
    const list = byMaterial.get(asset.materialId) ?? [];
    list.push({
      assetType: asset.assetType,
      byteSize: asset.byteSize,
      confidence: asset.confidence,
      extractedText: asset.extractedText ?? "",
      id: asset.id,
      metadata: asset.metadataJson,
      mimeType: asset.mimeType,
      pageNumber: asset.pageNumber,
      storagePath: asset.storagePath,
      visualSummary: asset.visualSummary ?? "",
    });
    byMaterial.set(asset.materialId, list);
  }

  return rows.map((row) => ({
    ...row,
    assets: byMaterial.get(row.id) ?? [],
  }));
}

async function storeManualMaterial(input: {
  canonicalUrl?: string;
  contentBytes: Buffer;
  extraction: ExtractedMaterialContent;
  kind: MediaHubManualMaterialKind;
  mimeType?: string;
  originalFilename?: string;
  originalUrl?: string;
  receivedFrom: "telegram" | "admin" | "scheduler";
  sourceDomain?: string;
  sourceType: MediaHubManualMaterialSourceType;
  telegramChatId?: string;
  telegramFromId?: string;
  telegramMessageId?: string;
  tenantId: MediaHubManualMaterialTenant;
}) {
  if (!hasDatabaseUrl()) {
    return buildResult(input.tenantId, input.kind, "skipped", "Database is not configured.");
  }

  await ensureMediaHubManualMaterialStorage();

  const contentHash = createHash("sha256").update(input.contentBytes).digest("hex");
  const period = getMediaHubManualMaterialPeriod(new Date(), input.kind);
  const existing = await db.$queryRawUnsafe<Array<{ id: string; extractionStatus: string }>>(
    `
      SELECT "id", "extractionStatus"
      FROM "MediaHubManualMaterial"
      WHERE "tenantId" = $1
        AND (
          "contentHash" = $2
          OR ($3::text IS NOT NULL AND "canonicalUrl" = $3 AND "reportingWeekStart" = $4::date AND "reportingWeekEnd" = $5::date)
        )
      LIMIT 1
    `,
    input.tenantId,
    contentHash,
    input.canonicalUrl ?? null,
    period.reportingWeekStart,
    period.reportingWeekEnd,
  );
  if (existing[0]) {
    return buildResult(input.tenantId, input.kind, "duplicate", "Duplicate material already exists.", existing[0].id);
  }

  const id = randomUUID();
  const summary = summarizeExtractedMaterial(input.extraction.extractedText);
  await db.$executeRawUnsafe(
    `
      INSERT INTO "MediaHubManualMaterial" (
        "id", "tenantId", "kind", "sourceType", "originalUrl", "canonicalUrl",
        "sourceDomain", "originalFilename", "mimeType", "fileSize", "contentHash",
        "reportingDate", "reportingWeekStart", "reportingWeekEnd", "reportingMonth",
        "receivedAt", "receivedFrom", "telegramChatId", "telegramMessageId", "telegramFromId",
        "hashtagsJson", "extractedText", "extractedTablesJson", "extractedFactsJson",
        "summary", "language", "extractionStatus", "sourceRegistrationStatus",
        "usedInReportId", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12::date, $13::date, $14::date, $15,
        NOW(), $16, $17, $18, $19,
        $20::jsonb, $21, $22::jsonb, $23::jsonb,
        $24, $25, $26, $27,
        NULL, NOW(), NOW()
      )
    `,
    id,
    input.tenantId,
    input.kind,
    input.sourceType,
    input.originalUrl ?? null,
    input.canonicalUrl ?? null,
    input.sourceDomain ?? null,
    input.originalFilename ?? null,
    input.mimeType ?? null,
    input.contentBytes.length,
    contentHash,
    period.reportingDate,
    period.reportingWeekStart,
    period.reportingWeekEnd,
    period.reportingMonth,
    input.receivedFrom,
    input.telegramChatId ?? null,
    input.telegramMessageId ?? null,
    input.telegramFromId ?? null,
    JSON.stringify([]),
    input.extraction.extractedText,
    JSON.stringify(input.extraction.extractedTables),
    JSON.stringify(input.extraction.extractedFacts),
    summary,
    detectLanguage(input.extraction.extractedText),
    input.extraction.extractionStatus,
    getSourceRegistrationStatus(input.sourceType, input.canonicalUrl),
  );

  await storeManualMaterialAssets({
    contentBytes: input.contentBytes,
    contentHash,
    extraction: input.extraction,
    materialId: id,
    mimeType: input.mimeType,
    originalFilename: input.originalFilename,
  });

  return buildResult(input.tenantId, input.kind, input.extraction.extractionStatus, "Material ingested.", id);
}

async function storeManualMaterialAssets(input: {
  contentBytes: Buffer;
  contentHash: string;
  extraction: ExtractedMaterialContent;
  materialId: string;
  mimeType?: string;
  originalFilename?: string;
}) {
  const originalBytes = shouldStoreOriginalBytes(input.contentBytes)
    ? input.contentBytes
    : undefined;
  const originalAsset: ExtractedMaterialAssetDraft = {
    assetType: "original",
    byteSize: input.contentBytes.length,
    bytes: originalBytes,
    confidence: 1,
    metadata: {
      contentHash: input.contentHash,
      filename: input.originalFilename ?? null,
      storedBytes: Boolean(originalBytes),
    },
    mimeType: input.mimeType ?? "application/octet-stream",
    storagePath: `mediahub://manual-material/${input.contentHash}/${sanitizeFilename(input.originalFilename ?? "original.bin")}`,
    visualSummary: originalBytes
      ? "Original material stored with the manual material record."
      : "Original material registered by content hash; binary bytes skipped by size/storage policy.",
  };
  const assets = [originalAsset, ...input.extraction.assets]
    .filter((asset) =>
      asset.assetType !== "extracted_text" ||
      Boolean(asset.extractedText?.trim()),
    )
    .slice(0, 12);

  for (const asset of assets) {
    await db.$executeRawUnsafe(
      `
        INSERT INTO "MediaHubManualMaterialAsset" (
          "id", "materialId", "assetType", "pageNumber", "storagePath",
          "mimeType", "byteSize", "extractedText", "visualSummary",
          "confidence", "metadataJson", "binaryBytes", "createdAt"
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11::jsonb, $12, NOW()
        )
      `,
      randomUUID(),
      input.materialId,
      asset.assetType,
      asset.pageNumber ?? null,
      asset.storagePath ?? null,
      asset.mimeType ?? null,
      asset.byteSize ?? asset.bytes?.length ?? null,
      asset.extractedText ?? null,
      asset.visualSummary ?? null,
      asset.confidence ?? null,
      JSON.stringify(asset.metadata ?? {}),
      getPersistedAssetBytes(asset),
    );
  }
}

function getPersistedAssetBytes(asset: ExtractedMaterialAssetDraft) {
  if (!asset.bytes) {
    return null;
  }
  if (asset.assetType === "original") {
    return asset.bytes;
  }
  if (asset.assetType === "preview_image") {
    return shouldStorePreviewBytes(asset.bytes) ? asset.bytes : null;
  }
  return null;
}

async function extractMaterialContent(input: {
  bytes: Buffer;
  filename?: string;
  mimeType: string;
}): Promise<ExtractedMaterialContent> {
  const mimeType = input.mimeType.toLowerCase();
  const filename = input.filename?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/")) {
    return enhanceVisualAssets({
      assets: [
        {
          assetType: "preview_image",
          byteSize: input.bytes.length,
          bytes: input.bytes,
          confidence: 0.35,
          metadata: { filename, parser: "image-preview" },
          mimeType,
          pageNumber: 1,
          visualSummary: "Image preview captured. OCR/vision summary can be added in the next processing pass.",
        },
        {
          assetType: "visual_summary",
          confidence: 0.35,
          metadata: { filename, parser: "image-preview" },
          mimeType: "text/plain",
          pageNumber: 1,
          visualSummary: "Image file received; treat it as visual evidence for admin review until OCR/vision is enabled.",
        },
      ],
      extractedFacts: [{ type: "image_visual_pending", filename }],
      extractedTables: [],
      extractedText: "",
      extractionStatus: "partial_visual_pending",
    });
  }
  if (!isAllowedMaterialType(mimeType, filename)) {
    return {
      assets: [],
      extractedFacts: [{ type: "unsupported", mimeType }],
      extractedTables: [],
      extractedText: "",
      extractionStatus: "unsupported",
    };
  }
  if (mimeType.includes("csv") || filename.endsWith(".csv")) {
    const text = decodeText(input.bytes);
    return {
      assets: buildTextAssets(text, "CSV text/table extracted for MediaHub evidence."),
      extractedFacts: extractFacts(text),
      extractedTables: [parseCsvTable(text)],
      extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
      extractionStatus: "extracted",
    };
  }
  if (mimeType.includes("html") || filename.endsWith(".html") || filename.endsWith(".htm")) {
    const text = stripHtml(decodeText(input.bytes));
    return {
      assets: buildTextAssets(text, "HTML text extracted for MediaHub evidence."),
      extractedFacts: extractFacts(text),
      extractedTables: [],
      extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
      extractionStatus: "extracted",
    };
  }
  if (mimeType.includes("pdf") || filename.endsWith(".pdf")) {
    const { extractPdfContent } = await import("@/lib/media-hub-pdf-extraction");
    const pdf = await extractPdfContent(input.bytes, input.filename ?? filename, {
      maxPreviewPages: getMaxPreviewPages(),
      maxTextChars: MAX_EXTRACTED_TEXT_CHARS,
      previewsEnabled: process.env.MEDIA_HUB_ENABLE_PDF_PREVIEWS !== "0",
    });
    const text = pdf.text;
    return enhanceVisualAssets({
      assets: [
        ...buildTextAssets(text, pdf.parser === "pdftotext" ? "PDF text extracted with pdftotext." : "PDF text extracted with fallback parser."),
        ...pdf.previewAssets,
      ],
      extractedFacts: extractFacts(text),
      extractedTables: [],
      extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
      extractionStatus: text.length > 120 || pdf.previewAssets.length > 0 ? "partial" : "unsupported",
    });
  }
  if (filename.endsWith(".xlsx") || mimeType.includes("spreadsheetml")) {
    return {
      assets: [{
        assetType: "visual_summary",
        confidence: 0.4,
        metadata: { filename, parser: "xlsx-metadata" },
        mimeType: "text/plain",
        visualSummary: "XLSX received. Binary table parsing is pending; use uploaded file metadata as admin evidence.",
      }],
      extractedFacts: [{ type: "xlsx_metadata", filename }],
      extractedTables: [{
        header: [],
        inferredTopic: inferTopic(filename),
        parseWarnings: ["XLSX binary parsing is not available without adding a dependency."],
        rows: [],
        sheetName: "metadata",
      }],
      extractedText: `XLSX received: ${input.filename ?? "uploaded file"}`,
      extractionStatus: "partial",
    };
  }
  if (filename.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
    return {
      assets: [{
        assetType: "visual_summary",
        confidence: 0.4,
        metadata: { filename, parser: "docx-metadata" },
        mimeType: "text/plain",
        visualSummary: "DOCX received. Text extraction is pending; use uploaded file metadata as admin evidence.",
      }],
      extractedFacts: [{ type: "docx_metadata", filename }],
      extractedTables: [],
      extractedText: `DOCX received: ${input.filename ?? "uploaded file"}`,
      extractionStatus: "partial",
    };
  }

  const text = decodeText(input.bytes);
  return {
    assets: buildTextAssets(text, "Text extracted for MediaHub evidence."),
    extractedFacts: extractFacts(text),
    extractedTables: [],
    extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
    extractionStatus: text.trim() ? "extracted" : "unsupported",
  };
}

function buildTextAssets(text: string, visualSummary: string): ExtractedMaterialAssetDraft[] {
  const extractedText = text.slice(0, MAX_EXTRACTED_TEXT_CHARS);
  return extractedText.trim()
    ? [{
        assetType: "extracted_text",
        byteSize: Buffer.byteLength(extractedText, "utf8"),
        confidence: 0.85,
        extractedText,
        metadata: { parser: "text" },
        mimeType: "text/plain",
        visualSummary,
      }]
    : [];
}

async function enhanceVisualAssets(content: ExtractedMaterialContent): Promise<ExtractedMaterialContent> {
  if (process.env.MEDIA_HUB_ENABLE_VISION_SUMMARY === "0" || !process.env.OPENAI_API_KEY) {
    return content;
  }

  const visualAssets = content.assets
    .filter((asset) => asset.assetType === "preview_image")
    .filter((asset) => asset.bytes?.length && asset.mimeType?.startsWith("image/"))
    .filter((asset) => (asset.bytes?.length ?? 0) <= getMaxVisionImageBytes())
    .slice(0, getMaxVisionPages());
  if (visualAssets.length === 0) {
    return content;
  }

  const model = process.env.MEDIA_HUB_VISION_MODEL || "gpt-4o-mini";
  for (const asset of visualAssets) {
    const summary = await summarizeVisualAssetWithOpenAi({
      bytes: asset.bytes as Buffer,
      filename: String(asset.metadata?.filename ?? "material-preview"),
      mimeType: asset.mimeType || "image/png",
      model,
      pageNumber: asset.pageNumber,
    });
    if (summary.text) {
      asset.visualSummary = summary.text;
      asset.confidence = 0.78;
      asset.metadata = {
        ...(asset.metadata ?? {}),
        visionModel: model,
        visionProvider: "openai",
        visionStatus: "summarized",
      };
    } else if (summary.error) {
      asset.metadata = {
        ...(asset.metadata ?? {}),
        visionError: summary.error,
        visionModel: model,
        visionProvider: "openai",
        visionStatus: "failed",
      };
    }
  }

  const generatedSummaries = visualAssets
    .filter((asset) => asset.metadata?.visionStatus === "summarized")
    .map((asset) => ({
      assetType: "visual_summary" as const,
      confidence: asset.confidence,
      metadata: {
        derivedFrom: "preview_image",
        pageNumber: asset.pageNumber ?? null,
        visionModel: model,
        visionProvider: "openai",
      },
      mimeType: "text/plain",
      pageNumber: asset.pageNumber,
      visualSummary: asset.visualSummary,
    }));

  return {
    ...content,
    assets: [...content.assets, ...generatedSummaries],
    extractionStatus: content.extractionStatus === "unsupported" ? "partial_visual" : content.extractionStatus,
  };
}

async function summarizeVisualAssetWithOpenAi(input: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
  model: string;
  pageNumber?: number;
}) {
  try {
    const response = await fetchExternalWithTimeout("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [{
          content: [
            {
              text: [
                "Summarize this visual material for commodity market intelligence.",
                "Focus on tables, charts, maps, commodity names, prices, volumes, dates, routes, weather and trade-policy facts.",
                "Ignore branding/layout unless it changes interpretation.",
                "Return 3-5 concise evidence bullets in plain text. Do not invent values.",
                `File: ${input.filename}${input.pageNumber ? ` page ${input.pageNumber}` : ""}.`,
              ].join(" "),
              type: "input_text",
            },
            {
              detail: "low",
              image_url: `data:${input.mimeType};base64,${input.bytes.toString("base64")}`,
              type: "input_image",
            },
          ],
          role: "user",
        }],
        max_output_tokens: 450,
        model: input.model,
        temperature: 0.1,
      }),
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }, OPENAI_VISUAL_SUMMARY_TIMEOUT_MS);
    if (!response.ok) {
      return { error: `openai_${response.status}` };
    }
    const payload = await response.json();
    const text = extractOpenAiResponseText(payload)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    return text ? { text } : { error: "openai_empty" };
  } catch (error) {
    return { error: sanitizeVisionError(error) };
  }
}

function extractOpenAiResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const response = payload as {
    output?: Array<{
      content?: Array<{ text?: string | { value?: string }; value?: string }>;
    }>;
    output_text?: string;
  };
  if (typeof response.output_text === "string") {
    return response.output_text;
  }
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => {
      if (typeof content.text === "string") return content.text;
      if (typeof content.text?.value === "string") return content.text.value;
      if (typeof content.value === "string") return content.value;
      return "";
    })
    .filter(Boolean)
    .join("\n") ?? "";
}

function shouldStoreOriginalBytes(bytes: Buffer) {
  if (process.env.MEDIA_HUB_STORE_ORIGINAL_BYTES === "0") {
    return false;
  }
  return bytes.length <= getMaxOriginalDbBytes();
}

function shouldStorePreviewBytes(bytes: Buffer) {
  if (process.env.MEDIA_HUB_STORE_PREVIEW_BYTES === "0") {
    return false;
  }
  return bytes.length <= 750 * 1024;
}

function getMaxVisionImageBytes() {
  const configured = Number(process.env.MEDIA_HUB_VISION_IMAGE_MAX_MB ?? 5);
  return Math.max(1, Math.min(12, configured || 5)) * 1024 * 1024;
}

function getMaxVisionPages() {
  const configured = Number(process.env.MEDIA_HUB_VISION_MAX_PAGES ?? 3);
  return Math.max(1, Math.min(6, configured || 3));
}

function sanitizeVisionError(error: unknown) {
  return error instanceof Error
    ? error.message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 160)
    : "unknown_vision_error";
}

function getMaxOriginalDbBytes() {
  const configured = Number(process.env.MEDIA_HUB_ORIGINAL_DB_MAX_MB ?? DEFAULT_MAX_ORIGINAL_DB_MB);
  return Math.max(1, Math.min(20, configured || DEFAULT_MAX_ORIGINAL_DB_MB)) * 1024 * 1024;
}

function getMaxPreviewPages() {
  const configured = Number(process.env.MEDIA_HUB_PDF_PREVIEW_PAGES ?? DEFAULT_MAX_PREVIEW_PAGES);
  return Math.max(1, Math.min(6, configured || DEFAULT_MAX_PREVIEW_PAGES));
}

async function ensureMediaHubManualMaterialStorage() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MediaHubManualMaterial" (
      "id" TEXT NOT NULL,
      "tenantId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "sourceType" TEXT NOT NULL,
      "originalUrl" TEXT,
      "canonicalUrl" TEXT,
      "sourceDomain" TEXT,
      "originalFilename" TEXT,
      "mimeType" TEXT,
      "fileSize" INTEGER,
      "contentHash" TEXT NOT NULL,
      "reportingDate" DATE NOT NULL,
      "reportingWeekStart" DATE NOT NULL,
      "reportingWeekEnd" DATE NOT NULL,
      "reportingMonth" TEXT NOT NULL,
      "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "receivedFrom" TEXT NOT NULL,
      "telegramChatId" TEXT,
      "telegramMessageId" TEXT,
      "telegramFromId" TEXT,
      "hashtagsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "extractedText" TEXT,
      "extractedTablesJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "extractedFactsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "summary" TEXT,
      "language" TEXT,
      "extractionStatus" TEXT NOT NULL,
      "sourceRegistrationStatus" TEXT NOT NULL DEFAULT 'none',
      "usedInReportId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MediaHubManualMaterial_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "MediaHubManualMaterial_tenant_hash_key"
    ON "MediaHubManualMaterial"("tenantId", "contentHash")
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubManualMaterial_tenant_week_idx"
    ON "MediaHubManualMaterial"("tenantId", "reportingWeekStart", "reportingWeekEnd")
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubManualMaterial_tenant_kind_received_idx"
    ON "MediaHubManualMaterial"("tenantId", "kind", "receivedAt" DESC)
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubManualMaterial_tenant_domain_idx"
    ON "MediaHubManualMaterial"("tenantId", "sourceDomain")
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubManualMaterial_used_report_idx"
    ON "MediaHubManualMaterial"("usedInReportId")
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MediaHubManualMaterialAsset" (
      "id" TEXT NOT NULL,
      "materialId" TEXT NOT NULL,
      "assetType" TEXT NOT NULL,
      "pageNumber" INTEGER,
      "storagePath" TEXT,
      "mimeType" TEXT,
      "byteSize" INTEGER,
      "extractedText" TEXT,
      "visualSummary" TEXT,
      "confidence" DOUBLE PRECISION,
      "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "binaryBytes" BYTEA,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MediaHubManualMaterialAsset_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubManualMaterialAsset_material_idx"
    ON "MediaHubManualMaterialAsset"("materialId", "assetType", "pageNumber")
  `);
}

function isAllowedMaterialType(mimeType: string, filename: string) {
  return ALLOWED_MIME_TYPES.has(mimeType) ||
    [".pdf", ".xlsx", ".csv", ".docx", ".txt", ".html", ".htm", ".md"].some((ext) => filename.endsWith(ext));
}

function getSourceRegistrationStatus(
  sourceType: MediaHubManualMaterialSourceType,
  canonicalUrl?: string,
) {
  if (sourceType === "scheduled_html" || sourceType === "scheduled_pdf" || sourceType === "scheduled_api") {
    return "active";
  }
  if (sourceType === "corporate_telegram_group") {
    return "active";
  }
  return canonicalUrl ? "candidate" : "none";
}

function isUnsafeMaterialUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const normalizedHost = host.replace(/^\[|\]$/g, "");
    return normalizedHost === "localhost" ||
      normalizedHost.endsWith(".localhost") ||
      !normalizedHost.includes(".") && !normalizedHost.includes(":") ||
      normalizedHost === "0.0.0.0" ||
      normalizedHost === "127.0.0.1" ||
      normalizedHost === "::" ||
      normalizedHost === "::1" ||
      /^fc[0-9a-f]*:/i.test(normalizedHost) ||
      /^fd[0-9a-f]*:/i.test(normalizedHost) ||
      normalizedHost.startsWith("fe80:") ||
      /^169\.254\./.test(normalizedHost) ||
      host === "127.0.0.1" ||
      /^10\./.test(normalizedHost) ||
      /^192\.168\./.test(normalizedHost) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalizedHost);
  } catch {
    return true;
  }
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": "1D3X-MediaHub/1.0 (+https://1d3x.com)",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getManualMaterialMaxBytes() {
  const configured = Number(process.env.MEDIA_HUB_MANUAL_MATERIAL_MAX_MB ?? DEFAULT_MAX_FILE_MB);
  return Math.max(1, Math.min(50, configured || DEFAULT_MAX_FILE_MB)) * 1024 * 1024;
}

function decodeText(buffer: Buffer) {
  return buffer.toString("utf8").replace(/\u0000/g, " ").trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvTable(text: string) {
  const delimiter = text.includes(";") && !text.includes(",") ? ";" : ",";
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
  return {
    header: rows[0] ?? [],
    inferredTopic: inferTopic(text.slice(0, 500)),
    parseWarnings: [],
    rows: rows.slice(1, 80),
    sheetName: "csv",
  };
}

function extractFacts(text: string) {
  const facts = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) =>
      line.length > 24 &&
      line.length < 260 &&
      /(\d|export|import|wheat|corn|soy|rapeseed|sunflower|oil|port|rail|wagon|freight|зерн|пшениц|кукурудз|соя|ріпак|соняшник|порт|експорт|імпорт)/i.test(line),
    )
    .slice(0, 24);
  return facts.map((text, index) => ({ index: index + 1, text }));
}

function summarizeExtractedMaterial(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" ")
    .slice(0, MAX_SUMMARY_CHARS);
}

function inferTopic(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("oil")) return "vegoils";
  if (lower.includes("rail") || lower.includes("port") || lower.includes("freight")) return "logistics";
  if (lower.includes("wheat") || lower.includes("corn") || lower.includes("soy")) return "grain-oilseeds";
  return "general";
}

function detectLanguage(text: string) {
  return /[іїєґ]/i.test(text) ? "uk" : "en";
}

function sanitizeFilename(value: string) {
  return getBasename(value).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload.bin";
}

function getBasename(value: string) {
  return value.split(/[\\/]/).filter(Boolean).pop() ?? "";
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildResult(
  tenantId: MediaHubManualMaterialTenant,
  kind: MediaHubManualMaterialKind,
  extractionStatus: string,
  message: string,
  id?: string,
): MaterialIngestResult {
  return {
    extractionStatus,
    id,
    kind,
    message,
    tenantId,
  };
}

export const __mediaHubManualMaterialTestHooks = {
  canonicalizeMediaHubMaterialUrl,
  extractMaterialContent,
  extractUrlsFromText,
  getMediaHubManualMaterialPeriod,
  isUnsafeMaterialUrl,
  parseMediaHubMaterialHashtags,
};
