import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getMonthlyMediaHubDigest } from "@/lib/media-hub-monitoring";
import type { TelegramSourceDigest } from "@/lib/telegram-source-collector";
import {
  autoPrepareWeeklyReportDraft,
  autoPublishDueWeeklyReports,
  sendDueWeeklyReports,
} from "@/lib/weekly-ai-report-lazy";

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
} = {}) {
  const plan = getMediaHubPublicationPlan(options.date);
  const kind = options.forceKind && options.forceKind !== "none"
    ? options.forceKind
    : plan.kind;

  if (kind === "daily") {
    return {
      plan: { ...plan, kind },
      result: {
        skippedReason: "daily_publication_is_owned_by_spike_auto_publish",
        status: "skipped",
      },
    };
  }

  if (kind === "weekly") {
    const prepare = await autoPrepareWeeklyReportDraft(plan.date);
    const publish = await autoPublishDueWeeklyReports(plan.date);
    const telegram = await sendDueWeeklyReports();

    return {
      plan: { ...plan, kind },
      result: {
        prepare,
        publish,
        status: "weekly_processed",
        telegram,
      },
    };
  }

  if (kind === "monthly") {
    const monthly = await publishMonthlyMediaHubReport(plan.date);

    return {
      plan: { ...plan, kind },
      result: monthly,
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

async function getMediaHubReport(kind: string, periodEndDate: string) {
  const rows = await db.$queryRawUnsafe<MediaHubReportRow[]>(
    `
      SELECT *
      FROM "MediaHubReport"
      WHERE "tenantId" = $1
        AND "kind" = $2
        AND "periodEnd" = $3::date
      LIMIT 1
    `,
    getActiveIndexConfig().id,
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
