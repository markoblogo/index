import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { MediaHubPublicationKind } from "@/lib/media-hub-publication-scheduler";

export type MediaHubManualMaterialKind =
  | "daily_material"
  | "weekly_material"
  | "monthly_material"
  | "source_candidate";

export type MediaHubManualMaterialSourceType =
  | "telegram_file"
  | "telegram_link"
  | "admin_upload"
  | "admin_link"
  | "scheduled_pdf"
  | "scheduled_html";

export type MediaHubManualMaterialTenant = "spike-ua" | "1d3x";

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

export type MediaHubManualMaterialDigest = {
  extractedFacts: unknown;
  extractedTables: unknown;
  extractedText: string;
  id: string;
  kind: string;
  originalFilename: string | null;
  originalUrl: string | null;
  sourceDomain: string | null;
  sourceRegistrationStatus: string;
  sourceType: string;
  summary: string;
};

const MAX_EXTRACTED_TEXT_CHARS = 18_000;
const MAX_SUMMARY_CHARS = 900;
const DEFAULT_MAX_FILE_MB = 20;
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

  const extraction = extractMaterialContent({
    bytes,
    filename: basename(new URL(canonicalUrl).pathname) || undefined,
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

  const extraction = extractMaterialContent(input);
  const tmp = await mkdtemp(join(tmpdir(), "media-hub-material-"));
  const tmpPath = join(tmp, sanitizeFilename(input.filename));
  try {
    await writeFile(tmpPath, input.bytes);
    return await storeManualMaterial({
      ...input,
      contentBytes: input.bytes,
      extraction,
      originalFilename: input.filename,
    });
  } finally {
    await rm(tmp, { force: true, recursive: true }).catch(() => undefined);
  }
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
        AND "extractionStatus" IN ('extracted', 'partial', 'unsupported_image_ocr')
      ORDER BY "receivedAt" DESC
      LIMIT 32
    `,
    input.tenantId,
    input.periodStartDate,
    input.periodEndDate,
    materialKind,
    fallbackKind,
  );

  return rows.map((row) => ({
    extractedFacts: row.extractedFactsJson,
    extractedTables: row.extractedTablesJson,
    extractedText: (row.extractedText ?? "").slice(0, 4000),
    id: row.id,
    kind: row.kind,
    originalFilename: row.originalFilename,
    originalUrl: row.originalUrl,
    sourceDomain: row.sourceDomain,
    sourceRegistrationStatus: row.sourceRegistrationStatus,
    sourceType: row.sourceType,
    summary: row.summary ?? "",
  }));
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

  return rows.map((row) => ({
    extractedFacts: row.extractedFactsJson,
    extractedTables: row.extractedTablesJson,
    extractedText: row.extractedText ?? "",
    id: row.id,
    kind: row.kind,
    originalFilename: row.originalFilename,
    originalUrl: row.originalUrl,
    sourceDomain: row.sourceDomain,
    sourceRegistrationStatus: row.sourceRegistrationStatus,
    sourceType: row.sourceType,
    summary: row.summary ?? "",
  }));
}

async function storeManualMaterial(input: {
  canonicalUrl?: string;
  contentBytes: Buffer;
  extraction: ReturnType<typeof extractMaterialContent>;
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

  return buildResult(input.tenantId, input.kind, input.extraction.extractionStatus, "Material ingested.", id);
}

function extractMaterialContent(input: {
  bytes: Buffer;
  filename?: string;
  mimeType: string;
}) {
  const mimeType = input.mimeType.toLowerCase();
  const filename = input.filename?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/")) {
    return {
      extractedFacts: [{ type: "unsupported_image_ocr", filename }],
      extractedTables: [],
      extractedText: "",
      extractionStatus: "unsupported_image_ocr",
    };
  }
  if (!isAllowedMaterialType(mimeType, filename)) {
    return {
      extractedFacts: [{ type: "unsupported", mimeType }],
      extractedTables: [],
      extractedText: "",
      extractionStatus: "unsupported",
    };
  }
  if (mimeType.includes("csv") || filename.endsWith(".csv")) {
    const text = decodeText(input.bytes);
    return {
      extractedFacts: extractFacts(text),
      extractedTables: [parseCsvTable(text)],
      extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
      extractionStatus: "extracted",
    };
  }
  if (mimeType.includes("html") || filename.endsWith(".html") || filename.endsWith(".htm")) {
    const text = stripHtml(decodeText(input.bytes));
    return {
      extractedFacts: extractFacts(text),
      extractedTables: [],
      extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
      extractionStatus: "extracted",
    };
  }
  if (mimeType.includes("pdf") || filename.endsWith(".pdf")) {
    const text = extractPdfText(input.bytes);
    return {
      extractedFacts: extractFacts(text),
      extractedTables: [],
      extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
      extractionStatus: text.length > 120 ? "partial" : "unsupported",
    };
  }
  if (filename.endsWith(".xlsx") || mimeType.includes("spreadsheetml")) {
    return {
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
      extractedFacts: [{ type: "docx_metadata", filename }],
      extractedTables: [],
      extractedText: `DOCX received: ${input.filename ?? "uploaded file"}`,
      extractionStatus: "partial",
    };
  }

  const text = decodeText(input.bytes);
  return {
    extractedFacts: extractFacts(text),
    extractedTables: [],
    extractedText: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
    extractionStatus: text.trim() ? "extracted" : "unsupported",
  };
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
}

function isAllowedMaterialType(mimeType: string, filename: string) {
  return ALLOWED_MIME_TYPES.has(mimeType) ||
    [".pdf", ".xlsx", ".csv", ".docx", ".txt", ".html", ".htm", ".md"].some((ext) => filename.endsWith(ext));
}

function getSourceRegistrationStatus(
  sourceType: MediaHubManualMaterialSourceType,
  canonicalUrl?: string,
) {
  if (sourceType === "scheduled_html" || sourceType === "scheduled_pdf") {
    return "active";
  }
  return canonicalUrl ? "candidate" : "none";
}

function isUnsafeMaterialUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
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

function extractPdfText(buffer: Buffer) {
  return buffer
    .toString("latin1")
    .replace(/\\([()\\])/g, "$1")
    .match(/\(([^()]{8,})\)/g)
    ?.map((part) => part.slice(1, -1))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim() ?? "";
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
  return basename(value).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload.bin";
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
  extractUrlsFromText,
  getMediaHubManualMaterialPeriod,
  parseMediaHubMaterialHashtags,
};
