import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  getPublicHistoryData,
  type PublicHistoryItem,
} from "@/lib/public-api-data";

export type WeeklyReportStatus =
  | "draft"
  | "generated"
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

export type WeeklyReportContent = {
  disclaimer: string;
  methodology: string;
  parts: WeeklyReportPart[];
  sourceNotes: Array<{ title: string; type: WeeklySourceType; url: string }>;
  telegramMessages: [string, string, string];
};

export type WeeklyReportManifest = {
  adminNotes: string;
  aiBriefReferences: string[];
  dataConfidence: "limited" | "normal" | "strong";
  dailyValues: Record<
    string,
    Array<{ code: string; respondents: number; value: number }>
  >;
  fallbackText: string[];
  generatedForWeek: string;
  missingDataWarnings: string[];
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
  dataConfidence?: string;
  missingInputs?: string[];
  parts?: Array<{
    key?: string;
    sections?: Array<{ body?: string; title?: string }>;
    title?: string;
  }>;
};

type NormalizedWeeklyReportPayload = {
  aiWarnings: string[];
  dataConfidence: "limited" | "normal" | "strong";
  missingInputs: string[];
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
  const slug = `weekly-ai-commodity-logistics-report-${weekEndDate}`;
  const title =
    language === "uk"
      ? `Weekly AI Commodity & Logistics Report · тиждень до ${formatDateUk(weekEndDate)}`
      : `Weekly AI Commodity & Logistics Report · week ending ${weekEndDate}`;
  const telegramSendAt = buildKyivTargetDate(weekEndDate, 14);
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
  payload: { manualNotes?: string; structuredDataPack?: string },
) {
  const report = await getWeeklyReportById(reportId);

  if (!report || !hasDatabaseUrl()) {
    return null;
  }

  const nextEdited = {
    ...(report.adminEditedContent ?? {}),
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

export async function buildWeeklySourceManifest(reportId: string) {
  const report = await getWeeklyReportById(reportId);

  if (!report) {
    return null;
  }

  const [history, sources, aiBriefRows] = await Promise.all([
    getPublicHistoryData(),
    listWeeklySources(report.id),
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
  ]);

  const weeklyRows = history.filter(
    (row) => row.date >= report.weekStartDate && row.date <= report.weekEndDate,
  );
  const grouped = groupByCommodity(weeklyRows);
  const permanentSources = sources.filter(
    (source) => source.scope === "permanent" && source.enabled,
  );
  const oneOffSources = sources.filter(
    (source) => source.scope === "one_off" && source.enabled,
  );
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
    ...(adminNotes
      ? []
      : ["Admin notes were not provided for this weekly report."]),
  ];
  const fallbackText = [
    "AI may interpret only the provided SPIKE data, source notes and admin inputs.",
    "No unsupported numbers, causes or external claims should appear in the report.",
  ];

  const manifest: WeeklyReportManifest = {
    adminNotes,
    aiBriefReferences: aiBriefRows.map((row) =>
      row.tradeDate.toISOString().slice(0, 10),
    ),
    dailyValues: buildDailyValuesByDate(weeklyRows),
    dataConfidence,
    fallbackText,
    generatedForWeek: report.weekEndDate,
    missingDataWarnings,
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

  const apiKey = process.env.OPENAI_API_KEY;
  const model =
    process.env.SPIKE_WEEKLY_REPORT_MODEL ||
    process.env.SPIKE_AI_BRIEF_MODEL ||
    "gpt-4.1-mini";
  let generated: NormalizedWeeklyReportPayload | null = null;
  let rawAiJson: unknown = null;
  let warnings = manifest.missingDataWarnings;
  let missingInputs = manifest.missingDataWarnings;

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
                "You generate a Weekly AI Commodity & Logistics Report for SPIKE SPOT INDEX. Use only provided SPIKE data, source notes, admin notes and verified source manifests. Do not invent numbers, dates, causes, flows, export volumes, logistics statistics or official SPIKE values. Return strict JSON with keys: dataConfidence, aiWarnings, missingInputs, parts. parts must be exactly 3 objects with keys logistics, grains, oilseeds_processing. Each part must contain title and sections. Sections must be concise, professional, source-grounded, and not trading advice.",
            },
            {
              role: "user",
              content: JSON.stringify({
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
  revalidateWeeklyReportViews();
  return getWeeklyReportById(reportId);
}

export async function scheduleWeeklyReportTelegram(
  reportId: string,
  actorUserId?: string | null,
) {
  const report = await getWeeklyReportById(reportId);

  if (!report || !hasDatabaseUrl()) {
    return null;
  }

  const telegramSendAt = buildKyivTargetDate(report.weekEndDate, 14);
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

  if (!report || !report.content) {
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
  const report = await ensureWeeklyReport(weekEndDate, "uk");

  if (!report) {
    return {
      skippedReason: "database_not_configured",
      status: "skipped" as const,
    };
  }

  await buildWeeklySourceManifest(report.id);

  if (report.status === "draft") {
    await generateWeeklyReportDraft(report.id, null);
    return { reportId: report.id, status: "generated" as const };
  }

  return { reportId: report.id, status: "existing" as const };
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
      ? "Щотижневий звіт поєднує SPIKE SPOT INDEX data, admin inputs та перевірені public sources. AI допомагає структурувати та інтерпретувати матеріал, але не розраховує офіційні значення SPIKE SPOT INDEX."
      : "The weekly report combines SPIKE SPOT INDEX data, admin inputs and verified public sources. AI assists with structuring and interpretation, but does not calculate official SPIKE SPOT INDEX values.";
  const disclaimer =
    "The Weekly AI Commodity & Logistics Report is generated from SPIKE SPOT INDEX data, admin-provided inputs and verified public sources. AI assists with interpretation and structuring. It does not calculate or adjust official SPIKE SPOT INDEX values and does not provide trading recommendations.";

  return {
    disclaimer,
    methodology,
    parts,
    sourceNotes,
    telegramMessages: buildWeeklyTelegramMessages(weekEndDate, parts),
  };
}

function normalizeGeneratedWeeklyReportJson(
  payload: GeneratedWeeklyReportPayload,
): NormalizedWeeklyReportPayload {
  const fallback = buildDeterministicWeeklyReport(
    {
      adminNotes: "",
      aiBriefReferences: [],
      dailyValues: {},
      dataConfidence: "limited",
      fallbackText: [],
      generatedForWeek: "",
      missingDataWarnings: [],
      oneOffSources: [],
      permanentSources: [],
      structuredDataPack: "",
      weeklySummary: [],
    },
    "uk",
  );

  const parts = (payload.parts ?? [])
    .map((part) => ({
      key: normalizePartKey(part.key),
      sections: (part.sections ?? [])
        .map((section) => ({
          body: String(section.body ?? "").trim(),
          title: String(section.title ?? "").trim(),
        }))
        .filter((section) => section.title && section.body),
      title: String(part.title ?? "").trim(),
    }))
    .filter(
      (part) => part.key && part.title && part.sections.length > 0,
    ) as WeeklyReportPart[];

  return {
    aiWarnings: parseStringList(payload.aiWarnings),
    dataConfidence: normalizeConfidence(payload.dataConfidence),
    missingInputs: parseStringList(payload.missingInputs),
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

  return {
    aiWarnings: manifest.missingDataWarnings,
    dataConfidence: manifest.dataConfidence,
    missingInputs: manifest.missingDataWarnings,
    parts: [
      {
        key: "logistics",
        title: "Part I. Logistics",
        sections: [
          {
            title: "AI Market Read",
            body:
              locale === "uk"
                ? "Логістичний блок цього тижня побудований на SPIKE weekly data та наявних source notes. За відсутності повного набору зовнішніх логістичних inputs звіт утримується від надмірних причинно-наслідкових висновків."
                : "This week’s logistics section is grounded in SPIKE weekly data and available source notes. Where external logistics inputs are incomplete, the report avoids over-claiming specific causes.",
          },
          {
            title: "Road transport",
            body:
              locale === "uk"
                ? "Окремий validated weekly road-transport datapack не був доданий, тому блок залишається описовим і чекає admin inputs."
                : "No dedicated validated road-transport datapack was attached, so this section remains descriptive pending admin inputs.",
          },
          {
            title: "Rail transport",
            body:
              locale === "uk"
                ? "Rail section базується лише на наявних notes і не включає непідтверджені числові claims."
                : "The rail section relies only on available notes and does not introduce unsupported numerical claims.",
          },
          {
            title: "Border direction",
            body:
              locale === "uk"
                ? `Прикордонна позиція кукурудзи FCA Чоп завершила тиждень на рівні ${formatValue(borderCorn?.latestValue)} USD/t з weekly move ${formatSigned(borderCorn?.weeklyChangeAbs ?? 0)} USD/t.`
                : `The FCA Chop border corn position closed the week at ${formatValue(borderCorn?.latestValue)} USD/t with a weekly move of ${formatSigned(borderCorn?.weeklyChangeAbs ?? 0)} USD/t.`,
          },
          {
            title: "Port direction",
            body:
              locale === "uk"
                ? `Портові export positions залишаються головною опорною точкою weekly reading: кукурудза ${formatValue(corn?.latestValue)} USD/t, пшениця 11.5% ${formatValue(wheat?.latestValue)} USD/t.`
                : `Port-side export positions remain the core weekly reference: corn ${formatValue(corn?.latestValue)} USD/t and 11.5% wheat ${formatValue(wheat?.latestValue)} USD/t.`,
          },
          {
            title: "Watch next week",
            body:
              locale === "uk"
                ? "Ключовий фокус на наступний тиждень: чи підтвердяться зміни у прикордонній кукурудзі та чи додадуться stronger logistics inputs для дорожнього і залізничного напрямків."
                : "Key next-week focus: whether movement in border corn is confirmed and whether stronger road and rail logistics inputs are added.",
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
                ? "Grains section читає SPIKE weekly changes без black-box forecasting. Основний акцент на тому, які moves були підтверджені публікаціями протягом тижня."
                : "The grains section reads SPIKE weekly changes without black-box forecasting. The focus stays on moves confirmed by weekly publications.",
          },
          {
            title: "SPIKE Spot Commodity Index Ukraine",
            body:
              locale === "uk"
                ? `Тижневий зріз показує: кукурудза ${formatSigned(corn?.weeklyChangeAbs ?? 0)} USD/t, пшениця 11.5% ${formatSigned(wheat?.weeklyChangeAbs ?? 0)} USD/t, фуражна пшениця ${formatSigned(feedWheat?.weeklyChangeAbs ?? 0)} USD/t.`
                : `The weekly slice shows: corn ${formatSigned(corn?.weeklyChangeAbs ?? 0)} USD/t, 11.5% wheat ${formatSigned(wheat?.weeklyChangeAbs ?? 0)} USD/t, feed wheat ${formatSigned(feedWheat?.weeklyChangeAbs ?? 0)} USD/t.`,
          },
          {
            title: "Corn",
            body:
              locale === "uk"
                ? `Основний export corn benchmark завершив тиждень на ${formatValue(corn?.latestValue)} USD/t, тоді як FCA Chop border corn закрився на ${formatValue(borderCorn?.latestValue)} USD/t.`
                : `The core export corn benchmark closed the week at ${formatValue(corn?.latestValue)} USD/t, while FCA Chop border corn closed at ${formatValue(borderCorn?.latestValue)} USD/t.`,
          },
          {
            title: "Wheat",
            body:
              locale === "uk"
                ? `Пшениця 11.5% на кінець тижня: ${formatValue(wheat?.latestValue)} USD/t. Фуражна пшениця: ${formatValue(feedWheat?.latestValue)} USD/t.`
                : `11.5% wheat ended the week at ${formatValue(wheat?.latestValue)} USD/t, while feed wheat ended at ${formatValue(feedWheat?.latestValue)} USD/t.`,
          },
          {
            title: "Export geography",
            body:
              locale === "uk"
                ? "Поточний weekly framework охоплює портові export positions CPT Odesa та border position FCA Chop, що дозволяє розрізняти портову і прикордонну динаміку."
                : "The current weekly framework covers CPT Odesa port export positions and the FCA Chop border position, allowing port and border dynamics to be read separately.",
          },
          {
            title: "External market context",
            body:
              locale === "uk"
                ? "Зовнішній контекст цього тижня залишається source-grounded: за відсутності повного futures/news datapack report не додає невалідаваних макровисновків."
                : "External context remains source-grounded this week: without a full futures/news datapack the report does not insert unsupported macro conclusions.",
          },
          {
            title: "Watch next week",
            body:
              locale === "uk"
                ? "Наступного тижня варто стежити, чи рух у зернових залишиться ізольованим по окремих позиціях, чи сформує ширший directional signal."
                : "Next week, watch whether grain moves remain isolated by position or develop into a broader directional signal.",
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
                ? "Oilseeds & processing block концентрується на verified SPIKE movement по сої та соняшнику і явно позначає відсутні ріпакові або product-side inputs."
                : "The oilseeds and processing block focuses on verified SPIKE movement in soybean and sunflower while explicitly flagging missing rapeseed or product-side inputs.",
          },
          {
            title: "SPIKE Spot Commodity Index Ukraine",
            body:
              locale === "uk"
                ? `Соя ГМО закрила тиждень на ${formatValue(soybean?.latestValue)} USD/t, соняшник на ${formatValue(sunflower?.latestValue)} USD/t.`
                : `GMO soybean closed the week at ${formatValue(soybean?.latestValue)} USD/t and sunflower at ${formatValue(sunflower?.latestValue)} USD/t.`,
          },
          {
            title: "Sunflower",
            body:
              locale === "uk"
                ? `Соняшник показав weekly move ${formatSigned(sunflower?.weeklyChangeAbs ?? 0)} USD/t, що робить його однією з ключових processing positions тижня.`
                : `Sunflower showed a weekly move of ${formatSigned(sunflower?.weeklyChangeAbs ?? 0)} USD/t, making it one of the key processing positions this week.`,
          },
          {
            title: "Rapeseed",
            body:
              locale === "uk"
                ? "Окремий validated rapeseed input у поточному weekly pack відсутній, тому report не будує synthetic price reading для цієї позиції."
                : "A dedicated validated rapeseed input is absent from the current weekly pack, so the report does not construct a synthetic price reading for this position.",
          },
          {
            title: "Soybean",
            body:
              locale === "uk"
                ? `Соя ГМО показала weekly move ${formatSigned(soybean?.weeklyChangeAbs ?? 0)} USD/t і залишається однією з найбільш чутливих positions у processing basket.`
                : `GMO soybean posted a weekly move of ${formatSigned(soybean?.weeklyChangeAbs ?? 0)} USD/t and remains one of the more sensitive positions in the processing basket.`,
          },
          {
            title: "Oils / meals / processing products",
            body:
              locale === "uk"
                ? "Product-side inputs можуть бути додані через admin datapack або one-off sources; без них report не стверджує додаткових числових relationships."
                : "Product-side inputs can be added through the admin datapack or one-off sources; without them, the report avoids asserting extra numerical relationships.",
          },
          {
            title: "Export geography",
            body:
              locale === "uk"
                ? "Поточний блок прив'язаний до processing-side Ukrainian spot reading і не розширюється на непідтверджені external destination claims."
                : "This block remains tied to the Ukrainian processing-side spot reading and does not expand into unsupported external destination claims.",
          },
          {
            title: "External market context",
            body:
              locale === "uk"
                ? "External context може бути посилений через permanent futures/news/policy sources; без них weekly reading залишається обережно інтерпретаційним."
                : "External context can be strengthened through permanent futures/news/policy sources; without them, the weekly reading remains cautiously interpretive.",
          },
          {
            title: "Watch next week",
            body:
              locale === "uk"
                ? "Наступного тижня важливо стежити, чи отримає processing basket підтвердження по сої та соняшнику і чи з'являться додаткові inputs по ріпаку та products."
                : "Next week, watch whether soybean and sunflower moves are confirmed and whether additional rapeseed and product inputs appear.",
          },
        ],
      },
    ] satisfies WeeklyReportPart[],
  };
}

function buildWeeklyTelegramMessages(
  weekEndDate: string,
  parts: WeeklyReportPart[],
): [string, string, string] {
  const header = [
    "<b>🇺🇦 SPIKE SPOT INDEX | Weekly AI Commodity & Logistics Market</b>",
    `<b>📅 Week ending: ${formatTelegramWeekEnd(weekEndDate)}</b>`,
    "",
  ].join("\n");
  const disclaimer =
    "<i>AI-assisted report based on SPIKE data, partner inputs and verified public sources. Not a trading recommendation.</i>";

  return parts.map((part, index) => {
    const body = [
      header,
      `<b>${escapeHtml(part.title)}</b>`,
      "",
      ...part.sections.flatMap((section) => [
        `<b>${escapeHtml(section.title)}</b>`,
        escapeHtml(section.body),
        "",
      ]),
      index < 2
        ? "Spike Brokers – Ваш торговий партнер 🌎\nПродовження нижче ⬇️"
        : "Spike Brokers – Ваш торговий партнер 🌎",
      "",
      disclaimer,
    ].join("\n");

    return body;
  }) as [string, string, string];
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
  return value == null ? "n/a" : value.toFixed(1);
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
