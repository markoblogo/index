import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { createGeneratedMediaAsset } from "@/lib/generated-media-asset";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { upsertWeeklyEditorialPostFromSnapshot } from "@/lib/weekly-editorial-post-storage";
import {
  getLocalizedReportWorkspaceText,
  getReportWorkspaceConfig,
  listReportWorkspaceResources,
  type ReportWorkspaceResource,
} from "@/lib/report-workspace";
import { getWeeklyTelegramDigest } from "@/lib/telegram-source-collector";
import {
  getPublicHistoryData,
  type PublicHistoryItem,
} from "@/lib/public-api-data";

export type WeeklyReportStatus =
  | "draft"
  | "generated"
  | "needs_inputs"
  | "needs_review"
  | "approved"
  | "published"
  | "telegram_scheduled"
  | "telegram_sent"
  | "failed";

export type WeeklySourceType =
  | "index_data"
  | "logistics"
  | "export_data"
  | "futures"
  | "weather"
  | "policy"
  | "market_news"
  | "admin_note"
  | "other";

export type WeeklySourceScope = "permanent" | "one_off";

export type WeeklyReportSource = {
  createdAt: string;
  enabled: boolean;
  id: string;
  language: string;
  notes: string;
  reportId: string | null;
  scope: WeeklySourceScope;
  title: string;
  type: WeeklySourceType;
  updatedAt: string;
  url: string;
};

export type WeeklyReportPartSection = {
  body: string;
  title: string;
};

export type WeeklyReportPart = {
  key: "logistics" | "grains" | "oilseeds_processing";
  sections: WeeklyReportPartSection[];
  title: string;
};

export type WeeklyBlogSection = {
  body: string;
  title: string;
};

export type WeeklyBlogDraft = {
  closing: string;
  coverAlt: string;
  coverPrompt: string;
  intro: string;
  seoDescription: string;
  sections: WeeklyBlogSection[];
  slug: string;
  subtitle: string;
  title: string;
};

export type WeeklyReportContent = {
  blogDraft: WeeklyBlogDraft | null;
  executiveSummary: string[];
  disclaimer: string;
  methodology: string;
  parts: WeeklyReportPart[];
  sourceNotes: Array<{ title: string; type: WeeklySourceType; url: string }>;
  telegramMessages: [string, string, string];
};

export type WeeklyReportManifest = {
  adminNotes: string;
  aiBriefReferences: string[];
  analysisSources: Array<{
    notes: string;
    title: string;
    type: string;
    url: string;
  }>;
  dataConfidence: "limited" | "normal" | "strong";
  dailyValues: Record<
    string,
    Array<{ code: string; respondents: number; value: number }>
  >;
  fallbackText: string[];
  formatReferences: Array<{
    notes: string;
    title: string;
    type: string;
    url: string;
  }>;
  generatedForWeek: string;
  missingDataWarnings: string[];
  telegramDigest: {
    channels: Array<{
      channelHandle: string;
      channelTitle: string;
      peerId: string | null;
      postCount: number;
      posts: Array<{
        postUrl: string;
        publishedAt: string;
        text: string;
      }>;
    }>;
    endAt: string;
    postCount: number;
    startAt: string;
  };
  oneOffSources: WeeklyReportSource[];
  permanentSources: WeeklyReportSource[];
  structuredDataPack: string;
  weeklySummary: Array<{
    code: string;
    latestValue: number | null;
    respondents: number;
    volatility30d: number;
    weeklyChangeAbs: number;
    weeklyChangePct: number;
  }>;
};

export type WeeklyReportRecord = {
  adminEditedContent: {
    coverAssetId?: string;
    coverImageCaption?: string;
    coverImageUrl?: string;
    coverImageAlt?: string;
    manualNotes?: string;
    structuredDataPack?: string;
  } | null;
  aiGeneratedAt: string | null;
  aiModel: string | null;
  aiWarnings: string[];
  approvedAt: string | null;
  approvedBy: string | null;
  content: WeeklyReportContent | null;
  createdAt: string;
  dataConfidence: "limited" | "normal" | "strong";
  id: string;
  inputDataHash: string;
  language: string;
  missingInputs: string[];
  publicationDate: string | null;
  publishedAt: string | null;
  rawAiJson: unknown;
  slug: string;
  sourceManifest: WeeklyReportManifest | null;
  status: WeeklyReportStatus;
  telegramMessageIds: number[];
  telegramSendAt: string | null;
  telegramSentAt: string | null;
  title: string;
  updatedAt: string;
  version: number;
  weekEndDate: string;
  weekStartDate: string;
};

type WeeklyReportRow = {
  adminEditedContent: unknown;
  aiGeneratedAt: Date | null;
  aiModel: string | null;
  aiWarnings: unknown;
  approvedAt: Date | null;
  approvedBy: string | null;
  contentJson: unknown;
  createdAt: Date;
  dataConfidence: string | null;
  id: string;
  inputDataHash: string | null;
  language: string;
  missingInputs: unknown;
  publicationDate: Date | null;
  publishedAt: Date | null;
  rawAiJson: unknown;
  slug: string;
  sourceManifest: unknown;
  status: string;
  telegramMessageIds: unknown;
  telegramSendAt: Date | null;
  telegramSentAt: Date | null;
  title: string;
  updatedAt: Date;
  version: number;
  weekEndDate: Date;
  weekStartDate: Date;
};

type GeneratedWeeklyReportPayload = {
  aiWarnings?: string[];
  blogDraft?: {
    closing?: string;
    coverAlt?: string;
    coverPrompt?: string;
    intro?: string;
    seoDescription?: string;
    sections?: Array<{ body?: string; title?: string }>;
    slug?: string;
    subtitle?: string;
    title?: string;
  };
  executiveSummary?: string[];
  dataConfidence?: string;
  missingInputs?: string[];
  telegramMessages?: string[];
  parts?: Array<{
    key?: string;
    sections?: Array<{ body?: string; title?: string }>;
    title?: string;
  }>;
};

type NormalizedWeeklyReportPayload = {
  aiWarnings: string[];
  blogDraft: WeeklyBlogDraft;
  executiveSummary: string[];
  dataConfidence: "limited" | "normal" | "strong";
  missingInputs: string[];
  telegramMessages: [string, string, string];
  parts: WeeklyReportPart[];
};

const WEEKLY_KIND = "weekly_ai_report";
let weeklyStorageReady: Promise<void> | null = null;

export async function listWeeklyReports() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureWeeklyReportStorage();
  const rows = await db.$queryRawUnsafe<WeeklyReportRow[]>(
    `
      SELECT *
      FROM "WeeklyReport"
      WHERE "tenantId" = $1
      ORDER BY "weekEndDate" DESC, "createdAt" DESC
    `,
    getActiveIndexConfig().id,
  );

  return rows.map(mapWeeklyReportRow);
}

export async function getWeeklyReportById(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureWeeklyReportStorage();
  const rows = await db.$queryRawUnsafe<WeeklyReportRow[]>(
    `
      SELECT *
      FROM "WeeklyReport"
      WHERE "tenantId" = $1 AND "id" = $2
      LIMIT 1
    `,
    getActiveIndexConfig().id,
    id,
  );

  return rows[0] ? mapWeeklyReportRow(rows[0]) : null;
}

export async function getWeeklyReportByWeekEnd(
  weekEndDate: string,
  language = "uk",
) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureWeeklyReportStorage();
  const rows = await db.$queryRawUnsafe<WeeklyReportRow[]>(
    `
      SELECT *
      FROM "WeeklyReport"
      WHERE "tenantId" = $1
        AND "weekEndDate" = $2::date
        AND "language" = $3
      LIMIT 1
    `,
    getActiveIndexConfig().id,
    weekEndDate,
    language,
  );

  return rows[0] ? mapWeeklyReportRow(rows[0]) : null;
}

export async function getPublishedWeeklyReports() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureWeeklyReportStorage();
  const rows = await db.$queryRawUnsafe<WeeklyReportRow[]>(
    `
      SELECT *
      FROM "WeeklyReport"
      WHERE "tenantId" = $1
        AND "status" IN ('published', 'telegram_scheduled', 'telegram_sent')
      ORDER BY "weekEndDate" DESC
    `,
    getActiveIndexConfig().id,
  );

  return rows.map(mapWeeklyReportRow);
}

export async function getPublishedWeeklyReportBySlug(slug: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureWeeklyReportStorage();
  const rows = await db.$queryRawUnsafe<WeeklyReportRow[]>(
    `
      SELECT *
      FROM "WeeklyReport"
      WHERE "tenantId" = $1
        AND "slug" = $2
        AND "status" IN ('published', 'telegram_scheduled', 'telegram_sent')
      LIMIT 1
    `,
    getActiveIndexConfig().id,
    slug,
  );

  return rows[0] ? mapWeeklyReportRow(rows[0]) : null;
}

export async function listWeeklySources(reportId?: string | null) {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureWeeklyReportStorage();
  const rows = await db.$queryRawUnsafe<
    Array<
      WeeklyReportSource & {
        createdAt: Date;
        updatedAt: Date;
      }
    >
  >(
    `
      SELECT *
      FROM "WeeklyReportSource"
      WHERE "tenantId" = $1
        AND (
          "scope" = 'permanent'
          OR ("scope" = 'one_off' AND "reportId" = $2)
        )
      ORDER BY "scope" ASC, "createdAt" ASC
    `,
    getActiveIndexConfig().id,
    reportId ?? "",
  );

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function addWeeklySource(input: {
  enabled?: boolean;
  language?: string;
  notes?: string;
  reportId?: string | null;
  scope: WeeklySourceScope;
  title: string;
  type: WeeklySourceType;
  url?: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureWeeklyReportStorage();
  const id = randomUUID();
  await db.$executeRawUnsafe(
    `
      INSERT INTO "WeeklyReportSource" (
        "id", "tenantId", "reportId", "title", "url", "type", "scope", "language", "enabled", "notes", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `,
    id,
    getActiveIndexConfig().id,
    input.scope === "one_off" ? (input.reportId ?? null) : null,
    input.title.trim(),
    (input.url ?? "").trim(),
    input.type,
    input.scope,
    input.language ?? "uk",
    input.enabled ?? true,
    input.notes ?? "",
  );

  return id;
}

export async function setWeeklySourceEnabled(id: string, enabled: boolean) {
  if (!hasDatabaseUrl()) {
    return;
  }

  await ensureWeeklyReportStorage();
  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyReportSource"
      SET "enabled" = $2, "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $3
    `,
    getActiveIndexConfig().id,
    enabled,
    id,
  );
}

export async function ensureWeeklyReport(weekEndDate: string, language = "uk") {
  const existing = await getWeeklyReportByWeekEnd(weekEndDate, language);

  if (existing) {
    return existing;
  }

  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureWeeklyReportStorage();
  const id = randomUUID();
  const weekStartDate = formatDate(
    addDays(new Date(`${weekEndDate}T00:00:00.000Z`), -6),
  );
  const slug = `weekly-ai-commodity-logistics-report-${weekEndDate}-${language}`;
  const title =
    language === "uk"
      ? `Weekly AI Commodity & Logistics Report · тиждень до ${formatDateUk(weekEndDate)}`
      : `Weekly AI Commodity & Logistics Report · week ending ${weekEndDate}`;
  const workspaceConfig = await getReportWorkspaceConfig("weekly");
  const telegramSendAt = buildKyivTargetDate(
    weekEndDate,
    parseTimeHour(workspaceConfig.publishAt, 15),
  );
  await db.$executeRawUnsafe(
    `
      INSERT INTO "WeeklyReport" (
        "id", "tenantId", "weekStartDate", "weekEndDate", "publicationDate", "telegramSendAt",
        "title", "slug", "language", "status", "dataConfidence", "sourceManifest", "inputDataHash",
        "aiWarnings", "missingInputs", "telegramMessageIds", "adminEditedContent", "version",
        "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3::date, $4::date, NULL, $5,
        $6, $7, $8, 'draft', 'limited', '{}'::jsonb, '',
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 1,
        NOW(), NOW()
      )
    `,
    id,
    getActiveIndexConfig().id,
    weekStartDate,
    weekEndDate,
    telegramSendAt.toISOString(),
    title,
    slug,
    language,
  );

  revalidateWeeklyReportViews();
  return getWeeklyReportById(id);
}

export async function saveWeeklyReportAdminInputs(
  reportId: string,
  payload: {
    coverAssetId?: string;
    coverImageAlt?: string;
    coverImageCaption?: string;
    coverImageUrl?: string;
    manualNotes?: string;
    structuredDataPack?: string;
  },
) {
  const report = await getWeeklyReportById(reportId);

  if (!report || !hasDatabaseUrl()) {
    return null;
  }

  const nextEdited = {
    ...(report.adminEditedContent ?? {}),
    coverAssetId:
      payload.coverAssetId ?? report.adminEditedContent?.coverAssetId ?? "",
    coverImageAlt:
      payload.coverImageAlt ?? report.adminEditedContent?.coverImageAlt ?? "",
    coverImageCaption:
      payload.coverImageCaption ??
      report.adminEditedContent?.coverImageCaption ??
      "",
    coverImageUrl:
      payload.coverImageUrl ?? report.adminEditedContent?.coverImageUrl ?? "",
    manualNotes:
      payload.manualNotes ?? report.adminEditedContent?.manualNotes ?? "",
    structuredDataPack:
      payload.structuredDataPack ??
      report.adminEditedContent?.structuredDataPack ??
      "",
  };
  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyReport"
      SET "adminEditedContent" = $3::jsonb, "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    reportId,
    JSON.stringify(nextEdited),
  );

  return getWeeklyReportById(reportId);
}

export async function generateWeeklyCoverAsset(
  reportId: string,
  actorUserId?: string | null,
) {
  const report = await getWeeklyReportById(reportId);

  if (!report || !report.content?.blogDraft || !hasDatabaseUrl()) {
    return {
      skippedReason: "report_or_blog_draft_missing",
      status: "skipped" as const,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      skippedReason: "openai_api_key_missing",
      status: "skipped" as const,
    };
  }

  const prompt = report.content.blogDraft.coverPrompt.trim();
  if (!prompt) {
    return {
      skippedReason: "cover_prompt_missing",
      status: "skipped" as const,
    };
  }

  const model = process.env.SPIKE_WEEKLY_COVER_MODEL || "gpt-image-1";
  const quality = process.env.SPIKE_WEEKLY_COVER_QUALITY || "medium";
  const size = process.env.SPIKE_WEEKLY_COVER_SIZE || "1536x1024";
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      output_format: "png",
      prompt,
      quality,
      size,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    await appendWeeklyAuditLog({
      action: "weekly_cover_generation_failed",
      actorUserId,
      entityId: reportId,
      summary: `Weekly cover generation failed: ${error}`,
    });
    return { error, status: "failed" as const };
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const base64Data = payload.data?.[0]?.b64_json?.trim() ?? "";
  if (!base64Data) {
    return {
      skippedReason: "cover_image_missing_in_response",
      status: "skipped" as const,
    };
  }

  const asset = await createGeneratedMediaAsset({
    assetKind: "weekly_report_cover",
    base64Data,
    contentType: "image/png",
    fileName: buildWeeklyCoverFileName(report),
    metadata: {
      model,
      promptHash: createHash("sha256").update(prompt).digest("hex"),
      quality,
      reportId,
      size,
      weekEndDate: report.weekEndDate,
    },
    reportId,
  });

  if (!asset) {
    return {
      skippedReason: "asset_persist_failed",
      status: "skipped" as const,
    };
  }

  const coverImageUrl = `${getActiveIndexConfig().publicSiteUrl.replace(/\/$/, "")}/api/weekly-report-cover/${asset.id}`;
  await saveWeeklyReportAdminInputs(reportId, {
    coverAssetId: asset.id,
    coverImageAlt:
      report.content.blogDraft.coverAlt ||
      report.adminEditedContent?.coverImageAlt ||
      "",
    coverImageCaption:
      report.content.blogDraft.title ||
      report.adminEditedContent?.coverImageCaption ||
      "",
    coverImageUrl,
  });
  await appendWeeklyAuditLog({
    action: "weekly_cover_generated",
    actorUserId,
    entityId: reportId,
    summary: `Weekly cover asset generated with ${model}.`,
  });

  return {
    assetId: asset.id,
    coverImageUrl,
    status: "generated" as const,
  };
}

export async function buildWeeklySourceManifest(reportId: string) {
  const report = await getWeeklyReportById(reportId);

  if (!report) {
    return null;
  }

  const [history, aiBriefRows, workspaceConfig, workspaceResources, telegramDigest] = await Promise.all([
    getPublicHistoryData(),
    db.aiMarketBrief.findMany({
      orderBy: { tradeDate: "asc" },
      where: {
        kind: "daily_market_brief",
        locale: "uk",
        tenantId: getActiveIndexConfig().id,
        tradeDate: {
          gte: new Date(`${report.weekStartDate}T00:00:00.000Z`),
          lte: new Date(`${report.weekEndDate}T00:00:00.000Z`),
        },
      },
    }),
    getReportWorkspaceConfig("weekly"),
    listReportWorkspaceResources({ reportId: report.id, reportKind: "weekly" }),
    getWeeklyTelegramDigest(report.weekEndDate, report.id),
  ]);

  const weeklyRows = history.filter(
    (row) => row.date >= report.weekStartDate && row.date <= report.weekEndDate,
  );
  const grouped = groupByCommodity(weeklyRows);
  const normalizedResources = workspaceResources
    .filter((resource) => resource.enabled)
    .map(mapWorkspaceResourceToWeeklySource);
  const permanentSources = normalizedResources.filter(
    (source) => source.scope === "permanent",
  );
  const oneOffSources = normalizedResources.filter(
    (source) => source.scope === "one_off",
  );
  const analysisSources = workspaceResources
    .filter((resource) => resource.enabled && resource.role === "analysis_source")
    .map(mapWorkspaceResourceReference);
  const formatReferences = workspaceResources
    .filter((resource) => resource.enabled && resource.role === "format_reference")
    .map(mapWorkspaceResourceReference);
  const weeklySummary = [...grouped.entries()].map(([code, rows]) => {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted.at(-1) ?? first;
    const volatility30d = standardDeviation(sorted.map((row) => row.changePct));

    return {
      code,
      latestValue: last?.valueUsdPerMt ?? null,
      respondents: last?.respondents ?? 0,
      volatility30d: roundOne(volatility30d),
      weeklyChangeAbs: roundOne(
        (last?.valueUsdPerMt ?? 0) - (first?.valueUsdPerMt ?? 0),
      ),
      weeklyChangePct: first?.valueUsdPerMt
        ? roundOne(
            (((last?.valueUsdPerMt ?? 0) - first.valueUsdPerMt) /
              first.valueUsdPerMt) *
              100,
          )
        : 0,
    };
  });
  const averageRespondents =
    weeklySummary.length > 0
      ? weeklySummary.reduce((sum, row) => sum + row.respondents, 0) /
        weeklySummary.length
      : 0;
  const dataConfidence =
    averageRespondents >= 7
      ? "strong"
      : averageRespondents >= 5
        ? "normal"
        : "limited";
  const adminNotes = report.adminEditedContent?.manualNotes?.trim() ?? "";
  const structuredDataPack =
    report.adminEditedContent?.structuredDataPack?.trim() ?? "";
  const missingDataWarnings = [
    ...(weeklyRows.length === 0
      ? ["No published SPIKE daily values found for the selected week."]
      : []),
    ...(permanentSources.length === 0
      ? ["No permanent weekly sources are configured yet."]
      : []),
    ...(oneOffSources.length === 0
      ? ["No one-off weekly sources were attached to this report."]
      : []),
    ...(formatReferences.length === 0
      ? ["No weekly format references were configured."]
      : []),
    ...(adminNotes
      ? []
      : ["Admin notes were not provided for this weekly report."]),
  ];
  const fallbackText = [
    "AI may interpret only the provided SPIKE data, source notes and editorial notes.",
    "No unsupported numbers, causes or external claims should appear in the report.",
    workspaceConfig.sourceProcessingNotes,
  ];

  const manifest: WeeklyReportManifest = {
    adminNotes,
    aiBriefReferences: aiBriefRows.map((row) =>
      row.tradeDate.toISOString().slice(0, 10),
    ),
    analysisSources,
    dailyValues: buildDailyValuesByDate(weeklyRows),
    dataConfidence,
    fallbackText,
    formatReferences,
    generatedForWeek: report.weekEndDate,
    missingDataWarnings,
    telegramDigest: {
      ...telegramDigest,
      channels: telegramDigest.channels
        .filter((channel) => channel.postCount > 0)
        .map((channel) => ({
          ...channel,
          posts: channel.posts.slice(-20),
        })),
    },
    oneOffSources,
    permanentSources,
    structuredDataPack,
    weeklySummary,
  };
  const inputDataHash = buildShortHash(JSON.stringify(manifest));

  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyReport"
      SET "sourceManifest" = $3::jsonb,
          "dataConfidence" = $4,
          "missingInputs" = $5::jsonb,
          "inputDataHash" = $6,
          "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    reportId,
    JSON.stringify(manifest),
    dataConfidence,
    JSON.stringify(missingDataWarnings),
    inputDataHash,
  );

  return manifest;
}

export function assessWeeklyReportReadiness(manifest: WeeklyReportManifest) {
  const activeIndex = getActiveIndexConfig();
  const requiredCommodityCodes = new Set(
    activeIndex.commodities.map((commodity) => commodity.code),
  );
  const weeklySummaryCodes = new Set(
    manifest.weeklySummary
      .filter((item) => item.latestValue !== null)
      .map((item) => item.code),
  );
  const hasFullIndexCoverage = [...requiredCommodityCodes].every((code) =>
    weeklySummaryCodes.has(code),
  );
  const hasLogisticsContext = hasSectionSource(manifest, [
    "logistics",
    "transport",
    "road",
    "rail",
    "border",
    "port",
    "freight",
    "queue",
    "wagon",
    "truck",
  ]);
  const hasGrainsContext = hasSectionSource(manifest, [
    "grain",
    "grains",
    "corn",
    "wheat",
    "futures",
    "cbot",
    "matif",
    "export",
    "black sea",
    "зерн",
    "кукуруд",
    "пшениц",
  ]);
  const hasOilseedsContext = hasSectionSource(manifest, [
    "oilseed",
    "oilseeds",
    "sunflower",
    "soy",
    "rapeseed",
    "processing",
    "meal",
    "oil",
    "олій",
    "соняш",
    "соя",
    "ріпак",
  ]);

  const missingInputs = [
    ...(hasFullIndexCoverage
      ? []
      : ["Weekly SPIKE values are incomplete for one or more required positions."]),
    ...(hasLogisticsContext || manifest.adminNotes
      ? []
      : ["Weekly logistics context is not strong enough for public publication."]),
    ...(hasGrainsContext
      ? []
      : ["Weekly grains context is not strong enough for public publication."]),
    ...(hasOilseedsContext
      ? []
      : ["Weekly oilseeds and processing context is not strong enough for public publication."]),
  ];

  return {
    canPublish:
      hasFullIndexCoverage &&
      hasLogisticsContext &&
      hasGrainsContext &&
      hasOilseedsContext,
    missingInputs,
  };
}

export async function generateWeeklyReportDraft(
  reportId: string,
  actorUserId?: string | null,
) {
  const report = await getWeeklyReportById(reportId);

  if (!report) {
    return null;
  }

  const manifest =
    report.sourceManifest ?? (await buildWeeklySourceManifest(reportId));

  if (!manifest || !hasDatabaseUrl()) {
    return null;
  }

  const readiness = assessWeeklyReportReadiness(manifest);

  if (!readiness.canPublish) {
    const missingInputs = [...new Set([
      ...manifest.missingDataWarnings,
      ...readiness.missingInputs,
    ])];

    await db.$executeRawUnsafe(
      `
        UPDATE "WeeklyReport"
        SET "status" = 'needs_inputs',
            "dataConfidence" = $3,
            "contentJson" = NULL,
            "rawAiJson" = NULL,
            "aiWarnings" = $4::jsonb,
            "missingInputs" = $5::jsonb,
            "aiModel" = NULL,
            "aiGeneratedAt" = NULL,
            "updatedAt" = NOW(),
            "version" = "version" + 1,
            "approvedAt" = NULL,
            "approvedBy" = NULL
        WHERE "tenantId" = $1 AND "id" = $2
      `,
      getActiveIndexConfig().id,
      reportId,
      normalizeConfidence(manifest.dataConfidence),
      JSON.stringify([
        "Weekly report is waiting for additional inputs before public publication.",
        ...missingInputs,
      ]),
      JSON.stringify(missingInputs),
    );

    await appendWeeklyAuditLog({
      action: "weekly_report_needs_inputs",
      actorUserId,
      entityId: reportId,
      summary: "Weekly report marked as needs_inputs because required source coverage is incomplete.",
    });

    revalidateWeeklyReportViews();
    return getWeeklyReportById(reportId);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const workspaceConfig = await getReportWorkspaceConfig("weekly");
  const localizedConfig = getLocalizedReportWorkspaceText(
    workspaceConfig,
    report.language === "en" ? "en" : "uk",
  );
  const model =
    process.env.SPIKE_WEEKLY_EDITORIAL_MODEL ||
    process.env.SPIKE_WEEKLY_REPORT_MODEL ||
    process.env.SPIKE_AI_BRIEF_MODEL ||
    "gpt-4.1-mini";
  let generated: NormalizedWeeklyReportPayload | null = null;
  let rawAiJson: unknown = null;
  let warnings = manifest.missingDataWarnings;
  let missingInputs = manifest.missingDataWarnings;

  const localeInstruction =
    report.language === "en"
      ? "Write every public value in English only. Keep structure concise and professional."
      : "Write every public value in Ukrainian only. Keep structure concise and professional.";
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_output_tokens: 2200,
          input: [
            {
              role: "system",
              content:
                `You generate a Weekly AI Commodity & Logistics Report for SPIKE SPOT INDEX. Use only provided SPIKE data, source notes, admin notes and verified source manifests. Do not invent numbers, dates, causes, flows, export volumes, logistics statistics or official SPIKE values. Return strict JSON with keys: dataConfidence, aiWarnings, missingInputs, executiveSummary, telegramMessages, parts, blogDraft. executiveSummary must be 3 concise bullets. telegramMessages must be exactly 3 messages following the fixed public structure. parts must be exactly 3 objects with keys logistics, grains, oilseeds_processing. Each part must contain title and sections. blogDraft must contain title, subtitle, intro, sections, closing, seoDescription, slug, coverPrompt, coverAlt. The blog draft must be more narrative and blog-like than the report but still factual and non-promotional. Sections must be concise, professional, and not trading advice. ${localeInstruction}`,
            },
            {
              role: "user",
              content: JSON.stringify({
                editorialConfig: {
                  adminPrompt: localizedConfig.adminPrompt,
                  collectionWindowLabel: workspaceConfig.collectionWindowLabel,
                  reviewStartsAt: workspaceConfig.reviewStartsAt,
                  sourceProcessingNotes: workspaceConfig.sourceProcessingNotes,
                  telegramTemplate: localizedConfig.telegramTemplate,
                },
                reportWeek: report.weekEndDate,
                language: report.language,
                sourceManifest: manifest,
                requiredParts: [
                  {
                    key: "logistics",
                    sections: [
                      "AI Market Read",
                      "Road transport",
                      "Rail transport",
                      "Border direction",
                      "Port direction",
                      "Watch next week",
                    ],
                    title: "Part I. Logistics",
                  },
                  {
                    key: "grains",
                    sections: [
                      "AI Market Read",
                      "SPIKE Spot Commodity Index Ukraine",
                      "Corn",
                      "Wheat",
                      "Export geography",
                      "External market context",
                      "Watch next week",
                    ],
                    title: "Part II. Grains",
                  },
                  {
                    key: "oilseeds_processing",
                    sections: [
                      "AI Market Read",
                      "SPIKE Spot Commodity Index Ukraine",
                      "Sunflower",
                      "Rapeseed",
                      "Soybean",
                      "Oils / meals / processing products",
                      "Export geography",
                      "External market context",
                      "Watch next week",
                    ],
                    title: "Part III. Oilseeds & Processing",
                  },
                ],
              }),
            },
          ],
        }),
      });

      if (response.ok) {
        rawAiJson = await response.json();
        const text = extractResponseText(rawAiJson);
        generated = normalizeGeneratedWeeklyReportJson(JSON.parse(text));
      } else {
        warnings = [
          ...warnings,
          `OpenAI weekly report generation failed: ${response.status}`,
        ];
      }
    } catch (error) {
      warnings = [
        ...warnings,
        error instanceof Error
          ? error.message
          : "Unknown weekly report AI error",
      ];
    }
  } else {
    warnings = [
      ...warnings,
      "OPENAI_API_KEY is missing. Deterministic fallback was used.",
    ];
  }

  const normalized =
    generated ??
    buildDeterministicWeeklyReport(manifest, report.language as Locale);
  missingInputs = [
    ...new Set([
      ...(normalized.missingInputs ?? []),
      ...manifest.missingDataWarnings,
    ]),
  ];
  warnings = [...new Set([...(normalized.aiWarnings ?? []), ...warnings])];
  const content = buildWeeklyReportContent(
    report.weekEndDate,
    normalized,
    manifest,
    report.language as Locale,
  );

  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyReport"
      SET "status" = 'needs_review',
          "dataConfidence" = $3,
          "contentJson" = $4::jsonb,
          "rawAiJson" = $5::jsonb,
          "aiWarnings" = $6::jsonb,
          "missingInputs" = $7::jsonb,
          "aiModel" = $8,
          "aiGeneratedAt" = NOW(),
          "updatedAt" = NOW(),
          "version" = "version" + 1,
          "approvedAt" = NULL,
          "approvedBy" = NULL
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    reportId,
    normalizeConfidence(normalized.dataConfidence ?? manifest.dataConfidence),
    JSON.stringify(content),
    JSON.stringify(rawAiJson ?? normalized),
    JSON.stringify(warnings),
    JSON.stringify(missingInputs),
    apiKey ? model : "deterministic-fallback",
  );

  await appendWeeklyAuditLog({
    action: "weekly_report_generated",
    actorUserId,
    entityId: reportId,
    summary: `Weekly report draft generated for week ending ${report.weekEndDate}.`,
  });

  revalidateWeeklyReportViews();
  return getWeeklyReportById(reportId);
}

export async function approveWeeklyReport(
  reportId: string,
  actorUserId?: string | null,
) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const report = await getWeeklyReportById(reportId);
  if (
    !report ||
    report.status === "needs_inputs" ||
    !report.content ||
    (report.status !== "needs_review" && report.status !== "approved")
  ) {
    return null;
  }

  await ensureWeeklyReportStorage();
  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyReport"
      SET "status" = 'approved',
          "approvedAt" = NOW(),
          "approvedBy" = $3,
          "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    reportId,
    actorUserId ?? null,
  );
  await appendWeeklyAuditLog({
    action: "weekly_report_approved",
    actorUserId,
    entityId: reportId,
    summary: "Weekly report approved for publication.",
  });
  revalidateWeeklyReportViews();
  return getWeeklyReportById(reportId);
}

export async function publishWeeklyReport(
  reportId: string,
  actorUserId?: string | null,
) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const report = await getWeeklyReportById(reportId);
  if (
    !report ||
    report.status === "needs_inputs" ||
    !report.content ||
    report.status !== "approved"
  ) {
    return null;
  }

  await ensureWeeklyReportStorage();
  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyReport"
      SET "status" = 'published',
          "publicationDate" = NOW(),
          "publishedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    reportId,
  );
  await appendWeeklyAuditLog({
    action: "weekly_report_published",
    actorUserId,
    entityId: reportId,
    summary: "Weekly report published to website.",
  });
  const publishedReport = await getWeeklyReportById(reportId);
  if (publishedReport?.content?.blogDraft) {
    await upsertWeeklyEditorialPostFromSnapshot({
      coverImageAlt:
        publishedReport.adminEditedContent?.coverImageAlt?.trim() ||
        publishedReport.content.blogDraft.coverAlt,
      coverImageUrl:
        publishedReport.adminEditedContent?.coverImageUrl?.trim() || null,
      intro: publishedReport.content.blogDraft.intro,
      language: publishedReport.language,
      relatedReportId: publishedReport.id,
      relatedReportSlug: publishedReport.slug,
      relatedReportTitle: publishedReport.title,
      sections: publishedReport.content.blogDraft.sections,
      seoDescription: publishedReport.content.blogDraft.seoDescription,
      slug: publishedReport.content.blogDraft.slug,
      subtitle: publishedReport.content.blogDraft.subtitle,
      title: publishedReport.content.blogDraft.title,
      weekEndDate: publishedReport.weekEndDate,
    }, {
      preserveStatus: true,
    });
  }
  revalidateWeeklyReportViews();
  return publishedReport;
}

export async function scheduleWeeklyReportTelegram(
  reportId: string,
  actorUserId?: string | null,
) {
  const report = await getWeeklyReportById(reportId);
  const workspaceConfig = await getReportWorkspaceConfig("weekly");

  if (
    !report ||
    !hasDatabaseUrl() ||
    report.status === "needs_inputs" ||
    !report.content ||
    (report.status !== "approved" &&
      report.status !== "published" &&
      report.status !== "telegram_scheduled" &&
      report.status !== "telegram_sent")
  ) {
    return null;
  }

  const telegramSendAt = buildKyivTargetDate(
    report.weekEndDate,
    parseTimeHour(workspaceConfig.publishAt, 15),
  );
  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyReport"
      SET "status" = 'telegram_scheduled',
          "telegramSendAt" = $3,
          "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    reportId,
    telegramSendAt.toISOString(),
  );
  await appendWeeklyAuditLog({
    action: "weekly_report_telegram_scheduled",
    actorUserId,
    entityId: reportId,
    summary: `Weekly report Telegram send scheduled for ${telegramSendAt.toISOString()}.`,
  });
  revalidateWeeklyReportViews();
  return getWeeklyReportById(reportId);
}

export async function sendWeeklyReportTelegramNow(
  reportId: string,
  actorUserId?: string | null,
) {
  const report = await getWeeklyReportById(reportId);

  if (
    !report ||
    report.status === "needs_inputs" ||
    !report.content ||
    (report.status !== "approved" &&
      report.status !== "published" &&
      report.status !== "telegram_scheduled" &&
      report.status !== "telegram_sent")
  ) {
    return {
      skippedReason: "report_or_content_missing",
      status: "skipped" as const,
    };
  }

  const botToken =
    process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
    process.env.INDEX_TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
    process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
    process.env.UGA_TELEGRAM_ADMIN_CHAT_ID ??
    process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID;

  if (!botToken || !chatId || !hasDatabaseUrl()) {
    return {
      skippedReason: "telegram_not_configured",
      status: "skipped" as const,
    };
  }

  const messageIds: number[] = [];

  const coverImageUrl = report.adminEditedContent?.coverImageUrl?.trim() ?? "";
  if (coverImageUrl) {
    const coverCaption = (
      report.adminEditedContent?.coverImageCaption?.trim() ||
      report.content.blogDraft?.title ||
      report.title
    ).slice(0, 1024);
    const coverResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: coverCaption,
          chat_id: chatId,
          parse_mode: "HTML",
          photo: coverImageUrl,
        }),
      },
    );

    if (!coverResponse.ok) {
      const error = await coverResponse.text();
      await db.$executeRawUnsafe(
        `
          UPDATE "WeeklyReport"
          SET "status" = 'failed', "updatedAt" = NOW(), "aiWarnings" = COALESCE("aiWarnings", '[]'::jsonb) || to_jsonb($3::text)
          WHERE "tenantId" = $1 AND "id" = $2
        `,
        getActiveIndexConfig().id,
        reportId,
        `Telegram cover send failed: ${error}`,
      );
      return { error, status: "failed" as const };
    }

    const coverPayload = (await coverResponse.json()) as {
      result?: { message_id?: number };
    };
    messageIds.push(coverPayload.result?.message_id ?? 0);
  }

  for (const text of report.content.telegramMessages) {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          disable_web_page_preview: true,
          parse_mode: "HTML",
          text,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      await db.$executeRawUnsafe(
        `
          UPDATE "WeeklyReport"
          SET "status" = 'failed', "updatedAt" = NOW(), "aiWarnings" = COALESCE("aiWarnings", '[]'::jsonb) || to_jsonb($3::text)
          WHERE "tenantId" = $1 AND "id" = $2
        `,
        getActiveIndexConfig().id,
        reportId,
        `Telegram send failed: ${error}`,
      );
      return { error, status: "failed" as const };
    }

    const payload = (await response.json()) as {
      result?: { message_id?: number };
    };
    messageIds.push(payload.result?.message_id ?? 0);
  }

  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyReport"
      SET "status" = 'telegram_sent',
          "telegramSentAt" = NOW(),
          "telegramMessageIds" = $3::jsonb,
          "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    reportId,
    JSON.stringify(messageIds),
  );
  await appendWeeklyAuditLog({
    action: "weekly_report_telegram_sent",
    actorUserId,
    entityId: reportId,
    summary: "Weekly report sent to Telegram.",
  });
  revalidateWeeklyReportViews();
  return { messageIds, status: "sent" as const };
}

export async function sendDueWeeklyReports() {
  if (!hasDatabaseUrl()) {
    return { sent: 0, skippedReason: "database_not_configured" };
  }

  await ensureWeeklyReportStorage();
  const rows = await db.$queryRawUnsafe<WeeklyReportRow[]>(
    `
      SELECT *
      FROM "WeeklyReport"
      WHERE "tenantId" = $1
        AND "status" IN ('approved', 'published', 'telegram_scheduled')
        AND "telegramSendAt" IS NOT NULL
        AND "telegramSendAt" <= NOW()
      ORDER BY "telegramSendAt" ASC
    `,
    getActiveIndexConfig().id,
  );

  let sent = 0;

  for (const row of rows) {
    const result = await sendWeeklyReportTelegramNow(row.id);

    if (result.status === "sent") {
      sent += 1;
    }
  }

  return { sent, skippedReason: null };
}

export async function autoPrepareWeeklyReportDraft(
  weekEndDate = getLastSaturdayDate(),
) {
  const reports = await Promise.all([
    ensureWeeklyReport(weekEndDate, "uk"),
    ensureWeeklyReport(weekEndDate, "en"),
  ]);
  const validReports = reports.filter(
    (report): report is NonNullable<typeof report> => Boolean(report),
  );

  if (validReports.length === 0) {
    return {
      skippedReason: "database_not_configured",
      status: "skipped" as const,
    };
  }

  const generatedIds: string[] = [];
  for (const report of validReports) {
    await buildWeeklySourceManifest(report.id);
    if (report.status === "draft") {
      await generateWeeklyReportDraft(report.id, null);
      generatedIds.push(report.id);
    }
    const refreshedReport = await getWeeklyReportById(report.id);
    if (
      refreshedReport?.content?.blogDraft &&
      !refreshedReport.adminEditedContent?.coverImageUrl
    ) {
      await generateWeeklyCoverAsset(report.id, null);
    }
  }

  return {
    reportId: validReports[0]?.id ?? null,
    reportIds: validReports.map((report) => report.id),
    status: generatedIds.length > 0 ? ("generated" as const) : ("existing" as const),
  };
}

async function appendWeeklyAuditLog(input: {
  action: string;
  actorUserId?: string | null;
  entityId: string;
  summary: string;
}) {
  if (!hasDatabaseUrl()) {
    return;
  }

  await db.auditLog.create({
    data: {
      action: input.action,
      actorRole: input.actorUserId ? "admin" : null,
      actorUserId: input.actorUserId ?? null,
      entityId: input.entityId,
      entityType: WEEKLY_KIND,
      summary: input.summary,
    },
  });
}

function mapWeeklyReportRow(row: WeeklyReportRow): WeeklyReportRecord {
  return {
    adminEditedContent: parseJsonObject(row.adminEditedContent),
    aiGeneratedAt: row.aiGeneratedAt?.toISOString() ?? null,
    aiModel: row.aiModel,
    aiWarnings: parseJsonArray(row.aiWarnings),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedBy: row.approvedBy,
    content: parseJsonObject<WeeklyReportContent>(row.contentJson),
    createdAt: row.createdAt.toISOString(),
    dataConfidence: normalizeConfidence(row.dataConfidence),
    id: row.id,
    inputDataHash: row.inputDataHash ?? "",
    language: row.language,
    missingInputs: parseJsonArray(row.missingInputs),
    publicationDate: row.publicationDate?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    rawAiJson: row.rawAiJson,
    slug: row.slug,
    sourceManifest: parseJsonObject<WeeklyReportManifest>(row.sourceManifest),
    status: normalizeWeeklyStatus(row.status),
    telegramMessageIds: parseJsonNumberArray(row.telegramMessageIds),
    telegramSendAt: row.telegramSendAt?.toISOString() ?? null,
    telegramSentAt: row.telegramSentAt?.toISOString() ?? null,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
    weekEndDate: row.weekEndDate.toISOString().slice(0, 10),
    weekStartDate: row.weekStartDate.toISOString().slice(0, 10),
  };
}

function buildWeeklyReportContent(
  weekEndDate: string,
  payload: NormalizedWeeklyReportPayload,
  manifest: WeeklyReportManifest,
  locale: Locale,
): WeeklyReportContent {
  const sourceNotes = [
    ...manifest.permanentSources,
    ...manifest.oneOffSources,
  ].map((source) => ({
    title: source.title,
    type: source.type,
    url: source.url,
  }));
  const parts = payload.parts;
  const methodology =
    locale === "uk"
      ? "Щотижневий звіт поєднує опубліковані значення SPIKE SPOT INDEX, логістичні та ринкові джерела й редакційні нотатки. AI допомагає структурувати матеріал і виділяти ринковий сигнал, але не розраховує та не коригує офіційні значення SPIKE SPOT INDEX."
      : "The weekly report combines published SPIKE SPOT INDEX values, logistics and market sources, and editorial notes. AI helps structure the material and identify the market signal, but does not calculate or adjust official SPIKE SPOT INDEX values.";
  const disclaimer =
    locale === "uk"
      ? "Щотижневий AI Commodity & Logistics Report створюється на основі опублікованих значень SPIKE SPOT INDEX, перевірених джерел і редакційних нотаток. AI допомагає структурувати огляд ринку, але не розраховує та не змінює офіційні значення індексу. Це не є торговою рекомендацією."
      : "The Weekly AI Commodity & Logistics Report is built from published SPIKE SPOT INDEX values, verified sources and editorial notes. AI helps structure the market review, but does not calculate or change official index values. It is not a trading recommendation.";

  return {
    disclaimer,
    methodology,
    parts,
    sourceNotes,
    blogDraft: payload.blogDraft ?? null,
    executiveSummary: payload.executiveSummary,
    telegramMessages:
      payload.telegramMessages ??
      buildWeeklyTelegramMessages(manifest, weekEndDate),
  };
}

function normalizeGeneratedWeeklyReportJson(
  payload: GeneratedWeeklyReportPayload,
): NormalizedWeeklyReportPayload {
  const fallback = buildDeterministicWeeklyReport(
    {
      adminNotes: "",
      aiBriefReferences: [],
      analysisSources: [],
      dailyValues: {},
      dataConfidence: "limited",
      fallbackText: [],
      formatReferences: [],
      generatedForWeek: "",
      missingDataWarnings: [],
      telegramDigest: {
        channels: [],
        endAt: "",
        postCount: 0,
        startAt: "",
      },
      oneOffSources: [],
      permanentSources: [],
      structuredDataPack: "",
      weeklySummary: [],
    },
    "uk",
  );

  const executiveSummary = parseStringList(payload.executiveSummary);
  const telegramMessages = parseTelegramMessages(payload.telegramMessages);
  const parts = (payload.parts ?? [])
    .map((part) => ({
      key: normalizePartKey(part.key),
      sections: (part.sections ?? [])
        .map((section) => ({
          body: sanitizeWeeklyText(String(section.body ?? "").trim()),
          title: sanitizeWeeklyText(String(section.title ?? "").trim()),
        }))
        .filter((section) => section.title && section.body),
      title: sanitizeWeeklyText(String(part.title ?? "").trim()),
    }))
    .filter(
      (part) => part.key && part.title && part.sections.length > 0,
    ) as WeeklyReportPart[];

  return {
    aiWarnings: parseStringList(payload.aiWarnings).map(sanitizeWeeklyText),
    blogDraft: normalizeWeeklyBlogDraft(payload.blogDraft, fallback.blogDraft),
    executiveSummary:
      executiveSummary.length > 0
        ? executiveSummary.map(sanitizeWeeklyText)
        : fallback.executiveSummary,
    dataConfidence: normalizeConfidence(payload.dataConfidence),
    missingInputs: parseStringList(payload.missingInputs).map(sanitizeWeeklyText),
    telegramMessages:
      telegramMessages.length === 3
        ? (telegramMessages.map(sanitizeWeeklyText) as [string, string, string])
        : fallback.telegramMessages,
    parts: parts.length === 3 ? parts : fallback.parts,
  };
}

function buildDeterministicWeeklyReport(
  manifest: WeeklyReportManifest,
  locale: Locale,
) {
  const corn = findSummary(manifest, "CORN");
  const borderCorn = findSummary(manifest, "CORN FCA CHOP");
  const wheat = findSummary(manifest, "WHT 11.5");
  const feedWheat = findSummary(manifest, "FEED WHT");
  const soybean = findSummary(manifest, "GMO SOY");
  const sunflower = findSummary(manifest, "SUN");
  const hasLogisticsSource = hasSectionSource(manifest, [
    "logistics",
    "transport",
    "road",
    "rail",
    "border",
    "port",
    "freight",
    "queue",
    "wagon",
    "truck",
  ]);
  const hasGrainsSource = hasSectionSource(manifest, [
    "grain",
    "grains",
    "corn",
    "wheat",
    "futures",
    "cbot",
    "matif",
    "export",
    "black sea",
    "зерн",
    "кукуруд",
    "пшениц",
  ]);
  const hasOilseedsSource = hasSectionSource(manifest, [
    "oilseed",
    "oilseeds",
    "sunflower",
    "soy",
    "rapeseed",
    "processing",
    "meal",
    "oil",
    "олій",
    "соняш",
    "соя",
    "ріпак",
  ]);

  const executiveSummary =
    locale === "uk"
      ? [
          hasLogisticsSource
            ? `Логістичний фон тижня залишався зосередженим на перевезеннях і прикордонних напрямах, де ринок продовжував читати не лише ціну, а й швидкість руху вантажу.`
            : "Логістичний фон тижня був описовим і читався через наявні ринкові позиції без зайвих припущень.",
          hasGrainsSource
            ? `У зерновому блоці основний сигнал сформували кукурудза та пшениця: портові позиції залишилися базовою точкою відліку, а FCA Чоп допоміг відокремити портову динаміку від прикордонної.`
            : "У зерновому блоці ринковий сигнал залишився зосередженим на опублікованих значеннях без надмірних узагальнень.",
          hasOilseedsSource
            ? `В олійних позиціях ринок продовжив читати соєвий та соняшниковий сегменти через зміну тону переробки, внутрішнього попиту та експортної географії.`
            : "В олійних позиціях тиждень залишився сфокусованим на опублікованих benchmark-значеннях.",
        ]
      : [
          hasLogisticsSource
            ? "The weekly logistics backdrop stayed centered on transport and border lanes, where the market continued to read both price and physical flow speed."
            : "The logistics backdrop stayed descriptive and was read through available market positions without overstatement.",
          hasGrainsSource
            ? "In grains, the main signal came from corn and wheat: port positions remained the baseline reference while FCA Chop helped separate port-side from border-side dynamics."
            : "In grains, the weekly signal stayed focused on published values without overgeneralization.",
          hasOilseedsSource
            ? "In oilseeds, the market kept reading soybean and sunflower through shifts in processing tone, domestic demand and export geography."
            : "In oilseeds, the week remained centered on published benchmark values.",
        ];

  return {
    aiWarnings: manifest.missingDataWarnings,
    blogDraft: buildDeterministicWeeklyBlogDraft(manifest, locale),
    dataConfidence: manifest.dataConfidence,
    missingInputs: manifest.missingDataWarnings,
    executiveSummary,
    parts: [
      {
        key: "logistics",
        title: "Part I. Logistics",
        sections: [
          {
            title: "AI Market Read",
            body:
              locale === "uk"
                ? "Логістичний блок читає тижневу динаміку перевезень, коридорів руху та вузьких місць у подачі вантажу. Головний акцент — не на шумі окремого дня, а на структурі руху протягом тижня."
                : "The logistics block reads weekly changes in transport, lane flow and physical bottlenecks. The main emphasis is not on one-day noise, but on the structure of flow over the week.",
          },
          {
            title: "Road transport",
            body:
              locale === "uk"
                ? "Автомобільний напрямок залишається ключовим індикатором швидкого перерозподілу потоків між елеваторами, портами та прикордонними напрямами. Якщо подача в цей канал посилюється, ринок зазвичай читає це як ознаку короткого тактичного напруження."
                : "Road transport remains the quickest indicator of flow reallocation between elevators, ports and border lanes. When this channel tightens, the market usually reads it as a sign of short-term tactical pressure.",
          },
          {
            title: "Rail transport",
            body:
              locale === "uk"
                ? "Залізничний канал показує, де ринок обирає довший маршрут і де накопичення вантажу починає впливати на темп фізичної торгівлі. Для weekly reading важливі не окремі цифри, а зміна балансу між відвантаженням і чергами."
                : "Rail flow shows where the market prefers a longer route and where accumulation begins to affect the pace of physical trade. For weekly reading, the key is not one number, but the balance between dispatch and queueing.",
          },
          {
            title: "Border direction",
            body:
              locale === "uk"
                ? `Прикордонна кукурудза FCA Чоп завершила тиждень на рівні ${formatValue(borderCorn?.latestValue)} USD/t, а її тижнева зміна становила ${formatSigned(borderCorn?.weeklyChangeAbs ?? 0)} USD/t. Це підтверджує окрему поведінку border-ланцюга порівняно з портовими позиціями.`
                : `FCA Chop border corn closed the week at ${formatValue(borderCorn?.latestValue)} USD/t, with a weekly move of ${formatSigned(borderCorn?.weeklyChangeAbs ?? 0)} USD/t. This confirms a border-lane behaviour separate from port-side positions.`,
          },
          {
            title: "Port direction",
            body:
              locale === "uk"
                ? `Портові export позиції залишаються базовою точкою для weekly reading: кукурудза ${formatValue(corn?.latestValue)} USD/t, пшениця 11.5% ${formatValue(wheat?.latestValue)} USD/t. Саме вони задають головний тон для читання експортного попиту.`
                : `Port-side export positions remain the weekly reference point: corn ${formatValue(corn?.latestValue)} USD/t and 11.5% wheat ${formatValue(wheat?.latestValue)} USD/t. They set the main tone for export-demand reading.`,
          },
          {
            title: "Watch next week",
            body:
              locale === "uk"
                ? "На наступний тиждень варто дивитися, чи підтвердиться різниця між портовими й прикордонними котируваннями, чи посилиться швидкість подачі на автонапрямку та чи з'явиться новий імпульс у залізничному каналі."
                : "Next week, watch whether the gap between port and border quotes is confirmed, whether road-lane speed tightens, and whether a new impulse appears in rail flow.",
          },
        ],
      },
      {
        key: "grains",
        title: "Part II. Grains",
        sections: [
          {
            title: "AI Market Read",
            body:
              locale === "uk"
                ? "Зерновий блок читає тижневий рух через портові та прикордонні позиції, а також через те, як змінюється ринкова опора між кукурудзою та пшеницею. Тут важливий не один день, а підтверджений напрямок за тиждень."
                : "The grains block reads weekly movement through port and border positions and through the shifting market anchor between corn and wheat. The key point is not one day, but the confirmed direction over the week.",
          },
          {
            title: "SPIKE Spot Commodity Index Ukraine",
            body:
              locale === "uk"
                ? `Тижнева картина показує, що кукурудза змінилася на ${formatSigned(corn?.weeklyChangeAbs ?? 0)} USD/t, пшениця 11.5% — на ${formatSigned(wheat?.weeklyChangeAbs ?? 0)} USD/t, а фуражна пшениця — на ${formatSigned(feedWheat?.weeklyChangeAbs ?? 0)} USD/t. Це дає читачу не список цифр, а структуру руху.`
                : `The weekly picture shows corn changed by ${formatSigned(corn?.weeklyChangeAbs ?? 0)} USD/t, 11.5% wheat by ${formatSigned(wheat?.weeklyChangeAbs ?? 0)} USD/t, and feed wheat by ${formatSigned(feedWheat?.weeklyChangeAbs ?? 0)} USD/t. This gives structure rather than a raw list of numbers.`,
          },
          {
            title: "Corn",
            body:
              locale === "uk"
                ? `Основний експортний benchmark кукурудзи завершив тиждень на ${formatValue(corn?.latestValue)} USD/t, тоді як FCA Чоп закрився на ${formatValue(borderCorn?.latestValue)} USD/t. Це залишає окремий коридор між портом і кордоном.`
                : `The core export corn benchmark closed the week at ${formatValue(corn?.latestValue)} USD/t, while FCA Chop closed at ${formatValue(borderCorn?.latestValue)} USD/t. That keeps a separate corridor between port and border.`,
          },
          {
            title: "Wheat",
            body:
              locale === "uk"
                ? `Пшениця 11.5% завершила тиждень на ${formatValue(wheat?.latestValue)} USD/t, а фуражна пшениця — на ${formatValue(feedWheat?.latestValue)} USD/t. Різниця між ними підказує, де ринок залишає більшу цінову дисципліну, а де готовий платити за простіший quality mix.`
                : `11.5% wheat ended the week at ${formatValue(wheat?.latestValue)} USD/t, while feed wheat ended at ${formatValue(feedWheat?.latestValue)} USD/t. The spread helps show where the market keeps stricter pricing discipline and where it pays for a simpler quality mix.`,
          },
          {
            title: "Export geography",
            body:
              locale === "uk"
                ? "Поточна експортна географія охоплює CPT Одеса та FCA Чоп, тож ринок можна читати окремо через портову й прикордонну логіку. Це важливо для розуміння, де формується опора попиту."
                : "The current export geography covers CPT Odesa and FCA Chop, allowing the market to be read through separate port and border logic. That helps identify where demand support is forming.",
          },
          {
            title: "External market context",
            body:
              locale === "uk"
                ? "Зовнішній фон — це насамперед біржовий тон, регіональний експортний потік і зміна попиту з боку ключових покупців. Важливо читати не лише саму ціну, а й те, чи підкріплена вона зовнішнім ринком."
                : "External context is primarily the futures tone, regional export flow and changes in demand from key buyers. The key is not only the price itself, but whether the external market supports it.",
          },
          {
            title: "Watch next week",
            body:
              locale === "uk"
                ? "Наступного тижня варто дивитися, чи зерновий рух залишиться точковим по окремих позиціях, чи перейде в ширший ринковий сигнал по всьому комплексу зернових."
                : "Next week, watch whether grain movement remains isolated by position or turns into a broader market signal across the whole grain complex.",
          },
        ],
      },
      {
        key: "oilseeds_processing",
        title: "Part III. Oilseeds & Processing",
        sections: [
          {
            title: "AI Market Read",
            body:
              locale === "uk"
                ? "Блок олійних і продуктів переробки читає тижневу поведінку сої та соняшнику через переробку, внутрішній попит і експортну географію. Тут важливо бачити не тільки benchmark, а й те, як він впливає на суміжні продукти."
                : "The oilseeds and processing block reads weekly soybean and sunflower behaviour through processing, domestic demand and export geography. The key is not only the benchmark, but also how it affects linked products.",
          },
          {
            title: "SPIKE Spot Commodity Index Ukraine",
            body:
              locale === "uk"
                ? `Соя ГМО завершила тиждень на ${formatValue(soybean?.latestValue)} USD/t, а соняшник — на ${formatValue(sunflower?.latestValue)} USD/t. Ці позиції формують основу для читання переробного сегмента.`
                : `GMO soybean closed the week at ${formatValue(soybean?.latestValue)} USD/t, while sunflower finished at ${formatValue(sunflower?.latestValue)} USD/t. These positions form the base for reading the processing segment.`,
          },
          {
            title: "Sunflower",
            body:
              locale === "uk"
                ? `Соняшник показав тижневий рух ${formatSigned(sunflower?.weeklyChangeAbs ?? 0)} USD/t і залишився однією з головних позицій для читання переробки та внутрішнього попиту.`
                : `Sunflower posted a weekly move of ${formatSigned(sunflower?.weeklyChangeAbs ?? 0)} USD/t and remained one of the key positions for reading processing and domestic demand.`,
          },
          {
            title: "Rapeseed",
            body:
              locale === "uk"
                ? "Для ріпаку окремий щотижневий benchmark у цьому пакеті не сформовано, тому фокус звіту залишається на вже опублікованих та підтверджених позиціях."
                : "A separate weekly rapeseed benchmark is not formed in this pack, so the report stays focused on already published and confirmed positions.",
          },
          {
            title: "Soybean",
            body:
              locale === "uk"
                ? `Соя ГМО показала тижневий рух ${formatSigned(soybean?.weeklyChangeAbs ?? 0)} USD/t і залишається однією з найбільш чутливих позицій у переробному кошику.`
                : `GMO soybean posted a weekly move of ${formatSigned(soybean?.weeklyChangeAbs ?? 0)} USD/t and remains one of the most sensitive positions in the processing basket.`,
          },
          {
            title: "Oils / meals / processing products",
            body:
              locale === "uk"
                ? "Олії, макуха та суміжні продукти читаються як продовження базових олійних позицій. Якщо ринок додає новий тиск у переробці, це зазвичай видно саме тут."
                : "Oils, meal and linked products are read as an extension of the core oilseed positions. When processing pressure changes, it usually shows up here first.",
          },
          {
            title: "Export geography",
            body:
              locale === "uk"
                ? "Для олійних позицій важлива не лише ціна, а й те, як вона читається через портову логістику, експортні маршрути та попит з боку переробників."
                : "For oilseeds, the key is not only price but also how it reads through port logistics, export routes and processor demand.",
          },
          {
            title: "External market context",
            body:
              locale === "uk"
                ? "Зовнішній фон для олійних формується через біржовий рух, світовий попит на олії та зміну тональності в суміжних ринках. Це задає ширший контекст для внутрішньої ціни."
                : "The external backdrop for oilseeds is shaped by futures movement, global oil demand and tone changes in adjacent markets. That sets the broader context for the domestic price.",
          },
          {
            title: "Watch next week",
            body:
              locale === "uk"
                ? "На наступний тиждень важливо дивитися, чи підтвердиться рух по сої та соняшнику, чи зміниться настрій у переробці та чи додасться новий імпульс у суміжних продуктах."
                : "Next week, watch whether soybean and sunflower moves are confirmed, whether processing sentiment shifts and whether a new impulse appears in linked products.",
          },
        ],
      },
    ] satisfies WeeklyReportPart[],
    telegramMessages: buildWeeklyTelegramMessages(
      manifest,
      manifest.generatedForWeek || formatDate(new Date()),
    ),
  };
}

function buildDeterministicWeeklyBlogDraft(
  manifest: WeeklyReportManifest,
  locale: Locale,
): WeeklyBlogDraft {
  const dateLabel =
    locale === "uk"
      ? formatDateUk(manifest.generatedForWeek || formatDate(new Date()))
      : manifest.generatedForWeek || formatDate(new Date());
  const leadCommodity = manifest.weeklySummary[0];
  const focusLabel = leadCommodity?.code ?? "SPIKE";
  const title =
    locale === "uk"
      ? `Що тиждень показав у SPIKE SPOT INDEX: логістика, зернові та олійні до ${dateLabel}`
      : `What the week showed in SPIKE SPOT INDEX: logistics, grains and oilseeds to ${dateLabel}`;
  const subtitle =
    locale === "uk"
      ? "Тижневий блог-пост на базі weekly report, але в більш послідовній та редакторській формі."
      : "A weekly blog draft built from the weekly report in a more narrative editorial format.";
  const intro =
    locale === "uk"
      ? `Цей тиждень у SPIKE SPOT INDEX найкраще читався через поєднання логістики, експортного тону та переробних позицій. У центрі уваги залишався ${focusLabel}, але загальний сигнал формувався ширше, через поведінку всього комплексу.`
      : `This week in SPIKE SPOT INDEX was best read through a combination of logistics, export tone and processing positions. ${focusLabel} stayed near the center of attention, but the broader market signal was wider than a single line item.`;
  const closing =
    locale === "uk"
      ? "Для редактора цей блог-пост має працювати як більш читабельний narrative layer над weekly report, але без відриву від фактичної структури тижня."
      : "For editorial use, this blog draft should act as a more readable narrative layer above the weekly report without drifting away from the factual weekly structure.";

  return {
    closing,
    coverAlt:
      locale === "uk"
        ? `Редакційна обкладинка тижневого огляду SPIKE SPOT INDEX за тиждень до ${dateLabel}.`
        : `Editorial cover for the SPIKE SPOT INDEX weekly review for the week ending ${dateLabel}.`,
    coverPrompt:
      locale === "uk"
        ? `Editorial financial-agriculture blog cover, SPIKE SPOT INDEX weekly review, Ukraine grain and oilseed market, logistics + export + processing mood, confident print-magazine look, restrained palette, bold typography, no cartoon elements, week ending ${dateLabel}.`
        : `Editorial financial-agriculture blog cover, SPIKE SPOT INDEX weekly review, Ukraine grain and oilseed market, logistics + export + processing mood, confident print-magazine look, restrained palette, bold typography, no cartoon elements, week ending ${dateLabel}.`,
    intro,
    seoDescription:
      locale === "uk"
        ? "Щотижневий блог-пост на базі SPIKE SPOT INDEX: логістика, зернові, олійні та короткий narrative огляд ринкового тону."
        : "Weekly SPIKE SPOT INDEX blog post covering logistics, grains, oilseeds and a short narrative read of market tone.",
    sections: [
      {
        title: locale === "uk" ? "Логістика як перший сигнал" : "Logistics as the first signal",
        body:
          locale === "uk"
            ? "Логістичний блок тижня задає першу рамку для читання ринку: не лише ціна, а й швидкість потоку, поведінка коридорів та різниця між портовим і прикордонним напрямом."
            : "The logistics block sets the first frame for reading the market: not only price, but also flow speed, corridor behaviour and the spread between port and border routes.",
      },
      {
        title: locale === "uk" ? "Зернові: де ринок бачив опору" : "Grains: where the market saw support",
        body:
          locale === "uk"
            ? "У зерновому сегменті тиждень варто читати через базові експортні позиції та те, як вони взаємодіяли з прикордонною логікою. Це дало ринку зрозумілий benchmark для загального тону."
            : "In grains, the week is best read through the core export positions and the way they interacted with border logic. That gave the market a clearer benchmark for the overall tone.",
      },
      {
        title: locale === "uk" ? "Олійні та переробка" : "Oilseeds and processing",
        body:
          locale === "uk"
            ? "Олійні позиції показали, як внутрішній попит і переробка продовжують формувати окремий сегмент, який не завжди рухається синхронно із зерновими."
            : "Oilseed positions showed how domestic demand and processing continue to shape a segment that does not always move in sync with grains.",
      },
    ],
    slug: buildWeeklyBlogSlug(title),
    subtitle,
    title,
  };
}

function normalizeWeeklyBlogDraft(
  payload: GeneratedWeeklyReportPayload["blogDraft"],
  fallback: WeeklyBlogDraft,
): WeeklyBlogDraft {
  if (!payload) {
    return fallback;
  }

  const sections = (payload.sections ?? [])
    .map((section) => ({
      body: sanitizeWeeklyText(String(section.body ?? "").trim()),
      title: sanitizeWeeklyText(String(section.title ?? "").trim()),
    }))
    .filter((section) => section.title && section.body);

  return {
    closing: sanitizeWeeklyText(String(payload.closing ?? "").trim()) || fallback.closing,
    coverAlt: sanitizeWeeklyText(String(payload.coverAlt ?? "").trim()) || fallback.coverAlt,
    coverPrompt: sanitizeWeeklyText(String(payload.coverPrompt ?? "").trim()) || fallback.coverPrompt,
    intro: sanitizeWeeklyText(String(payload.intro ?? "").trim()) || fallback.intro,
    seoDescription:
      sanitizeWeeklyText(String(payload.seoDescription ?? "").trim()) ||
      fallback.seoDescription,
    sections: sections.length > 0 ? sections : fallback.sections,
    slug: buildWeeklyBlogSlug(String(payload.slug ?? "").trim() || fallback.slug),
    subtitle: sanitizeWeeklyText(String(payload.subtitle ?? "").trim()) || fallback.subtitle,
    title: sanitizeWeeklyText(String(payload.title ?? "").trim()) || fallback.title,
  };
}

function buildWeeklyBlogSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function buildWeeklyCoverFileName(report: WeeklyReportRecord) {
  const language = report.language === "en" ? "en" : "uk";
  return `spike-weekly-cover-${report.weekEndDate}-${language}.png`;
}

export function buildWeeklyTelegramMessages(
  manifest: WeeklyReportManifest,
  weekEndDate: string,
): [string, string, string] {
  const corn = findSummary(manifest, "CORN");
  const borderCorn = findSummary(manifest, "CORN FCA CHOP");
  const wheat = findSummary(manifest, "WHT 11.5");
  const feedWheat = findSummary(manifest, "FEED WHT");
  const soybean = findSummary(manifest, "GMO SOY");
  const sunflower = findSummary(manifest, "SUN");
  const logistics = buildWeeklyTelegramPart(
    "Частина I. Логістика",
    formatTelegramWeekEnd(weekEndDate),
    [
      `🧠 <b>Аналітичний висновок тижня</b>\nЛогістичний фон тижня читався через рух вантажів, темп подачі та різницю між портовим і прикордонним каналом.`,
      `🚚 <b>Автомобільні перевезення</b>\n${buildWeeklyTelegramFact(manifest, "road", "Автонапрям продовжив відображати ринковий темп фізичного руху вантажів.")}`,
      `🚝 <b>Залізничні перевезення</b>\n${buildWeeklyTelegramFact(manifest, "rail", "Залізничний канал залишився важливим індикатором перерозподілу потоків між напрямами.")}`,
      `🚧 <b>У напрямку кордону</b>\n${buildWeeklyTelegramFact(manifest, "border", "Прикордонний канал показує, де ринок стикається з чергами і зміною темпу відвантаження.")}`,
      `⚓️ <b>У напрямку порту</b>\n${buildWeeklyTelegramFact(manifest, "port", "Портовий канал залишається базовою опорою для експортного руху.")}`,
      `👀 <b>На що дивитися наступного тижня</b>\n• Чи збережеться різниця між портом і кордоном.\n• Чи зміниться темп автомобільної подачі.\n• Чи підтвердиться новий баланс у залізничному каналі.`,
    ],
  );
  const grains = buildWeeklyTelegramPart(
    "Частина II. Зернові",
    formatTelegramWeekEnd(weekEndDate),
    [
      `🧠 <b>Аналітичний висновок тижня</b>\nЗерновий блок читався через кукурудзу, пшеницю та різницю між портом і кордоном, яка задавала ринкову опору тижня.`,
      `📈 <b>SPIKE Spot Commodity Index Ukraine</b>\n• Кукурудза, пшениця 11.5% та фуражна пшениця показали тижневий рух у межах опублікованих значень.\n• FCA Чоп: ${formatValue(borderCorn?.latestValue)} USD/t.\n• Ринок читав не лише самі ціни, а й різницю між портом і кордоном.`,
      `🌽 <b>Кукурудза</b>\n• Кукурудза закріпилася як головна експортна опора тижня.\n• Опубліковане значення: ${formatValue(corn?.latestValue)} USD/t.\n• Тижневий рух: ${formatSigned(corn?.weeklyChangeAbs ?? 0)} USD/t.`,
      `🌾 <b>Пшениця</b>\n• Пшениця 11.5% та фуражна пшениця показали власну структуру попиту.\n• Пшениця 11.5%: ${formatValue(wheat?.latestValue)} USD/t.\n• Фуражна пшениця: ${formatValue(feedWheat?.latestValue)} USD/t.`,
      `🌍 <b>Експортна географія</b>\nПоточний тиждень найкраще читався через CPT Одеса та FCA Чоп, що допомогло окремо побачити портову й прикордонну логіку.`,
      `🌐 <b>Зовнішній ринковий фон</b>\nЗовнішній фон залишався важливим для читання зерна через futures tone, експортний попит і ширший чорноморський контекст.`,
      `👀 <b>На що дивитися наступного тижня</b>\n• Чи посилиться експортний попит.\n• Чи підтвердиться напрямок по кукурудзі.\n• Чи залишиться пшениця в окремому ціновому коридорі.`,
    ],
  );
  const oilseeds = buildWeeklyTelegramPart(
    "Частина III. Олійні та продукти переробки",
    formatTelegramWeekEnd(weekEndDate),
    [
      `🧠 <b>Аналітичний висновок тижня</b>\nОлійний блок читався через соняшник і сою, а також через те, як ці позиції впливали на тон переробки та суміжні продукти.`,
      `📈 <b>SPIKE Spot Commodity Index Ukraine</b>\n• Соняшник і соя ГМО залишилися головними опорними позиціями переробного сегмента.\n• Тиждень читався через переробку, внутрішній попит і експортний фон.`,
      `🌻 <b>Соняшник</b>\n• Соняшник залишився ключовим для читання переробного ринку.\n• Опубліковане значення: ${formatValue(sunflower?.latestValue)} USD/t.\n• Тижневий рух: ${formatSigned(sunflower?.weeklyChangeAbs ?? 0)} USD/t.`,
      `🌱 <b>Соя</b>\n• Соя ГМО зберегла важливість для переробного кошика.\n• Опубліковане значення: ${formatValue(soybean?.latestValue)} USD/t.\n• Тижневий рух: ${formatSigned(soybean?.weeklyChangeAbs ?? 0)} USD/t.`,
      `🛢 <b>Олії, макуха та продукти переробки</b>\nСуміжні продукти читаються через базові олійні позиції та зміну тону переробки.`,
      `🌍 <b>Експортна географія</b>\nДля олійних важливо дивитися не тільки на benchmark, а й на маршрути, попит переробників і цінову реакцію в суміжних продуктах.`,
      `🌐 <b>Зовнішній ринковий фон</b>\nСвітовий попит на олії, біржовий тон і реакція суміжних ринків залишаються ключовим контекстом.`,
      `👀 <b>На що дивитися наступного тижня</b>\n• Чи підтвердиться рух по соняшнику.\n• Чи зміниться настрій у сої.\n• Чи з'явиться новий сигнал у продуктах переробки.`,
    ],
  );

  return [logistics, grains, oilseeds];
}

function buildWeeklyTelegramPart(
  title: string,
  weekEndDate: string,
  lines: string[],
) {
  return [
    `🇺🇦 <b>SPIKE SPOT INDEX | Щотижневий огляд аграрного ринку та логістики</b>`,
    `📅 <b>Тиждень до ${weekEndDate}</b>`,
    "",
    `<b>${title}</b>`,
    "",
    ...lines,
    "",
    `<i>Щотижневий ринковий огляд SPIKE SPOT INDEX. Офіційні значення індексу залишаються методологічними.</i>`,
    "",
    "Spike Brokers – Ваш торговий партнер 🌎",
  ].join("\n");
}

function buildWeeklyTelegramFact(
  manifest: WeeklyReportManifest,
  kind: "road" | "rail" | "border" | "port" | "corn" | "wheat" | "sunflower" | "soy",
  fallback: string,
) {
  const sourceText = [
    manifest.adminNotes,
    manifest.structuredDataPack,
    manifest.fallbackText.join(" "),
    ...manifest.permanentSources.map((source) => `${source.title} ${source.notes} ${source.url}`),
    ...manifest.oneOffSources.map((source) => `${source.title} ${source.notes} ${source.url}`),
  ]
    .join(" ")
    .toLowerCase();
  const relevant = {
    road: ["road", "truck", "авто", "автомоб"],
    rail: ["rail", "wagon", "заліз"],
    border: ["border", "chop", "кордон"],
    port: ["port", "odesa", "порт"],
    corn: ["corn", "кукуруд"],
    wheat: ["wheat", "пшениц"],
    sunflower: ["sunflower", "соняш"],
    soy: ["soy", "соя"],
  }[kind];
  if (!relevant.some((keyword) => sourceText.includes(keyword))) {
    return `• ${fallback}`;
  }

  return `• ${fallback}`;
}

function parseTelegramMessages(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function sanitizeWeeklyText(value: string) {
  return value
    .replaceAll("source-grounded", "source-based")
    .replaceAll("datapack", "data pack")
    .replaceAll("admin inputs", "editorial notes")
    .replaceAll("framework", "structure")
    .replaceAll("black-box", "structured")
    .replaceAll("synthetic", "structured")
    .replaceAll("n/a", "—")
    .replaceAll("N/A", "—")
    .replaceAll("report не додає", "звіт не додає")
    .replaceAll("за відсутності повного набору", "за неповного набору")
    .replaceAll("не включає непідтверджені", "не робить непідтверджених")
    .replaceAll("може бути доданий через admin", "може бути доданий редакційно")
    .replaceAll("model", "структура")
    .replaceAll("tokens", "tokens")
    .replaceAll("cost", "cost")
    .trim();
}

function buildDailyValuesByDate(rows: PublicHistoryItem[]) {
  return rows.reduce<
    Record<string, Array<{ code: string; respondents: number; value: number }>>
  >((acc, row) => {
    acc[row.date] ??= [];
    acc[row.date].push({
      code: row.commodityCode,
      respondents: row.respondents,
      value: row.valueUsdPerMt,
    });
    return acc;
  }, {});
}

function groupByCommodity(rows: PublicHistoryItem[]) {
  return rows.reduce<Map<string, PublicHistoryItem[]>>((acc, row) => {
    const key = row.commodityCode;
    const current = acc.get(key) ?? [];
    current.push(row);
    acc.set(key, current);
    return acc;
  }, new Map());
}

function normalizePartKey(key: string | undefined) {
  return key === "logistics" ||
    key === "grains" ||
    key === "oilseeds_processing"
    ? key
    : "";
}

function normalizeWeeklyStatus(status: string): WeeklyReportStatus {
  return (
    [
      "draft",
      "generated",
      "needs_review",
      "approved",
      "published",
      "telegram_scheduled",
      "telegram_sent",
      "failed",
    ] as WeeklyReportStatus[]
  ).includes(status as WeeklyReportStatus)
    ? (status as WeeklyReportStatus)
    : "draft";
}

function parseJsonObject<T extends object>(value: unknown) {
  return value && typeof value === "object" ? (value as T) : null;
}

function parseJsonArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function parseJsonNumberArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter(Number.isFinite)
    : [];
}

function parseStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function hasSectionSource(
  manifest: WeeklyReportManifest,
  keywords: string[],
) {
  const haystacks = [
    manifest.adminNotes,
    manifest.structuredDataPack,
    ...manifest.fallbackText,
    ...manifest.aiBriefReferences,
    ...manifest.permanentSources.map(
      (source) => `${source.title} ${source.notes} ${source.url}`,
    ),
    ...manifest.oneOffSources.map(
      (source) => `${source.title} ${source.notes} ${source.url}`,
    ),
  ]
    .join(" ")
    .toLowerCase();

  return keywords.some((keyword) => haystacks.includes(keyword.toLowerCase()));
}

function normalizeConfidence(value: unknown): "limited" | "normal" | "strong" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (
    normalized === "limited" ||
    normalized === "strong" ||
    normalized === "normal"
  ) {
    return normalized;
  }
  if (normalized === "high") {
    return "strong";
  }
  if (normalized === "low") {
    return "limited";
  }
  return "normal";
}

function extractResponseText(payload: unknown): string {
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
    return response.output_text.trim();
  }

  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .map((content) => {
        if (typeof content.text === "string") {
          return content.text;
        }
        if (content.text && typeof content.text.value === "string") {
          return content.text.value;
        }
        return typeof content.value === "string" ? content.value : "";
      })
      .filter(Boolean)
      .join("\n")
      .trim() || ""
  );
}

function findSummary(manifest: WeeklyReportManifest, code: string) {
  return manifest.weeklySummary.find((item) => item.code === code) ?? null;
}

function formatValue(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(1);
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${roundOne(value).toFixed(1)}`;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

function buildShortHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0").slice(0, 8);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateUk(date: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatTelegramWeekEnd(date: string) {
  const formatter = new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  return formatter.format(new Date(`${date}T00:00:00.000Z`));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildKyivTargetDate(date: string, targetHour: number) {
  let candidate = new Date(`${date}T11:00:00.000Z`);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  for (let index = 0; index < 6; index += 1) {
    const parts = formatter.formatToParts(candidate);
    const hour = Number(
      parts.find((part) => part.type === "hour")?.value ?? "0",
    );
    const day = parts.find((part) => part.type === "day")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const year = parts.find((part) => part.type === "year")?.value;
    const localDate = `${year}-${month}-${day}`;

    if (hour === targetHour && localDate === date) {
      return candidate;
    }

    candidate = new Date(
      candidate.getTime() + (targetHour - hour) * 60 * 60 * 1000,
    );
  }

  return candidate;
}

function parseTimeHour(value: string, fallback: number) {
  const match = value.match(/^(\d{1,2})/);
  if (!match) {
    return fallback;
  }

  const hour = Number(match[1]);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : fallback;
}

function mapWorkspaceResourceToWeeklySource(
  resource: ReportWorkspaceResource,
): WeeklyReportSource {
  return {
    createdAt: resource.createdAt,
    enabled: resource.enabled,
    id: resource.id,
    language: resource.language,
    notes: resource.notes,
    reportId: resource.reportId,
    scope: resource.scope,
    title: resource.title,
    type: mapWorkspaceResourceTypeToWeeklyType(resource.type),
    updatedAt: resource.updatedAt,
    url: resource.url,
  };
}

function mapWorkspaceResourceReference(resource: ReportWorkspaceResource) {
  return {
    notes: resource.notes,
    title: resource.title,
    type: resource.type,
    url: resource.url,
  };
}

function mapWorkspaceResourceTypeToWeeklyType(
  type: ReportWorkspaceResource["type"],
): WeeklySourceType {
  switch (type) {
    case "telegram_channel":
      return "market_news";
    case "website":
      return "market_news";
    case "blog":
      return "market_news";
    case "file":
      return "other";
    case "note":
      return "admin_note";
    case "prompt":
      return "admin_note";
    default:
      return "other";
  }
}

function getLastSaturdayDate() {
  const now = new Date();
  const kyivDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const base = new Date(`${kyivDate}T00:00:00.000Z`);
  const day = base.getUTCDay();
  const diff = day >= 6 ? day - 6 : day + 1;
  return formatDate(addDays(base, -diff));
}

async function ensureWeeklyReportStorage() {
  if (!hasDatabaseUrl()) {
    return;
  }

  weeklyStorageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WeeklyReport" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "weekStartDate" DATE NOT NULL,
        "weekEndDate" DATE NOT NULL,
        "publicationDate" TIMESTAMP(3),
        "telegramSendAt" TIMESTAMP(3),
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "language" TEXT NOT NULL DEFAULT 'uk',
        "status" TEXT NOT NULL DEFAULT 'draft',
        "dataConfidence" TEXT,
        "sourceManifest" JSONB,
        "inputDataHash" TEXT,
        "aiModel" TEXT,
        "aiGeneratedAt" TIMESTAMP(3),
        "aiWarnings" JSONB,
        "missingInputs" JSONB,
        "approvedAt" TIMESTAMP(3),
        "approvedBy" TEXT,
        "publishedAt" TIMESTAMP(3),
        "telegramSentAt" TIMESTAMP(3),
        "telegramMessageIds" JSONB,
        "contentJson" JSONB,
        "rawAiJson" JSONB,
        "adminEditedContent" JSONB,
        "version" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyReport_tenantId_weekEndDate_language_key"
      ON "WeeklyReport"("tenantId", "weekEndDate", "language")
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyReport_tenantId_slug_key"
      ON "WeeklyReport"("tenantId", "slug")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "WeeklyReport_tenantId_status_weekEndDate_idx"
      ON "WeeklyReport"("tenantId", "status", "weekEndDate")
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WeeklyReportSource" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "reportId" TEXT,
        "title" TEXT NOT NULL,
        "url" TEXT NOT NULL DEFAULT '',
        "type" TEXT NOT NULL,
        "scope" TEXT NOT NULL,
        "language" TEXT NOT NULL DEFAULT 'uk',
        "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "notes" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WeeklyReportSource_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "WeeklyReportSource_tenantId_scope_idx"
      ON "WeeklyReportSource"("tenantId", "scope", "enabled")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "WeeklyReportSource_reportId_idx"
      ON "WeeklyReportSource"("reportId")
    `);
  })();

  await weeklyStorageReady;
}

function revalidateWeeklyReportViews() {
  revalidatePath("/admin/weekly-report");
  revalidatePath("/uk/analytics/weekly-reports");
  revalidatePath("/en/analytics/weekly-reports");
}
