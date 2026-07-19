import "server-only";

import { db, hasDatabaseUrl } from "@/lib/db";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getManualMaterialsForPeriod } from "@/lib/media-hub-manual-materials";
import { getMediaHubManualMaterialPeriod } from "@/lib/media-hub-manual-materials";

const TELEGRAM_TIMEOUT_MS = 15_000;
export const SSI_WEEKLY_LOGISTICS_TYPES = [
  "agro_ex_im",
  "checkpoints",
  "operational_wagons",
  "uz_statistics",
] as const;
type SsiWeeklyLogisticsType = typeof SSI_WEEKLY_LOGISTICS_TYPES[number];

type ControlAction = "missing_notice" | "request";

export type SsiWeeklyLogisticsGate = {
  availableTypes: SsiWeeklyLogisticsType[];
  missingTypes: SsiWeeklyLogisticsType[];
  periodEndDate: string;
  status: "blocked" | "ready";
  reason?: "database_not_configured" | "provider_not_configured" | "required_materials_missing";
};

export function findMissingSsiWeeklyLogisticsTypes(hashtags: string[][]) {
  const present = new Set(hashtags.flat().map((tag) => tag.trim().toLowerCase()));
  return SSI_WEEKLY_LOGISTICS_TYPES.filter((type) => !present.has(type));
}

export async function getSsiWeeklyLogisticsGate(periodEndDate: string): Promise<SsiWeeklyLogisticsGate> {
  if (!hasDatabaseUrl()) {
    return {
      availableTypes: [],
      missingTypes: [...SSI_WEEKLY_LOGISTICS_TYPES],
      periodEndDate,
      reason: "database_not_configured",
      status: "blocked",
    };
  }

  const providerChatId = await resolveProviderChatId();
  if (!providerChatId) {
    return {
      availableTypes: [],
      missingTypes: [...SSI_WEEKLY_LOGISTICS_TYPES],
      periodEndDate,
      reason: "provider_not_configured",
      status: "blocked",
    };
  }

  const periodStartDate = shiftIsoDate(periodEndDate, -6);
  const materials = await getManualMaterialsForPeriod({
    kind: "weekly",
    periodEndDate,
    periodStartDate,
    tenantId: "spike-ua",
  });
  const providerMaterials = materials.filter((material) => material.telegramFromId === providerChatId);
  const missingTypes = findMissingSsiWeeklyLogisticsTypes(providerMaterials.map((material) => material.hashtags));
  const availableTypes = SSI_WEEKLY_LOGISTICS_TYPES.filter((type) => !missingTypes.includes(type));

  return {
    availableTypes,
    missingTypes,
    periodEndDate,
    reason: missingTypes.length > 0 ? "required_materials_missing" : undefined,
    status: missingTypes.length === 0 ? "ready" : "blocked",
  };
}

export async function requestSsiWeeklyLogisticsMaterials(periodEndDate?: string) {
  const resolvedPeriodEndDate = periodEndDate ?? getMediaHubManualMaterialPeriod(new Date(), "weekly_material").reportingWeekEnd;
  const providerChatId = await resolveProviderChatId();
  if (!providerChatId) {
    return { periodEndDate: resolvedPeriodEndDate, skippedReason: "provider_not_configured", status: "skipped" as const };
  }
  const botToken = getMaterialBotToken();
  if (!botToken) {
    return { periodEndDate: resolvedPeriodEndDate, skippedReason: "telegram_not_configured", status: "skipped" as const };
  }
  if (!hasDatabaseUrl()) {
    return { periodEndDate: resolvedPeriodEndDate, skippedReason: "database_not_configured", status: "skipped" as const };
  }
  if (!(await claimControlAction(resolvedPeriodEndDate, "request"))) {
    return { periodEndDate: resolvedPeriodEndDate, skippedReason: "already_requested", status: "skipped" as const };
  }

  const sent = await sendTelegramMessage(botToken, providerChatId, buildSsiWeeklyLogisticsRequestText(resolvedPeriodEndDate));
  await completeControlAction(resolvedPeriodEndDate, "request", sent.messageId, sent.status);
  return { periodEndDate: resolvedPeriodEndDate, ...sent };
}

export async function sendSsiWeeklyLogisticsMissingNotice(gate: SsiWeeklyLogisticsGate) {
  const botToken = getReportBotToken();
  const chatId = getReportChatId();
  if (!botToken || !chatId) {
    return { skippedReason: "telegram_not_configured", status: "skipped" as const };
  }
  if (!hasDatabaseUrl()) {
    return { skippedReason: "database_not_configured", status: "skipped" as const };
  }
  if (!(await claimControlAction(gate.periodEndDate, "missing_notice"))) {
    return { skippedReason: "already_notified", status: "skipped" as const };
  }

  const sent = await sendTelegramMessage(botToken, chatId, buildSsiWeeklyLogisticsMissingNotice(gate));
  await completeControlAction(gate.periodEndDate, "missing_notice", sent.messageId, sent.status);
  return sent;
}

export function buildSsiWeeklyLogisticsRequestText(periodEndDate: string) {
  return [
    `Доброго дня! Для щотижневого SSI звіту за тиждень до ${formatUkDate(periodEndDate)} потрібен логістичний пакет.`,
    "",
    "Надішліть у цей бот окремими повідомленнями або файлами з тегами:",
    "#ssi #weekly #agro_ex_im - agro_ex_im / експорт",
    "#ssi #weekly #checkpoints - check points / пункти пропуску",
    "#ssi #weekly #operational_wagons - оперативні вагони",
    "#ssi #weekly #uz_statistics - статистика УЗ",
    "",
    "Без повного комплекту тижневий звіт не публікується.",
  ].join("\n");
}

export function buildSsiWeeklyLogisticsMissingNotice(gate: SsiWeeklyLogisticsGate) {
  const labels: Record<SsiWeeklyLogisticsType, string> = {
    agro_ex_im: "agro_ex_im / експорт",
    checkpoints: "check points / пункти пропуску",
    operational_wagons: "оперативні вагони",
    uz_statistics: "статистика УЗ",
  };
  const missing = gate.missingTypes.map((type) => labels[type]).join(", ");
  return [
    "🇺🇦 SPIKE BROKERS | Weekly Commodity & Logistics Market",
    formatUkDate(gate.periodEndDate),
    "",
    "⚠️ Дані для щотижневого логістичного звіту ще не надані.",
    `Очікуємо: ${missing}.`,
    "Публікацію звіту буде продовжено після отримання повного пакета.",
  ].join("\n");
}

async function claimControlAction(periodEndDate: string, action: ControlAction) {
  await ensureControlStorage();
  const rows = await db.$queryRawUnsafe<Array<{ periodEndDate: Date }>>(
    `
      INSERT INTO "SsiWeeklyLogisticsControl" ("periodEndDate", "action", "status", "createdAt", "updatedAt")
      VALUES ($1::date, $2, 'claimed', NOW(), NOW())
      ON CONFLICT ("periodEndDate", "action") DO NOTHING
      RETURNING "periodEndDate"
    `,
    periodEndDate,
    action,
  );
  return rows.length > 0;
}

async function completeControlAction(periodEndDate: string, action: ControlAction, messageId: number | null, status: "failed" | "sent") {
  await db.$executeRawUnsafe(
    `
      UPDATE "SsiWeeklyLogisticsControl"
      SET "status" = $3, "telegramMessageId" = $4, "updatedAt" = NOW()
      WHERE "periodEndDate" = $1::date AND "action" = $2
    `,
    periodEndDate,
    action,
    status,
    messageId,
  );
}

let storageReady: Promise<void> | undefined;
async function ensureControlStorage() {
  return storageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SsiWeeklyLogisticsControl" (
        "periodEndDate" DATE NOT NULL,
        "action" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "telegramMessageId" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SsiWeeklyLogisticsControl_pkey" PRIMARY KEY ("periodEndDate", "action")
      )
    `);
  })();
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({ chat_id: chatId, disable_web_page_preview: true, text }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }, TELEGRAM_TIMEOUT_MS).catch(() => null);
  if (!response?.ok) return { messageId: null, status: "failed" as const };
  const payload = await response.json().catch(() => null) as { result?: { message_id?: number } } | null;
  return { messageId: payload?.result?.message_id ?? null, status: "sent" as const };
}

async function resolveProviderChatId() {
  const configured = process.env.SSI_WEEKLY_LOGISTICS_TELEGRAM_CHAT_ID?.trim();
  if (configured) return configured;
  if (!hasDatabaseUrl()) return null;

  const contact = await db.respondentContact.findFirst({
    select: { telegramChatId: true },
    where: {
      active: true,
      telegramChatId: { not: null },
      OR: [
        { telegramUsername: "o_solo" },
        { telegramUsername: "@o_solo" },
      ],
    },
  });
  return contact?.telegramChatId ?? null;
}

function getMaterialBotToken() {
  return process.env.MEDIA_HUB_TELEGRAM_BOT_TOKEN ?? process.env.ID3X_TELEGRAM_BOT_TOKEN ?? process.env.SPIKE_TELEGRAM_BOT_TOKEN ?? process.env.INDEX_TELEGRAM_BOT_TOKEN;
}

function getReportBotToken() {
  return process.env.SPIKE_TELEGRAM_BOT_TOKEN ?? process.env.INDEX_TELEGRAM_BOT_TOKEN;
}

function getReportChatId() {
  return process.env.SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID ?? process.env.MEDIA_HUB_TELEGRAM_CHAT_ID ?? process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ?? process.env.SPIKE_AI_TELEGRAM_CHAT_ID ?? process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID;
}

function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatUkDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}
