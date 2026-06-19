import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import type { Locale } from "@/lib/i18n";
import {
  generateMediaHubLlmReports,
  type MediaHubLocalizedReport,
} from "@/lib/media-hub-llm-report";
import { get1d3xRssWindows } from "@/lib/media-hub-rss";
import {
  getMonthlyMediaHubDigest,
  getSpikeMediaHubLiveWindows,
} from "@/lib/media-hub-monitoring";
import type { MediaHubWindowKey, MediaHubWindowSnapshot } from "@/lib/media-hub";
import { isPlatformSite } from "@/lib/platform-site";
import {
  getPublicLatestData,
  type PublicLatestItem,
} from "@/lib/public-api-data";
import type { TelegramSourceDigest } from "@/lib/telegram-source-collector";

export type MediaHubPublicationKind = "daily" | "weekly" | "monthly" | "none";

export type MediaHubPublicationPlan = {
  date: string;
  kind: MediaHubPublicationKind;
  reason: string;
};

type MediaHubReportRow = {
  id: string;
  tenantId: string;
  kind: string;
  periodStart: Date;
  periodEnd: Date;
  title: string;
  status: string;
  contentJson: unknown;
  sourceDigest: unknown;
  telegramSentAt: Date | null;
  telegramMessageIds: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type MediaHubReportContentJson = {
  generatedAt: string;
  kind: Exclude<MediaHubPublicationKind, "none">;
  llm?: {
    model?: string;
    provider?: string;
    skippedReason?: string;
  };
  localized?: Partial<Record<Locale, MediaHubLocalizedReport>>;
  periodEndDate: string;
  periodStartDate: string;
  summary: string[];
  title: string;
  totals: {
    items: number;
    sources: number;
    windows: number;
  };
  windows: Array<{
    feed: MediaHubWindowSnapshot["feed"];
    itemCount: number;
    label: string;
    progressLabel: string;
    sourceCount: number;
    summaryBody: string[];
    summaryTitle: string;
    topSources: MediaHubWindowSnapshot["topSources"];
    topTopics: MediaHubWindowSnapshot["topTopics"];
    window: MediaHubWindowKey;
  }>;
};

export function getMediaHubPublicationPlan(date = formatKyivDate()): MediaHubPublicationPlan {
  const weekday = getIsoWeekday(date);

  if (weekday >= 1 && weekday <= 5) {
    return {
      date,
      kind: "daily",
      reason: "weekday_daily_slot",
    };
  }

  if (weekday !== 6) {
    return {
      date,
      kind: "none",
      reason: "no_publication_on_sunday",
    };
  }

  if (getSaturdayOrdinalInMonth(date) === 4) {
    return {
      date,
      kind: "monthly",
      reason: "fourth_saturday_monthly_replaces_weekly",
    };
  }

  return {
    date,
    kind: "weekly",
    reason: "saturday_weekly_slot",
  };
}

export async function runDueMediaHubPublication(options: {
  date?: string;
  forceKind?: MediaHubPublicationKind;
  forceTelegram?: boolean;
} = {}) {
  const plan = getMediaHubPublicationPlan(options.date);
  const kind = options.forceKind && options.forceKind !== "none"
    ? options.forceKind
    : plan.kind;

  if (kind === "daily") {
    const report = await publishMediaHubSnapshotReport("daily", plan.date);
    const telegram = isPlatformSite()
      ? { skippedReason: "platform_daily_telegram_not_configured", status: "skipped" as const }
      : await sendMediaHubReportTelegram("daily", plan.date, {
          audience: "spike",
          force: options.forceTelegram,
          locale: "uk",
        });

    return {
      plan: { ...plan, kind },
      result: {
        report,
        telegram,
        status: "daily_media_hub_report_persisted",
      },
    };
  }

  if (kind === "weekly") {
    const report = await publishMediaHubSnapshotReport("weekly", plan.date);
    const telegram = await sendMediaHubReportTelegram("weekly", plan.date, {
      audience: isPlatformSite() ? "platform" : "spike",
      force: options.forceTelegram,
      locale: isPlatformSite() ? "en" : "uk",
    });

    return {
      plan: { ...plan, kind },
      result: {
        report,
        status: "weekly_media_hub_processed",
        telegram,
      },
    };
  }

  if (kind === "monthly") {
    const report = await publishMediaHubSnapshotReport("monthly", plan.date);
    const telegram = await sendMediaHubReportTelegram("monthly", plan.date, {
      audience: isPlatformSite() ? "platform" : "spike",
      force: options.forceTelegram,
      locale: isPlatformSite() ? "en" : "uk",
    });

    return {
      plan: { ...plan, kind },
      result: {
        report,
        status: "monthly_media_hub_processed",
        telegram,
      },
    };
  }

  return {
    plan,
    result: {
      skippedReason: plan.reason,
      status: "skipped",
    },
  };
}

export async function publishMediaHubSnapshotReport(
  kind: Exclude<MediaHubPublicationKind, "none">,
  periodEndDate: string,
) {
  if (!hasDatabaseUrl()) {
    return { skippedReason: "database_not_configured", status: "skipped" as const };
  }

  await ensureMediaHubReportStorage();

  const periodStartDate = shiftIsoDate(
    periodEndDate,
    kind === "daily" ? 0 : kind === "weekly" ? -6 : -29,
  );
  const windowKey: MediaHubWindowKey =
    kind === "daily" ? "day" : kind === "weekly" ? "week" : "month";
  const snapshots = await getPublicationSnapshots(windowKey);
  const primarySnapshot = snapshots[0];
  const tenantId = isPlatformSite() ? "1d3x" : getActiveIndexConfig().id;
  const latestData = tenantId === "spike-ua" ? await getPublicLatestData() : [];
  const llm = await generateMediaHubLlmReports({
    kind,
    latestData,
    periodEndDate,
    periodStartDate,
    snapshots,
    tenant: tenantId === "1d3x" ? "platform" : "spike",
  });
  const content = buildSnapshotReportContent({
    kind,
    llm,
    periodEndDate,
    periodStartDate,
    snapshots,
  });
  const contentHash = createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
  const existing = await getMediaHubReport(kind, periodEndDate, tenantId);
  const id = existing?.id ?? randomUUID();

  await db.$executeRawUnsafe(
    `
      INSERT INTO "MediaHubReport" (
        "id", "tenantId", "kind", "periodStart", "periodEnd", "title",
        "status", "contentHash", "contentJson", "sourceDigest",
        "telegramSentAt", "telegramMessageIds", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4::date, $5::date, $6,
        'published', $7, $8::jsonb, $9::jsonb,
        NULL, '[]'::jsonb, NOW(), NOW()
      )
      ON CONFLICT ("tenantId", "kind", "periodEnd")
      DO UPDATE SET
        "title" = EXCLUDED."title",
        "status" = EXCLUDED."status",
        "contentHash" = EXCLUDED."contentHash",
        "contentJson" = EXCLUDED."contentJson",
        "sourceDigest" = EXCLUDED."sourceDigest",
        "updatedAt" = NOW()
    `,
    id,
    tenantId,
    kind,
    periodStartDate,
    periodEndDate,
    content.title,
    contentHash,
    JSON.stringify(content),
    JSON.stringify(snapshots),
  );

  revalidatePath("/media-hub");
  revalidatePath("/uk/media-hub");
  revalidatePath("/en/media-hub");

  return {
    itemCount: primarySnapshot?.itemCount ?? 0,
    kind,
    periodEndDate,
    periodStartDate,
    sourceCount: primarySnapshot?.sourceCount ?? 0,
    status: "published" as const,
  };
}

export async function sendMediaHubReportTelegram(
  kind: Exclude<MediaHubPublicationKind, "none">,
  periodEndDate: string,
  options: {
    audience: "spike" | "platform";
    force?: boolean;
    locale: Locale;
  },
) {
  if (!hasDatabaseUrl()) {
    return { skippedReason: "database_not_configured", status: "skipped" as const };
  }

  const tenantId = options.audience === "platform" ? "1d3x" : getActiveIndexConfig().id;
  const report = await getMediaHubReport(kind, periodEndDate, tenantId);

  if (!report) {
    return { skippedReason: "report_not_found", status: "skipped" as const };
  }

  if (report.telegramSentAt && !options.force) {
    return { skippedReason: "already_sent", status: "skipped" as const };
  }

  const botToken =
    process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
    process.env.INDEX_TELEGRAM_BOT_TOKEN;
  const chatId =
    options.audience === "platform"
      ? process.env.ID3X_MEDIA_HUB_TELEGRAM_CHAT_ID ??
        process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
        process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
        process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID
      : kind === "daily"
        ? process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
          process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
          process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID
        : process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
          process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
          process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID;

  if (!botToken || !chatId) {
    return { skippedReason: "telegram_not_configured", status: "skipped" as const };
  }

  const content = parseMediaHubReportContent(report.contentJson);
  if (!content) {
    return { skippedReason: "report_content_invalid", status: "skipped" as const };
  }

  const latestData =
    options.audience === "spike" && kind === "daily"
      ? await getPublicLatestData()
      : [];
  const messages = splitTelegramMessage(
    buildMediaHubTelegramText({
      content,
      kind,
      latestData,
      locale: options.locale,
      periodEndDate,
      tenant: options.audience,
    }),
  );
  const messageIds: number[] = [];

  for (const text of messages) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      body: JSON.stringify({
        chat_id: chatId,
        disable_web_page_preview: true,
        parse_mode: "HTML",
        text,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      return {
        error: await response.text(),
        status: "failed" as const,
      };
    }

    const payload = (await response.json()) as { result?: { message_id?: number } };
    const messageId = payload.result?.message_id;
    if (messageId) {
      messageIds.push(messageId);
    }
  }

  await db.$executeRawUnsafe(
    `
      UPDATE "MediaHubReport"
      SET "telegramSentAt" = NOW(),
          "telegramMessageIds" = $4::jsonb,
          "updatedAt" = NOW()
      WHERE "tenantId" = $1
        AND "kind" = $2
        AND "periodEnd" = $3::date
    `,
    tenantId,
    kind,
    periodEndDate,
    JSON.stringify(messageIds),
  );

  return { messageIds, status: "sent" as const };
}

async function getPublicationSnapshots(windowKey: MediaHubWindowKey) {
  if (isPlatformSite()) {
    const windows = await get1d3xRssWindows();
    return windows.filter((window) => window.window === windowKey);
  }

  const windows = await getSpikeMediaHubLiveWindows("uk");
  return windows.filter((window) => window.window === windowKey);
}

function buildSnapshotReportContent(input: {
  kind: Exclude<MediaHubPublicationKind, "none">;
  llm?: Awaited<ReturnType<typeof generateMediaHubLlmReports>>;
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
}) {
  const primary = input.snapshots[0];
  const totalItems = input.snapshots.reduce((sum, snapshot) => sum + snapshot.itemCount, 0);
  const totalSources = input.snapshots.reduce((sum, snapshot) => sum + snapshot.sourceCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    kind: input.kind,
    llm: input.llm
      ? {
          model: input.llm.model,
          provider: input.llm.provider,
          skippedReason: input.llm.skippedReason,
        }
      : undefined,
    localized: input.llm?.localized,
    periodEndDate: input.periodEndDate,
    periodStartDate: input.periodStartDate,
    summary: primary?.summaryBody ?? [],
    title:
      primary?.summaryTitle ??
      `Media Hub ${input.kind} report · ${input.periodStartDate}—${input.periodEndDate}`,
    totals: {
      items: totalItems,
      sources: totalSources,
      windows: input.snapshots.length,
    },
    windows: input.snapshots.map((snapshot) => ({
      feed: snapshot.feed,
      itemCount: snapshot.itemCount,
      label: snapshot.label,
      progressLabel: snapshot.progressLabel,
      sourceCount: snapshot.sourceCount,
      summaryBody: snapshot.summaryBody,
      summaryTitle: snapshot.summaryTitle,
      topSources: snapshot.topSources,
      topTopics: snapshot.topTopics,
      window: snapshot.window,
    })),
  };
}

function buildMediaHubTelegramText(input: {
  content: MediaHubReportContentJson;
  kind: Exclude<MediaHubPublicationKind, "none">;
  latestData: PublicLatestItem[];
  locale: Locale;
  periodEndDate: string;
  tenant: "spike" | "platform";
}) {
  const isUk = input.locale === "uk";
  const windows = input.content.windows.filter(
    (window) => window.itemCount > 0 || window.feed.length > 0 || window.topTopics.length > 0,
  );
  const primaryWindow = windows[0] ?? input.content.windows[0];
  const localized = input.content.localized?.[input.locale];
  const title =
    input.tenant === "platform"
      ? `🌍 <b>1D3X Media Hub · ${reportKindLabel(input.kind, input.locale)}</b>`
      : `🇺🇦 <b>SPIKE SPOT INDEX · ${reportKindLabel(input.kind, input.locale)}</b>`;
  const lines = [
    title,
    `<b>📅 ${escapeHtml(formatReportDate(input.periodEndDate, input.locale))}</b>`,
  ];

  if (input.tenant === "spike" && input.kind === "daily") {
    const indexSection = buildSpikeDailyIndexSection(input.latestData, input.locale);
    if (indexSection.length > 0) {
      lines.push("", ...indexSection);
    }
  }

  if (primaryWindow) {
    const summary = dedupeNonEmpty(
      localized?.summary?.length
        ? localized.summary
        : [
            ...primaryWindow.summaryBody,
            ...input.content.summary,
          ],
    ).filter((line) => !isGenericWeakLine(line));
    if (localized?.title) {
      lines.push("", `<b>${escapeHtml(localized.title)}</b>`);
    }

    if (summary.length > 0) {
      lines.push(
        "",
        isUk ? "<b>🔎 Головні сигнали</b>" : "<b>🔎 Main signals</b>",
        ...summary.slice(0, 8).map((line) => `• ${escapeHtml(line)}`),
      );
    }
  }

  lines.push(
    "",
    isUk
      ? "<i>AI-assisted Media Hub digest на базі опублікованих індексів, підключених джерел і редакторських фільтрів. Не є торговою рекомендацією.</i>"
      : "<i>AI-assisted Media Hub digest based on index data, monitored sources and editorial filters. Not a trading recommendation.</i>",
  );

  return lines.join("\n");
}

function buildSpikeDailyIndexSection(
  latestData: PublicLatestItem[],
  locale: Locale,
) {
  const isUk = locale === "uk";
  const rows = latestData
    .filter((item) => item.valueUsdPerMt !== null)
    .sort((first, second) => first.commodityCode.localeCompare(second.commodityCode));

  if (rows.length === 0) {
    return [];
  }

  return [
    isUk ? "<b>🌾 Сьогоднішні індекси</b>" : "<b>🌾 Today's index values</b>",
    ...rows.map((item) => {
      const name = isUk ? item.commodityNameUk : item.commodityNameEn;
      const change = formatChange(item.changeAbs);
      const basis = item.basis ? ` · ${item.basis}` : "";
      return `• ${escapeHtml(name)}${escapeHtml(basis)} — <b>${item.valueUsdPerMt} USD/t</b> (${change})`;
    }),
  ];
}

function splitTelegramMessage(text: string) {
  if (text.length <= 3900) {
    return [text];
  }

  const chunks: string[] = [];
  let current = "";

  for (const block of text.split("\n\n")) {
    const next = current ? `${current}\n\n${block}` : block;
    if (next.length > 3900) {
      if (current) {
        chunks.push(current);
      }
      current = block;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function parseMediaHubReportContent(value: unknown): MediaHubReportContentJson | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<MediaHubReportContentJson>;
  if (!candidate.title || !Array.isArray(candidate.windows)) {
    return null;
  }
  const localized = parseLocalizedReports(candidate.localized);

  return {
    generatedAt: String(candidate.generatedAt ?? new Date().toISOString()),
    kind: normalizeMediaHubKind(candidate.kind),
    llm: typeof candidate.llm === "object" && candidate.llm
      ? {
          model: String((candidate.llm as { model?: unknown }).model ?? ""),
          provider: String((candidate.llm as { provider?: unknown }).provider ?? ""),
          skippedReason: String((candidate.llm as { skippedReason?: unknown }).skippedReason ?? ""),
        }
      : undefined,
    localized,
    periodEndDate: String(candidate.periodEndDate ?? ""),
    periodStartDate: String(candidate.periodStartDate ?? ""),
    summary: toStringArray(candidate.summary),
    title: String(candidate.title),
    totals: {
      items: Number(candidate.totals?.items ?? 0),
      sources: Number(candidate.totals?.sources ?? 0),
      windows: Number(candidate.totals?.windows ?? candidate.windows.length),
    },
    windows: candidate.windows.map((window) => ({
      feed: Array.isArray(window.feed) ? window.feed : [],
      itemCount: Number(window.itemCount ?? 0),
      label: String(window.label ?? ""),
      progressLabel: String(window.progressLabel ?? ""),
      sourceCount: Number(window.sourceCount ?? 0),
      summaryBody: toStringArray(window.summaryBody),
      summaryTitle: String(window.summaryTitle ?? ""),
      topSources: Array.isArray(window.topSources) ? window.topSources : [],
      topTopics: Array.isArray(window.topTopics) ? window.topTopics : [],
      window: normalizeWindowKey(window.window),
    })),
  };
}

export async function getLatestPublishedMediaHubReportSummary(input: {
  kind: Exclude<MediaHubPublicationKind, "none">;
  locale: Locale;
  tenantId?: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureMediaHubReportStorage();

  const tenantId = input.tenantId ?? (isPlatformSite() ? "1d3x" : getActiveIndexConfig().id);
  const rows = await db.$queryRawUnsafe<MediaHubReportRow[]>(
    `
      SELECT *
      FROM "MediaHubReport"
      WHERE "tenantId" = $1
        AND "kind" = $2
        AND "status" = 'published'
      ORDER BY "periodEnd" DESC
      LIMIT 1
    `,
    tenantId,
    input.kind,
  );
  const content = parseMediaHubReportContent(rows[0]?.contentJson);
  if (!content) {
    return null;
  }

  const localized = content.localized?.[input.locale];
  if (localized?.summary?.length) {
    return {
      periodEndDate: content.periodEndDate,
      summaryBody: localized.summary,
      summaryTitle: localized.title || content.title,
    };
  }

  return {
    periodEndDate: content.periodEndDate,
    summaryBody: content.summary,
    summaryTitle: content.title,
  };
}

function normalizeMediaHubKind(value: unknown): Exclude<MediaHubPublicationKind, "none"> {
  return value === "weekly" || value === "monthly" ? value : "daily";
}

function normalizeWindowKey(value: unknown): MediaHubWindowKey {
  return value === "week" || value === "month" ? value : "day";
}

function dedupeNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseLocalizedReports(value: unknown): Partial<Record<Locale, MediaHubLocalizedReport>> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const localized: Partial<Record<Locale, MediaHubLocalizedReport>> = {};
  for (const locale of ["uk", "en"] as const) {
    const candidate = (value as Partial<Record<Locale, unknown>>)[locale];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const report = candidate as Partial<MediaHubLocalizedReport>;
    const title = typeof report.title === "string" ? report.title : "";
    const summary = toStringArray(report.summary).map((item) => item.trim()).filter(Boolean);
    if (title && summary.length > 0) {
      localized[locale] = { summary, title };
    }
  }

  return Object.keys(localized).length > 0 ? localized : undefined;
}

function isGenericWeakLine(value: string) {
  const lower = value.toLowerCase();
  return (
    lower.includes("no active source concentration") ||
    lower.includes("insufficient included posts") ||
    lower.includes("недостатнь") ||
    lower.includes("no data")
  );
}

function reportKindLabel(kind: Exclude<MediaHubPublicationKind, "none">, locale: Locale) {
  if (locale === "uk") {
    if (kind === "daily") return "щоденний звіт";
    if (kind === "weekly") return "тижневий звіт";
    return "місячний звіт";
  }

  if (kind === "daily") return "daily report";
  if (kind === "weekly") return "weekly report";
  return "monthly report";
}

function formatReportDate(date: string, locale: Locale) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatChange(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}

export async function publishMonthlyMediaHubReport(periodEndDate: string) {
  if (!hasDatabaseUrl()) {
    return { skippedReason: "database_not_configured", status: "skipped" as const };
  }

  await ensureMediaHubReportStorage();

  const periodStartDate = shiftIsoDate(periodEndDate, -29);
  const digest = await getMonthlyMediaHubDigest();
  const content = buildMonthlyReportContent(periodStartDate, periodEndDate, digest);
  const contentHash = createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
  const tenantId = getActiveIndexConfig().id;
  const existing = await getMediaHubReport("monthly", periodEndDate);
  const id = existing?.id ?? randomUUID();
  const messageIds =
    existing?.telegramSentAt && existing.telegramMessageIds
      ? parseJsonNumberArray(existing.telegramMessageIds)
      : await sendMonthlyMediaHubTelegram(content);

  await db.$executeRawUnsafe(
    `
      INSERT INTO "MediaHubReport" (
        "id", "tenantId", "kind", "periodStart", "periodEnd", "title",
        "status", "contentHash", "contentJson", "sourceDigest",
        "telegramSentAt", "telegramMessageIds", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, 'monthly', $3::date, $4::date, $5,
        'published', $6, $7::jsonb, $8::jsonb,
        CASE WHEN $9::jsonb <> '[]'::jsonb THEN NOW() ELSE NULL END,
        $9::jsonb, NOW(), NOW()
      )
      ON CONFLICT ("tenantId", "kind", "periodEnd")
      DO UPDATE SET
        "title" = EXCLUDED."title",
        "status" = EXCLUDED."status",
        "contentHash" = EXCLUDED."contentHash",
        "contentJson" = EXCLUDED."contentJson",
        "sourceDigest" = EXCLUDED."sourceDigest",
        "telegramSentAt" = COALESCE("MediaHubReport"."telegramSentAt", EXCLUDED."telegramSentAt"),
        "telegramMessageIds" = CASE
          WHEN "MediaHubReport"."telegramMessageIds" IS NULL OR "MediaHubReport"."telegramMessageIds" = '[]'::jsonb
          THEN EXCLUDED."telegramMessageIds"
          ELSE "MediaHubReport"."telegramMessageIds"
        END,
        "updatedAt" = NOW()
    `,
    id,
    tenantId,
    periodStartDate,
    periodEndDate,
    content.title,
    contentHash,
    JSON.stringify(content),
    JSON.stringify(digest),
    JSON.stringify(messageIds),
  );

  revalidatePath("/uk/media-hub");
  revalidatePath("/en/media-hub");

  return {
    messageIds,
    periodEndDate,
    periodStartDate,
    postCount: digest.postCount,
    sourceCount: digest.channels.length,
    status: "monthly_published" as const,
  };
}

async function ensureMediaHubReportStorage() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MediaHubReport" (
      "id" TEXT NOT NULL,
      "tenantId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "periodStart" DATE NOT NULL,
      "periodEnd" DATE NOT NULL,
      "title" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "contentHash" TEXT NOT NULL,
      "contentJson" JSONB NOT NULL,
      "sourceDigest" JSONB NOT NULL,
      "telegramSentAt" TIMESTAMP(3),
      "telegramMessageIds" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MediaHubReport_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "MediaHubReport_tenant_kind_periodEnd_key"
    ON "MediaHubReport"("tenantId", "kind", "periodEnd")
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubReport_tenant_kind_status_idx"
    ON "MediaHubReport"("tenantId", "kind", "status", "periodEnd" DESC)
  `);
}

async function getMediaHubReport(
  kind: string,
  periodEndDate: string,
  tenantId: string = getActiveIndexConfig().id,
) {
  const rows = await db.$queryRawUnsafe<MediaHubReportRow[]>(
    `
      SELECT *
      FROM "MediaHubReport"
      WHERE "tenantId" = $1
        AND "kind" = $2
        AND "periodEnd" = $3::date
      LIMIT 1
    `,
    tenantId,
    kind,
    periodEndDate,
  );

  return rows[0] ?? null;
}

function buildMonthlyReportContent(
  periodStartDate: string,
  periodEndDate: string,
  digest: TelegramSourceDigest,
) {
  const activeChannels = digest.channels.filter((channel) => channel.includedPostCount > 0);
  const topChannels = [...activeChannels]
    .sort((first, second) => second.includedPostCount - first.includedPostCount)
    .slice(0, 8);
  const topPosts = digest.channels
    .flatMap((channel) =>
      channel.posts
        .filter((post) => post.included)
        .map((post) => ({ ...post, channelHandle: channel.channelHandle })),
    )
    .sort((first, second) => second.text.length - first.text.length)
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    periodEndDate,
    periodStartDate,
    summary: [
      `Monthly Media Hub digest covers ${digest.postCount} included monitoring items from ${activeChannels.length} active sources.`,
      topChannels.length > 0
        ? `Most active sources: ${topChannels.map((channel) => `${channel.channelHandle} (${channel.includedPostCount})`).join(", ")}.`
        : "No active source concentration was detected in the monthly window.",
      topPosts.length > 0
        ? "Editorial focus should prioritize recurring logistics, export demand, crop/weather, policy and processing signals over one-off noise."
        : "Monthly report has insufficient included posts for a high-confidence editorial synthesis.",
    ],
    title: `1D3X Media Hub Monthly Report · ${periodStartDate}—${periodEndDate}`,
    topChannels: topChannels.map((channel) => ({
      handle: channel.channelHandle,
      includedPostCount: channel.includedPostCount,
      postCount: channel.postCount,
      title: channel.channelTitle,
    })),
    topPosts: topPosts.map((post) => ({
      channelHandle: post.channelHandle,
      publishedAt: post.publishedAt,
      text: post.text.slice(0, 420),
      url: post.postUrl,
    })),
  };
}

async function sendMonthlyMediaHubTelegram(content: ReturnType<typeof buildMonthlyReportContent>) {
  const botToken =
    process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
    process.env.INDEX_TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
    process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
    process.env.UGA_TELEGRAM_ADMIN_CHAT_ID ??
    process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID;

  if (!botToken || !chatId) {
    return [];
  }

  const text = [
    `<b>${escapeHtml(content.title)}</b>`,
    "",
    ...content.summary.map((line) => `• ${escapeHtml(line)}`),
    "",
    "<b>Top source concentration</b>",
    ...(content.topChannels.length > 0
      ? content.topChannels.slice(0, 6).map((channel) =>
          `• ${escapeHtml(channel.handle)} — ${channel.includedPostCount}`,
        )
      : ["• n/a"]),
  ].join("\n");
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: true,
      parse_mode: "HTML",
      text,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { result?: { message_id?: number } };
  return [payload.result?.message_id ?? 0].filter(Boolean);
}

function formatKyivDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getIsoWeekday(date: string) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function getSaturdayOrdinalInMonth(date: string) {
  const current = new Date(`${date}T00:00:00.000Z`);
  let ordinal = 0;

  for (let day = 1; day <= current.getUTCDate(); day += 1) {
    const candidate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), day));
    if (candidate.getUTCDay() === 6) {
      ordinal += 1;
    }
  }

  return ordinal;
}

function shiftIsoDate(date: string, days: number) {
  const utcDate = new Date(`${date}T00:00:00.000Z`);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function parseJsonNumberArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number")
    : [];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
