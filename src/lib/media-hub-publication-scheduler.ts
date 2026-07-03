import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import type { Locale } from "@/lib/i18n";
import { runMediaHubApiMonitoring } from "@/lib/media-hub-api-monitoring";
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
import {
  getManualMaterialsForPeriod,
  type MediaHubManualMaterialDigest,
} from "@/lib/media-hub-manual-materials";
import {
  buildMediaHubEvidenceLedger,
  getMediaHubReportTextForValidation,
  validateMediaHubReportClaims,
  type MediaHubClaimValidation,
  type MediaHubEvidenceItem,
} from "@/lib/media-hub-evidence";
import { isPlatformSite } from "@/lib/platform-site";
import {
  getPublicLatestData,
  getPublicHistoryData,
  type PublicLatestItem,
} from "@/lib/public-api-data";
import {
  build1d3xDailyReportView,
  buildSsiDailyReportView,
  renderDailyNewsTelegramSection,
  renderSsiDailyNewsTelegramSection,
  renderSsiDailyIndexTelegramSection,
  type MediaHubDailyReportView,
} from "@/lib/media-hub-daily-report";
import type { TelegramSourceDigest } from "@/lib/telegram-source-collector";

export type MediaHubPublicationKind = "daily" | "weekly" | "monthly" | "none";

export type MediaHubPublicationPlan = {
  date: string;
  kind: MediaHubPublicationKind;
  reason: string;
  timezone: string;
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
  manualMaterialsUsed?: Array<{
    id: string;
    sourceDomain: string | null;
    sourceType: string;
  }>;
  evidence?: MediaHubEvidenceItem[];
  validation?: MediaHubClaimValidation;
  localized?: Partial<Record<Locale, MediaHubLocalizedReport>>;
  dailyReports?: Partial<Record<Locale, MediaHubDailyReportView>>;
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

export type MediaHubMonitoringPlan = {
  allowed: boolean;
  date: string;
  reason: string;
  timezone: string;
};

export type MediaHubReportArchiveItem = {
  itemCount: number;
  kind: Exclude<MediaHubPublicationKind, "none">;
  periodEndDate: string;
  periodStartDate: string;
  sourceCount: number;
  summaryTitle: string;
};

export type MediaHubReportSummary = {
  dailyReport?: MediaHubDailyReportView;
  kind: Exclude<MediaHubPublicationKind, "none">;
  periodEndDate: string;
  summaryBody: string[];
  summaryTitle: string;
};

const DEFAULT_MEDIA_HUB_TIMEZONE = "Europe/Kyiv";
const DEFAULT_SPIKE_MEDIA_HUB_DAILY_REPORT_TIME = "19:10";
const DEFAULT_PLATFORM_MEDIA_HUB_DAILY_REPORT_TIME = "19:15";
const DEFAULT_MEDIA_HUB_WEEKLY_REPORT_TIME = "15:00";

export function getMediaHubPublicationPlan(date = getParisLocalDate()): MediaHubPublicationPlan {
  const weekday = getIsoWeekday(date);
  const timezone = getMediaHubTimezone();

  if (weekday >= 1 && weekday <= 5) {
    return {
      date,
      kind: "daily",
      reason: "weekday_daily_slot",
      timezone,
    };
  }

  if (weekday !== 6) {
    return {
      date,
      kind: "none",
      reason: "no_publication_on_sunday",
      timezone,
    };
  }

  if (getSaturdayOrdinalInMonth(date) === 4) {
    return {
      date,
      kind: "monthly",
      reason: "fourth_saturday_monthly_replaces_weekly",
      timezone,
    };
  }

  return {
    date,
    kind: "weekly",
    reason: "saturday_weekly_slot",
    timezone,
  };
}

export function getMediaHubMonitoringPlan(now: Date = new Date()): MediaHubMonitoringPlan {
  const date = getParisLocalDate(now);
  const weekday = getIsoWeekday(date);
  return {
    allowed: weekday >= 1 && weekday <= 5,
    date,
    reason: weekday >= 1 && weekday <= 5
      ? "weekday_monitoring_allowed"
      : "media_hub_monitoring_disabled_on_weekends",
    timezone: getMediaHubTimezone(),
  };
}

export function isMediaHubPublicationDue(now: Date = new Date()) {
  const parts = getParisLocalTimeParts(now);
  const plan = getMediaHubPublicationPlan(parts.date);
  const [hour, minute] = getMediaHubReportTime(plan.kind).split(":").map(Number);
  return plan.kind !== "none" && parts.hour === hour && parts.minute === minute;
}

export function getMediaHubPublicationCatchupWindowMinutes() {
  const raw = process.env.MEDIA_HUB_PUBLICATION_CATCHUP_WINDOW_MINUTES?.trim() ?? "";
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 1 && value <= 240
    ? value
    : 30;
}

export function isMediaHubPublicationCatchupDue(
  now: Date = new Date(),
  plan: MediaHubPublicationPlan = getMediaHubPublicationPlan(),
) {
  if (plan.kind === "none") {
    return false;
  }

  const parts = getParisLocalTimeParts(now);
  if (parts.date !== plan.date) {
    return false;
  }

  const [dueHour, dueMinute] = getMediaHubReportTime(plan.kind).split(":").map(Number);
  const dueTotalMinutes = dueHour * 60 + dueMinute;
  const nowTotalMinutes = parts.hour * 60 + parts.minute;
  const delta = nowTotalMinutes - dueTotalMinutes;
  const window = getMediaHubPublicationCatchupWindowMinutes();

  return delta >= 0 && delta <= window;
}

export async function runDueMediaHubPublication(options: {
  date?: string;
  forceKind?: MediaHubPublicationKind;
  forceTelegram?: boolean;
  publishTelegram?: boolean;
} = {}) {
  const plan = getMediaHubPublicationPlan(options.date);
  const kind = options.forceKind && options.forceKind !== "none"
    ? options.forceKind
    : plan.kind;
  const publishTelegram = options.publishTelegram !== false;

  if (kind === "daily") {
    const report = await publishMediaHubSnapshotReport("daily", plan.date);
    const telegram = publishTelegram
      ? await sendMediaHubReportTelegram("daily", plan.date, {
      audience: isPlatformSite() ? "platform" : "spike",
      force: options.forceTelegram,
      locale: isPlatformSite() ? "en" : "uk",
      })
      : { skippedReason: "site_only", status: "skipped" as const };
    const whatsapp = !isPlatformSite()
      ? await sendMediaHubReportWhatsAppForKind("daily", plan.date)
      : { skippedReason: "platform_whatsapp_disabled", status: "skipped" as const };

    return {
      plan: { ...plan, kind },
      result: {
        report,
        telegram,
        whatsapp,
        status: "daily_media_hub_report_persisted",
      },
    };
  }

  if (kind === "weekly") {
    const report = await publishMediaHubSnapshotReport("weekly", plan.date);
    const telegram = publishTelegram
      ? await sendMediaHubReportTelegram("weekly", plan.date, {
        audience: isPlatformSite() ? "platform" : "spike",
        force: options.forceTelegram,
        locale: isPlatformSite() ? "en" : "uk",
      })
      : { skippedReason: "site_only", status: "skipped" as const };
    const whatsapp = !isPlatformSite()
      ? await sendMediaHubReportWhatsAppForKind("weekly", plan.date)
      : { skippedReason: "platform_whatsapp_disabled", status: "skipped" as const };

    return {
      plan: { ...plan, kind },
      result: {
        report,
        status: "weekly_media_hub_processed",
        telegram,
        whatsapp,
      },
    };
  }

  if (kind === "monthly") {
    const report = await publishMediaHubSnapshotReport("monthly", plan.date);
    const telegram = publishTelegram
      ? await sendMediaHubReportTelegram("monthly", plan.date, {
        audience: isPlatformSite() ? "platform" : "spike",
        force: options.forceTelegram,
        locale: isPlatformSite() ? "en" : "uk",
      })
      : { skippedReason: "site_only", status: "skipped" as const };

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

export async function sendMediaHubReportWhatsAppForKind(
  kind: Exclude<MediaHubPublicationKind, "none">,
  periodEndDate: string,
) {
  if (!hasDatabaseUrl()) {
    return { skippedReason: "database_not_configured", status: "skipped" as const };
  }

  const tenantId = getActiveIndexConfig().id;
  const report = await getMediaHubReport(kind, periodEndDate, tenantId);
  if (!report) {
    return { skippedReason: "report_not_found", status: "skipped" as const };
  }
  if (report.status === "needs_review") {
    return { skippedReason: "evidence_validation_needs_review", status: "skipped" as const };
  }

  const content = parseMediaHubReportContent(report.contentJson);
  if (!content) {
    return { skippedReason: "report_content_invalid", status: "skipped" as const };
  }

  return sendMediaHubReportWhatsApp({
    content,
    kind,
    locale: "en",
    periodEndDate,
    tenant: "spike",
  });
}

async function sendMediaHubReportWhatsApp(input: {
  content: MediaHubReportContentJson;
  kind: Exclude<MediaHubPublicationKind, "none">;
  locale: Locale;
  periodEndDate: string;
  tenant: "spike" | "platform";
}) {
  if (input.tenant !== "spike") {
    return { skippedReason: "whatsapp_only_enabled_for_spike", status: "skipped" as const };
  }

  if (process.env.SSI_WHATSAPP_ENABLED !== "1") {
    return { skippedReason: "whatsapp_disabled", status: "skipped" as const };
  }

  const webhookUrl = process.env.SSI_WHATSAPP_WEBHOOK_URL?.trim();
  const secret = process.env.SSI_WHATSAPP_WEBHOOK_SECRET?.trim();
  const groupId = process.env.SSI_WHATSAPP_TARGET_GROUP_ID?.trim();
  const groupName = process.env.SSI_WHATSAPP_TARGET_GROUP_NAME?.trim();

  if (!webhookUrl || !secret || (!groupId && !groupName)) {
    return { skippedReason: "whatsapp_not_configured", status: "skipped" as const };
  }

  const latestData = input.kind === "daily" ? await getPublicLatestData() : [];
  const text = buildMediaHubWhatsAppMessages({
    content: input.content,
    kind: input.kind,
    latestData,
    locale: input.locale,
    periodEndDate: input.periodEndDate,
    tenant: input.tenant,
  }).map(convertTelegramHtmlToWhatsAppText).join("\n\n").trim();

  if (!text) {
    return { skippedReason: "whatsapp_empty_message", status: "skipped" as const };
  }

  const response = await fetch(webhookUrl, {
    body: JSON.stringify({ groupId, groupName, text }),
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payloadText = await response.text();

  if (!response.ok) {
    return { error: payloadText, status: "failed" as const };
  }

  return { response: safeJson(payloadText), status: "sent" as const };
}

function convertTelegramHtmlToWhatsAppText(value: string) {
  return decodeBasicHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/b>/gi, "*")
      .replace(/<b>/gi, "*")
      .replace(/<\/i>/gi, "_")
      .replace(/<i>/gi, "_")
      .replace(/<[^>]+>/g, ""),
  );
}

function decodeBasicHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function buildMediaHubWhatsAppMessages(input: {
  content: MediaHubReportContentJson;
  kind: Exclude<MediaHubPublicationKind, "none">;
  latestData: PublicLatestItem[];
  locale: Locale;
  periodEndDate: string;
  tenant: "spike" | "platform";
}) {
  if (input.tenant === "spike" && input.kind === "daily") {
    const dailyReport =
      input.content.dailyReports?.en ??
      input.content.dailyReports?.uk ??
      buildSsiDailyWhatsAppFallbackReport(input.content, input.latestData, input.periodEndDate);
    return [buildSsiDailyWhatsAppText(
      input.periodEndDate,
      dailyReport,
      input.content.localized?.en?.summary ?? [],
    )];
  }

  if (input.tenant === "spike" && (input.kind === "weekly" || input.kind === "monthly")) {
    return [buildSsiNonDailyWhatsAppText(input.periodEndDate, input.kind, input.content)];
  }

  const messages = buildMediaHubTelegramMessages(input).map((message) =>
    normalizeSsiWhatsAppFooter(input.tenant, message),
  );
  return input.kind === "daily" ? [messages.join("\n\n")] : messages;
}

function buildSsiDailyWhatsAppFallbackReport(
  content: MediaHubReportContentJson,
  latestData: PublicLatestItem[],
  periodEndDate: string,
) {
  const localized = content.localized?.en;
  const fallbackSummary = dedupeNonEmpty([
    ...(localized?.summary ?? []),
    ...content.summary,
    ...content.windows.flatMap((window) => window.summaryBody),
  ]);

  return buildSsiDailyReportView({
    historyData: [],
    latestData,
    locale: "en",
    localizedSummary: fallbackSummary,
    localizedTitle: localized?.title || content.title,
    periodEndDate,
  });
}

function buildSsiDailyWhatsAppText(
  periodEndDate: string,
  dailyReport: MediaHubDailyReportView,
  englishSummary: string[],
) {
  const indexSection = dailyReport.indexSection;
  const lines = [
    `🇺🇦 <b>SPIKE SPOT INDEX UKRAINE</b> · <b>${escapeHtml(formatShortTelegramDate(periodEndDate))}</b>`,
  ];

  if (indexSection) {
    const exportItems = indexSection.groups
      .filter((group) => group.id !== "processing")
      .flatMap((group) => group.items)
      .filter((item) => item.value !== null && shouldShowSsiWhatsAppExportItem(item));
    const processingItems = indexSection.groups
      .find((group) => group.id === "processing")
      ?.items.filter((item) => item.value !== null) ?? [];

    if (exportItems.length > 0) {
      lines.push(
        "",
        "-----------------------------",
        "🌎 <b>EXPORT MARKET</b>",
        ...renderSsiDailyWhatsAppBasisBlock(exportItems, "export"),
      );
    }

    if (processingItems.length > 0) {
      lines.push(
        "",
        "-----------------------------",
        "🏭 <b>PROCESSING MARKET</b>",
        ...renderSsiDailyWhatsAppBasisBlock(processingItems, "processing"),
      );
    }
  }

  const newsItems = buildSsiDailyWhatsAppMarketOverview(dailyReport.newsSection, englishSummary);
  if (newsItems.length > 0) {
    lines.push(
      "",
      "-----------------------------",
      "📰 <b>MARKET OVERVIEW</b>",
      ...newsItems.map((item) => `* ${escapeHtml(item)}`),
    );
  }

  lines.push(
    "",
    "-----------------------------",
    "🔗 <i>Powered by 1D3X Platform</i> · https://spike.1d3x.com/",
  );

  return lines.join("\n");
}

function buildSsiNonDailyWhatsAppText(
  periodEndDate: string,
  kind: "weekly" | "monthly",
  content: MediaHubReportContentJson,
) {
  const title = kind === "weekly" ? "WEEKLY REPORT" : "MONTHLY REPORT";
  const summary = content.localized?.en?.summary ?? content.summary ?? [];
  const overview = dedupeNonEmpty(summary.map((item) => normalizeSsiWhatsAppMarketSentence(item)))
    .filter((item) => item.length > 0)
    .filter((item) => isUkraineFocusedWhatsAppMarketSentence(item))
    .slice(0, 10);
  const lines = [
    `🇺🇦 <b>SPIKE SPOT INDEX UKRAINE</b> · <b>${escapeHtml(title)}</b> · <b>${escapeHtml(formatShortTelegramDate(periodEndDate))}</b>`,
    "",
    "-----------------------------",
    "📰 <b>UKRAINE MARKET OVERVIEW</b>",
    ...overview.map((item) => `* ${escapeHtml(item)}`),
    "",
    "-----------------------------",
    "🔗 <i>Powered by 1D3X Platform</i> · https://spike.1d3x.com/",
  ];

  return lines.join("\n");
}

function renderSsiDailyWhatsAppBasisBlock(
  items: NonNullable<MediaHubDailyReportView["indexSection"]>["groups"][number]["items"],
  mode: "export" | "processing",
) {
  const byBasis = new Map<string, typeof items>();
  for (const item of items) {
    const bucket = byBasis.get(item.basis) ?? [];
    bucket.push(item);
    byBasis.set(item.basis, bucket);
  }

  const sortedEntries = [...byBasis.entries()].sort(([a], [b]) => {
    const aRank = /FCA/i.test(a) ? 2 : /Crush|processing|завод/i.test(a) ? 3 : 1;
    const bRank = /FCA/i.test(b) ? 2 : /Crush|processing|завод/i.test(b) ? 3 : 1;
    return aRank - bRank;
  });

  return sortedEntries.flatMap(([basis, basisItems]) => [
    "",
    `<b>${escapeHtml(formatSsiDailyWhatsAppBasis(basis, mode))}</b>`,
    ...sortSsiWhatsAppItems(basisItems).map((item) => {
      const vat = item.vatIncluded ? " incl. VAT" : "";
      return `* ${escapeHtml(formatSsiDailyWhatsAppCommodityName(item.name, item.commodityCode, item.basis, mode))} – ${formatWholeValueCurrency(item.value)}${vat} (${formatWholeSignedCurrency(item.dayChange)})`;
    }),
  ]);
}

function shouldShowSsiWhatsAppExportItem(
  item: NonNullable<MediaHubDailyReportView["indexSection"]>["groups"][number]["items"][number],
) {
  const normalized = `${item.commodityCode} ${item.name} ${item.basis}`.toUpperCase();
  const isChop = normalized.includes("FCA") || normalized.includes("CHOP") || normalized.includes("ЧОП");
  if (!isChop) return true;
  return normalized.includes("CORN") || normalized.includes("КУКУРУД") || normalized.includes("RAPESEED") || normalized.includes("РІПАК");
}

function sortSsiWhatsAppItems(
  items: NonNullable<MediaHubDailyReportView["indexSection"]>["groups"][number]["items"],
) {
  return [...items].sort((a, b) => ssiWhatsAppCommodityRank(a) - ssiWhatsAppCommodityRank(b));
}

function ssiWhatsAppCommodityRank(
  item: NonNullable<MediaHubDailyReportView["indexSection"]>["groups"][number]["items"][number],
) {
  const normalized = `${item.commodityCode} ${item.name}`.toUpperCase();
  if (normalized.includes("CORN") || normalized.includes("КУКУРУД")) return 10;
  if (normalized.includes("WHT_115") || normalized.includes("MILLING") || normalized.includes("ПРОДОВОЛЬЧ")) return 20;
  if (normalized.includes("FEED_WHT") || normalized.includes("FEED") || normalized.includes("ФУРАЖ")) return 30;
  if (normalized.includes("GMO_SOY") || normalized.includes("GMO SOY") || normalized.includes("СОЯ ГМО")) return 40;
  if (normalized.includes("SOYBEAN_NON_GMO") || normalized.includes("NON-GMO") || normalized.includes("NGMO") || normalized.includes("СОЯ НЕ")) return 50;
  if (normalized.includes("RAPESEED") || normalized.includes("РІПАК")) return 60;
  if (normalized.includes("SUNFLOWER") || normalized.includes("СОНЯШ")) return 70;
  return 100;
}

function formatSsiDailyWhatsAppBasis(basis: string, mode: "export" | "processing") {
  if (mode === "processing" || /СРТ ЗАВОД|CPT Crush|processing/i.test(basis)) return "CPT Plant, Ukraine";
  if (/FCA Чоп|FCA Chop|FCA_CHOP|CHOP/i.test(basis)) return "FCA Chop, Ukraine";
  return "CPT Odesa, Ukraine";
}

function formatSsiDailyWhatsAppCommodityName(
  name: string,
  commodityCode: string,
  basis: string,
  mode: "export" | "processing",
) {
  const normalized = `${commodityCode} ${name}`.toUpperCase();
  const isChop = /FCA ЧОП|FCA_CHOP|CHOP/.test(`${basis} ${commodityCode}`.toUpperCase());

  if (normalized.includes("WHT_115") || normalized.includes("MILLING") || normalized.includes("ПРОДОВОЛЬЧ")) return "Wheat 11.5pro";
  if (normalized.includes("FEED_WHT") || normalized.includes("FEED") || normalized.includes("ФУРАЖ")) return "Feed Wheat";
  if (normalized.includes("CORN") || normalized.includes("КУКУРУД")) return "Corn";
  if (normalized.includes("SUNFLOWER") || normalized.includes("СОНЯШ")) return "Sunflower 48% oil";
  if (normalized.includes("RAPESEED") || normalized.includes("РІПАК")) {
    if (mode === "processing") return "Rapeseed NGMO 48% oil";
    return isChop ? "Rapeseed NGMO 40% oil" : "Rapeseed NGMO 42% oil";
  }
  if (normalized.includes("SOYBEAN_NON_GMO") || normalized.includes("NON-GMO") || normalized.includes("NGMO") || normalized.includes("СОЯ НЕ")) {
    return "Soybeans NGMO 33pro";
  }
  if (normalized.includes("GMO_SOY") || normalized.includes("GMO SOY") || normalized.includes("СОЯ ГМО")) {
    return mode === "processing" ? "Soybeans GMO 37pro" : "Soybeans GMO 33pro";
  }
  return name
    .replace(/\s+CPT Port$/i, "")
    .replace(/\s+FCA Chop$/i, "")
    .replace(/\s+FCA Чоп$/i, "");
}

function buildSsiDailyWhatsAppMarketOverview(
  newsSection: MediaHubDailyReportView["newsSection"],
  englishSummary: string[],
) {
  const fieldworkPattern = /\b(harvest|harvesting|sowing|planting|fieldwork|field work|crop progress|winter crop|spring crop)\b/i;
  const preferredThemeIds = ["key_signals", "grains", "oilseeds", "processing", "logistics"];
  const summaryItems = englishSummary
    .map((item) => normalizeSsiWhatsAppMarketSentence(item))
    .filter((item) => item.length > 0 && isUkraineFocusedWhatsAppMarketSentence(item));
  const items = newsSection.themes
    .filter((theme) => preferredThemeIds.includes(theme.id))
    .flatMap((theme) => theme.items)
    .map((item) => normalizeSsiWhatsAppMarketSentence(item))
    .filter((item) => item.length > 0);
  const focused = items.filter((item) => isUkraineFocusedWhatsAppMarketSentence(item));
  const base = dedupeNonEmpty(summaryItems.length > 0 ? summaryItems : focused.length > 0 ? focused : items);
  const fieldwork = dedupeNonEmpty([...summaryItems, ...focused, ...items]).find((item) => fieldworkPattern.test(item));
  const enriched = fieldwork && !base.includes(fieldwork) ? [fieldwork, ...base] : base;
  return enriched
    .filter((item) => !/\b(USDA|CBOT|Euronext|MATIF)\b/i.test(item) || /\bUkraine|Ukrainian\b/i.test(item))
    .slice(0, 4);
}

function isUkraineFocusedWhatsAppMarketSentence(value: string) {
  return /\b(Ukraine|Ukrainian|Odesa|Odessa|Black Sea|Danube|CPT|FCA|Chop|harvest|harvesting|sowing|planting|fieldwork|field work|crop|export|port|processing|domestic|farm|plant|crush|logistics)\b/i.test(value);
}

function normalizeSsiWhatsAppMarketSentence(value: string) {
  return value
    .replace(/\bUSD\s*\/\s*(?:t|mt|tonne|ton)\b/gi, "$")
    .replace(/\bUSD\/t\b/gi, "$")
    .replace(/\$\s*\/\s*(?:t|mt|tonne|ton)\b/gi, "$")
    .replace(/\bUAH\s*\/\s*(?:t|mt|tonne|ton)\b/gi, "₴")
    .replace(/\bEUR\s*\/\s*(?:t|mt|tonne|ton)\b/gi, "€")
    .replace(/^\s*(?:🔎|🌾|🌻|🏭|🚚|⚖️|🌍|📰)\s*/u, "")
    .replace(/^Main signals\s*:?/i, "")
    .replace(/^Market overview\s*:?/i, "")
    .replace(/^Ukraine market overview\s*:?/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSsiWhatsAppFooter(tenant: "spike" | "platform", text: string) {
  if (tenant !== "spike") return text;
  const lines = text.split("\n");
  const footerStart = lines.findIndex((line) => line.includes("AI-assisted Media Hub digest"));
  const body = footerStart >= 0 ? lines.slice(0, footerStart) : lines;
  return [
    ...body.filter((line) => !/^<b>Spike Spot Index<\/b>$/.test(line.trim()) && !/^https:\/\/spike\.1d3x\.com\/?$/.test(line.trim())),
    "",
    "-----------------------------",
    "🔗 <i>Powered by 1D3X Platform</i> · https://spike.1d3x.com/",
  ].join("\n").trim();
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export async function publishMediaHubSnapshotReport(
  kind: Exclude<MediaHubPublicationKind, "none">,
  periodEndDate: string,
) {
  if (!hasDatabaseUrl() && isPlatformSite()) {
    return buildTransientPublishResult(kind, periodEndDate);
  }

  if (!hasDatabaseUrl()) {
    return { skippedReason: "database_not_configured", status: "skipped" as const };
  }

  try {
    await ensureMediaHubReportStorage();

    const { content, manualMaterials, periodStartDate, primarySnapshot, snapshots } =
      await buildTransientMediaHubSnapshotReport(kind, periodEndDate);
    const tenantId = isPlatformSite() ? "1d3x" : getActiveIndexConfig().id;
    const canPublishStandardSsiDailyReport =
      tenantId === "spike-ua" &&
      kind === "daily" &&
      Boolean(content.dailyReports?.uk?.indexSection);
    const reportStatus = content.validation?.status === "needs_review" && !canPublishStandardSsiDailyReport
      ? "needs_review"
      : "published";
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
          $10, $7, $8::jsonb, $9::jsonb,
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
      JSON.stringify({
        manualMaterials,
        snapshots,
      }),
      reportStatus,
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
      status: reportStatus,
      unsupportedClaims: content.validation?.unsupportedClaims ?? [],
    };
  } catch (error) {
    if (isPlatformSite()) {
      console.warn("Falling back to transient 1D3X Media Hub report.", safeErrorMessage(error));
      return buildTransientPublishResult(kind, periodEndDate);
    }
    throw error;
  }
}

async function buildTransientPublishResult(
  kind: Exclude<MediaHubPublicationKind, "none">,
  periodEndDate: string,
) {
  const transient = await buildTransientMediaHubSnapshotReport(kind, periodEndDate);
  return {
    itemCount: transient.primarySnapshot?.itemCount ?? 0,
    kind,
    periodEndDate,
    periodStartDate: transient.periodStartDate,
    sourceCount: transient.primarySnapshot?.sourceCount ?? 0,
    status: "published_transient" as const,
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
  if (!hasDatabaseUrl() && options.audience !== "platform") {
    return { skippedReason: "database_not_configured", status: "skipped" as const };
  }
  if (options.audience === "platform" && isId3xMediaHubTelegramPaused()) {
    return { skippedReason: "id3x_telegram_paused", status: "skipped" as const };
  }

  const tenantId = options.audience === "platform" ? "1d3x" : getActiveIndexConfig().id;
  const report = hasDatabaseUrl()
    ? await getMediaHubReport(kind, periodEndDate, tenantId)
    : null;

  const botToken =
    options.audience === "platform"
      ? process.env.ID3X_TELEGRAM_BOT_TOKEN ??
        process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
        process.env.INDEX_TELEGRAM_BOT_TOKEN
      : process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
        process.env.INDEX_TELEGRAM_BOT_TOKEN;
  const chatId =
    options.audience === "platform"
      ? process.env.ID3X_MEDIA_HUB_TELEGRAM_CHAT_ID ??
        process.env.MEDIA_HUB_TELEGRAM_CHAT_ID ??
        process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
        process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
        process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID
      : kind === "daily"
        ? process.env.SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID ??
          process.env.MEDIA_HUB_TELEGRAM_CHAT_ID ??
          process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
          process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
          process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID
        : process.env.SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID ??
          process.env.MEDIA_HUB_TELEGRAM_CHAT_ID ??
          process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
          process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
          process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID;

  if (!botToken || !chatId) {
    return { skippedReason: "telegram_not_configured", status: "skipped" as const };
  }

  if (report?.telegramSentAt && !options.force) {
    return { skippedReason: "already_sent", status: "skipped" as const };
  }

  if (report?.status === "needs_review") {
    return { skippedReason: "evidence_validation_needs_review", status: "skipped" as const };
  }

  if (!report && options.audience !== "platform") {
    return { skippedReason: "report_not_found", status: "skipped" as const };
  }

  const content = report
    ? parseMediaHubReportContent(report.contentJson)
    : (await buildTransientMediaHubSnapshotReport(kind, periodEndDate)).content;
  if (!content) {
    return { skippedReason: "report_content_invalid", status: "skipped" as const };
  }

  const canSendStandardSsiDailyReport =
    options.audience === "spike" &&
    kind === "daily" &&
    Boolean(content.dailyReports?.[options.locale]?.indexSection);
  if (content.validation?.status === "needs_review" && !canSendStandardSsiDailyReport) {
    return { skippedReason: "evidence_validation_needs_review", status: "skipped" as const };
  }

  const latestData =
    options.audience === "spike" && kind === "daily"
      ? await getPublicLatestData()
      : [];
  const messages = buildMediaHubTelegramMessages({
    content,
    kind,
    latestData,
    locale: options.locale,
    periodEndDate,
    tenant: options.audience,
  });
  const sent = await sendTelegramMessages(botToken, normalizeMediaHubTelegramChatId(chatId), messages);
  if (sent.status === "failed") {
    return sent;
  }

  if (!report || !hasDatabaseUrl()) {
    return {
      messageIds: sent.messageIds,
      status: "sent_transient" as const,
    };
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
    JSON.stringify(sent.messageIds),
  );

  return { messageIds: sent.messageIds, status: "sent" as const };
}

async function getPublicationSnapshots(windowKey: MediaHubWindowKey) {
  if (isPlatformSite()) {
    const windows = await get1d3xRssWindows();
    return windows.filter((window) => window.window === windowKey);
  }

  const windows = await getSpikeMediaHubLiveWindows("uk");
  return windows.filter((window) => window.window === windowKey);
}

async function buildTransientMediaHubSnapshotReport(
  kind: Exclude<MediaHubPublicationKind, "none">,
  periodEndDate: string,
) {
  const periodStartDate = shiftIsoDate(
    periodEndDate,
    kind === "daily" ? 0 : kind === "weekly" ? -6 : -29,
  );
  const windowKey: MediaHubWindowKey =
    kind === "daily" ? "day" : kind === "weekly" ? "week" : "month";
  await runMediaHubApiMonitoring({
    force: kind === "weekly" || kind === "monthly",
    kind,
    tenantMode: isPlatformSite() ? "platform" : "unified",
  }).catch((error: unknown) => {
    if (!isPlatformSite()) throw error;
    console.warn("Skipping 1D3X API monitoring during report build.", safeErrorMessage(error));
  });
  const snapshots = await getPublicationSnapshots(windowKey);
  const primarySnapshot = snapshots[0];
  const tenantId = isPlatformSite() ? "1d3x" : getActiveIndexConfig().id;
  const latestData = tenantId === "spike-ua" ? await getPublicLatestData() : [];
  const historyData = tenantId === "spike-ua" && kind === "daily" ? await getPublicHistoryData() : [];
  const manualMaterials = await getManualMaterialsForPeriod({
    kind,
    periodEndDate,
    periodStartDate,
    tenantId,
  }).catch((error: unknown) => {
    if (!isPlatformSite()) throw error;
    console.warn("Skipping 1D3X Media Hub manual materials.", safeErrorMessage(error));
    return [] as MediaHubManualMaterialDigest[];
  });
  const avoidPhrases = await getPreviousReportAvoidPhrases({
    kind,
    tenantId,
  }).catch((error: unknown) => {
    if (!isPlatformSite()) throw error;
    console.warn("Skipping 1D3X Media Hub avoid phrases.", safeErrorMessage(error));
    return [] as string[];
  });
  const historicalSummaries = kind === "daily"
    ? [] as string[]
    : await getPreviousReportSummariesForContext({
      kind,
      periodEndDate,
      periodStartDate,
      tenantId,
    }).catch((error: unknown) => {
      if (!isPlatformSite()) throw error;
      console.warn("Skipping historical report context.", safeErrorMessage(error));
      return [] as string[];
    });
  const llm = await generateMediaHubLlmReports({
    avoidPhrases,
    kind,
    latestData,
    manualMaterials,
    historicalSummaries,
    periodEndDate,
    periodStartDate,
    snapshots,
    tenant: tenantId === "1d3x" ? "platform" : "spike",
  });
  const content = buildSnapshotReportContent({
    kind,
    llm,
    tenant: tenantId === "1d3x" ? "platform" : "spike",
    historyData,
    latestData,
    manualMaterials,
    periodEndDate,
    periodStartDate,
    snapshots,
  });

  return {
    content,
    manualMaterials,
    periodStartDate,
    primarySnapshot,
    snapshots,
  };
}

async function sendTelegramMessages(
  botToken: string,
  chatId: string,
  messages: string[],
) {
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

  return { messageIds, status: "sent" as const };
}

function buildSnapshotReportContent(input: {
  historyData?: Awaited<ReturnType<typeof getPublicHistoryData>>;
  kind: Exclude<MediaHubPublicationKind, "none">;
  latestData?: PublicLatestItem[];
  llm?: Awaited<ReturnType<typeof generateMediaHubLlmReports>>;
  tenant: "spike" | "platform";
  manualMaterials?: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
}) {
  const primary = input.snapshots[0];
  const totalItems = input.snapshots.reduce((sum, snapshot) => sum + snapshot.itemCount, 0);
  const totalSources = input.snapshots.reduce((sum, snapshot) => sum + snapshot.sourceCount, 0);
  const primaryLocalized = getPrimaryLocalizedReport(input.llm?.localized);
  const nonDailyFallback = input.kind === "daily"
    ? null
    : buildNonDailyFallbackReport({
      kind: input.kind,
      manualMaterials: input.manualMaterials ?? [],
      snapshots: input.snapshots,
      tenant: input.tenant,
    });
  const evidenceFallback = input.kind === "daily" && isPlatformSite()
    ? buildPlatformDailyEvidenceFallback({
        manualMaterials: input.manualMaterials ?? [],
        periodEndDate: input.periodEndDate,
        snapshots: input.snapshots,
      })
    : null;
  const dailyReports = input.kind === "daily"
    ? buildDailyReportViews({
        historyData: input.historyData ?? [],
        latestData: input.latestData ?? [],
        llm: input.llm,
        periodEndDate: input.periodEndDate,
        primarySummary: evidenceFallback?.summary.length
          ? evidenceFallback.summary
          : primary?.summaryBody ?? [],
        primaryTitle: evidenceFallback?.title || primary?.summaryTitle,
      })
    : undefined;
  const evidence = buildMediaHubEvidenceLedger({
    latestData: input.latestData,
    manualMaterials: input.manualMaterials,
    periodEndDate: input.periodEndDate,
    snapshots: input.snapshots,
  });
  const validation = validateMediaHubReportClaims({
    evidence,
    reportText: getMediaHubReportTextForValidation({
      dailyReports,
      localized: input.llm?.localized,
      summary: primaryLocalized?.summary?.length
        ? primaryLocalized.summary
        : nonDailyFallback?.summary.length
          ? nonDailyFallback.summary
          : evidenceFallback?.summary.length
            ? evidenceFallback.summary
            : (primary?.summaryBody ?? []),
      title: primaryLocalized?.title || evidenceFallback?.title ||
        (nonDailyFallback?.title || primary?.summaryTitle ||
          `Media Hub ${input.kind} report · ${input.periodStartDate}—${input.periodEndDate}`),
    }),
  });

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
    manualMaterialsUsed: input.manualMaterials?.map((material) => ({
      id: material.id,
      sourceDomain: material.sourceDomain,
      sourceType: material.sourceType,
    })) ?? [],
    evidence,
    validation,
    localized: input.llm?.localized,
    ...(nonDailyFallback?.localized)
      ? { localized: {
        ...input.llm?.localized,
        uk: input.llm?.localized?.uk?.summary?.length
          ? input.llm.localized.uk
          : nonDailyFallback.localized.uk,
        en: input.llm?.localized?.en?.summary?.length
          ? input.llm.localized.en
          : nonDailyFallback.localized.en,
      }}
      : {},
    dailyReports,
    periodEndDate: input.periodEndDate,
    periodStartDate: input.periodStartDate,
    summary: primaryLocalized?.summary?.length
      ? primaryLocalized.summary
      : nonDailyFallback?.summary.length
        ? nonDailyFallback.summary
      : evidenceFallback?.summary.length
        ? evidenceFallback.summary
        : (primary?.summaryBody ?? []),
    title: primaryLocalized?.title || evidenceFallback?.title ||
      (nonDailyFallback?.title || primary?.summaryTitle ||
        `Media Hub ${input.kind} report · ${input.periodStartDate}—${input.periodEndDate}`),
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

function buildNonDailyFallbackReport(input: {
  kind: Exclude<MediaHubPublicationKind, "none">;
  manualMaterials: MediaHubManualMaterialDigest[];
  snapshots: MediaHubWindowSnapshot[];
  tenant: "spike" | "platform";
}) {
  const materialItems = input.manualMaterials
    .filter(isReportWorthyMaterial)
    .map(extractMaterialSignal)
    .filter((item): item is EvidenceSignal => Boolean(item))
    .slice(0, input.kind === "monthly" ? 48 : 28);

  const feedItems = input.snapshots
    .flatMap((snapshot) => snapshot.feed)
    .filter((item) => item.title && item.summary && !isWeakEvidenceText(`${item.title} ${item.summary}`))
    .map((item) => ({
      body: compactSentence(item.summary || item.title),
      source: item.source,
      tags: item.tags.join(" "),
      title: item.title,
    }))
    .slice(0, input.kind === "monthly" ? 44 : 24);

  const signals = dedupeEvidenceSignals([...materialItems, ...feedItems]);
  if (signals.length === 0) {
    return null;
  }

  const headline = input.tenant === "platform"
    ? `1D3X ${input.kind === "monthly" ? "Monthly" : "Weekly"} Commodity & Logistics Market`
    : `SPIKE SPOT INDEX ${input.kind === "monthly" ? "Місячний" : "Тижневий"} ринок зерна та олійних`
  ;

  const sections = [
    section(input.tenant === "platform" ? "🔎 Main signals" : "🔎 Головні сигнали", signals.slice(0, input.kind === "monthly" ? 10 : 6)),
    section(
      input.tenant === "platform" ? "🌾 Grain logistics" : "🚚 Логістика",
      filterSignals(signals, /logistics|rail|port|vessel|route|shipment|freight|truck|barge|black sea|bosphorus/i).slice(0, input.kind === "monthly" ? 8 : 5),
    ),
    section(
      input.tenant === "platform" ? "🌽 Grains" : "🌾 Зернові",
      filterSignals(signals, /wheat|corn|maize|grain|barley|sorghum/i).slice(0, input.kind === "monthly" ? 8 : 5),
    ),
    section(
      input.tenant === "platform" ? "🌱 Oilseeds and vegetable oils" : "🌱 Олійні та переробка",
      filterSignals(signals, /soy|soybean|oil|rapeseed|canola|sunflower|vegetable/i).slice(0, input.kind === "monthly" ? 8 : 5),
    ),
  ]
    .flat();

  const summary = sections.length > 0
    ? sections
    : section(input.tenant === "platform" ? "🔎 Main signals" : "🔎 Головні сигнали", signals.slice(0, 12));

  return {
    localized: {
      en: {
        summary,
        title: `1D3X ${input.kind === "monthly" ? "Monthly" : "Weekly"} Commodity & Logistics Market`,
      },
      uk: {
        summary,
        title: headline,
      },
    },
    summary,
    title: headline,
  };
}

function getPrimaryLocalizedReport(
  localized: Awaited<ReturnType<typeof generateMediaHubLlmReports>>["localized"] | undefined,
) {
  return localized?.en ?? localized?.uk;
}

function buildPlatformDailyEvidenceFallback(input: {
  manualMaterials: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  snapshots: MediaHubWindowSnapshot[];
}) {
  const materialItems = input.manualMaterials
    .filter(isReportWorthyMaterial)
    .map(extractMaterialSignal)
    .filter((item): item is EvidenceSignal => Boolean(item))
    .slice(0, 18);
  const feedItems = input.snapshots
    .flatMap((snapshot) => snapshot.feed)
    .filter((item) => item.title && !isWeakEvidenceText(`${item.title} ${item.summary}`))
    .map((item) => ({
      body: compactSentence(item.summary || item.title),
      source: item.source,
      tags: item.tags.join(" "),
      title: item.title,
    }))
    .slice(0, 10);
  const signals = dedupeEvidenceSignals([...materialItems, ...feedItems]).slice(0, 12);
  if (signals.length === 0) {
    return { summary: [], title: "" };
  }

  const sections = [
    section("🔎 Key signals", signals.slice(0, 4)),
    section("🌽 Grains", filterSignals(signals, /wheat|corn|maize|grain|barley|sorghum/i).slice(0, 3)),
    section("🌱 Oilseeds and vegetable oils", filterSignals(signals, /soy|oilseed|rapeseed|canola|sunflower|palm|vegetable oil/i).slice(0, 3)),
    section("🚢 Logistics and freight", filterSignals(signals, /freight|port|shipping|vessel|rail|truck|route|corridor|black sea|bosphorus/i).slice(0, 3)),
    section("🌦 Crop weather and production", filterSignals(signals, /weather|crop|harvest|planting|drought|rain|forecast/i).slice(0, 3)),
    section("⚖️ Trade policy and demand", filterSignals(signals, /export|import|tariff|tender|quota|sanction|demand|trade|policy/i).slice(0, 3)),
  ].flat();

  return {
    summary: sections.length > 0 ? sections : section("🔎 Key signals", signals.slice(0, 6)),
    title: `Global commodity monitoring brief - ${input.periodEndDate}`,
  };
}

type EvidenceSignal = {
  body: string;
  source: string;
  tags: string;
  title: string;
};

function isReportWorthyMaterial(material: MediaHubManualMaterialDigest) {
  const domain = (material.sourceDomain || "").toLowerCase();
  const text = `${domain} ${material.summary} ${material.extractedText}`.toLowerCase();
  if (domain.includes("wikipedia.org") || domain.includes("seedoilfreecertified.com")) {
    return false;
  }
  if (domain.includes("comtradeplus.un.org") && /un comtrade release \d/i.test(text)) {
    return false;
  }
  return !isWeakEvidenceText(text);
}

function isWeakEvidenceText(value: string) {
  const text = value.toLowerCase();
  return (
    text.includes("the day global commodity monitoring window is led by") ||
    text.includes("densest source contribution") ||
    text.includes("accepted feed contains") ||
    text.includes("seed oils list") ||
    text.includes("what foods contain seed oils")
  );
}

function extractMaterialSignal(material: MediaHubManualMaterialDigest): EvidenceSignal | null {
  const raw = material.summary || material.extractedText;
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(provider|source|published|url|routing|tags):/i.test(line))
    .filter((line) => !line.startsWith("{") && !line.startsWith("["));
  const title = lines[0] || material.originalUrl || material.sourceDomain || "";
  const body = compactSentence(lines.slice(1).join(" ") || title);
  if (!title || !body) {
    return null;
  }
  return {
    body,
    source: material.sourceDomain || material.sourceType,
    tags: raw,
    title,
  };
}

function compactSentence(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[-•\s]+/, "")
    .trim()
    .slice(0, 360);
}

function dedupeEvidenceSignals(items: EvidenceSignal[]) {
  const seen = new Set<string>();
  const result: EvidenceSignal[] = [];
  for (const item of items) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi, " ").trim().slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function filterSignals(items: EvidenceSignal[], pattern: RegExp) {
  return items.filter((item) => pattern.test(`${item.title} ${item.body} ${item.tags}`));
}

function section(title: string, items: EvidenceSignal[]) {
  if (items.length === 0) {
    return [];
  }
  return [
    title,
    ...items.map((item) => {
      const source = item.source ? ` (${item.source})` : "";
      return `${item.title}: ${item.body}${source}`;
    }),
  ];
}

function buildDailyReportViews(input: {
  historyData: Awaited<ReturnType<typeof getPublicHistoryData>>;
  latestData: PublicLatestItem[];
  llm?: Awaited<ReturnType<typeof generateMediaHubLlmReports>>;
  periodEndDate: string;
  primarySummary: string[];
  primaryTitle?: string;
}): Partial<Record<Locale, MediaHubDailyReportView>> | undefined {
  if (isPlatformSite()) {
    const en = input.llm?.localized.en;
    return {
      en: build1d3xDailyReportView({
        localizedSummary: en?.summary?.length ? en.summary : input.primarySummary,
        localizedTitle: en?.title || input.primaryTitle,
        periodEndDate: input.periodEndDate,
      }),
    };
  }

  const uk = input.llm?.localized.uk;
  const en = input.llm?.localized.en;
  return {
    uk: buildSsiDailyReportView({
      historyData: input.historyData,
      latestData: input.latestData,
      locale: "uk",
      localizedSummary: uk?.summary?.length ? uk.summary : input.primarySummary,
      localizedTitle: uk?.title || input.primaryTitle,
      periodEndDate: input.periodEndDate,
    }),
    en: buildSsiDailyReportView({
      historyData: input.historyData,
      latestData: input.latestData,
      locale: "en",
      localizedSummary: en?.summary?.length ? en.summary : input.primarySummary,
      localizedTitle: en?.title || input.primaryTitle,
      periodEndDate: input.periodEndDate,
    }),
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
  const dailyReport = input.kind === "daily" ? input.content.dailyReports?.[input.locale] : undefined;
  if (input.tenant === "spike" && input.kind === "daily" && input.locale === "uk" && dailyReport) {
    return buildSsiDailyTelegramText(input.periodEndDate, dailyReport);
  }
  const title =
    input.tenant === "platform"
      ? `🌍 <b>1D3X Media Hub · ${reportKindLabel(input.kind, input.locale)}</b>`
      : `🇺🇦 <b>SPIKE SPOT INDEX · ${reportKindLabel(input.kind, input.locale)}</b>`;
  const lines = [
    title,
    `<b>📅 ${escapeHtml(formatReportDate(input.periodEndDate, input.locale))}</b>`,
  ];

  if (dailyReport?.indexSection) {
    lines.push("", ...renderSsiDailyIndexTelegramSection(dailyReport.indexSection));
  }

  if (dailyReport) {
    lines.push(
      "",
      ...(input.tenant === "spike"
        ? renderSsiDailyNewsTelegramSection(dailyReport.newsSection)
        : renderDailyNewsTelegramSection(dailyReport.newsSection)),
    );
  } else if (primaryWindow) {
    const fallbackWindowSummary = input.content.windows.flatMap((window) => [
      window.summaryTitle,
      ...window.summaryBody,
    ]);
    const localizedSummary = localized?.summary?.length ? localized.summary : [];
    const windowSnapshots = input.content.windows.flatMap((window) => [
      `${window.label} (${window.progressLabel})`,
      ...window.summaryBody,
    ]);
    const summary = dedupeNonEmpty([
      ...localizedSummary,
      ...input.content.summary,
      ...fallbackWindowSummary,
      ...primaryWindow.summaryBody,
      ...windowSnapshots,
    ]).filter((line) => !isGenericWeakLine(line))
      .map((line) => normalizeSsiCptTerminology(input.tenant, line));
    if (localized?.title) {
      lines.push("", `<b>${escapeHtml(localized.title)}</b>`);
    }

    if (summary.length > 0) {
      const limit = input.kind === "daily" ? 24 : input.kind === "weekly" ? 100 : 140;
      lines.push(
        "",
        isUk ? "<b>🔎 Головні сигнали</b>" : "<b>🔎 Main signals</b>",
        ...summary.slice(0, limit).map((line) => `• ${escapeHtml(line)}`),
      );
    }
  }

  lines.push(
    "",
    isUk
      ? "<i>AI-assisted Media Hub digest на базі опублікованих індексів, підключених джерел і редакторських фільтрів. Не є торговою рекомендацією.</i>"
      : "<i>AI-assisted Media Hub digest based on index data, monitored sources and editorial filters. Not a trading recommendation.</i>",
    "",
    input.tenant === "platform"
      ? "<b>1D3X</b>\nhttps://1d3x.com/"
      : "<b>Spike Spot Index</b>\nhttps://spike.1d3x.com/",
  );

  return lines.join("\n");
}

function buildSsiDailyTelegramText(periodEndDate: string, dailyReport: MediaHubDailyReportView) {
  const indexSection = dailyReport.indexSection;
  const lines = [
    `🇺🇦 <b>SPIKE SPOT INDEX UKRAINE · ${escapeHtml(formatShortTelegramDate(periodEndDate))}</b>`,
  ];

  if (indexSection) {
    const exportGroups = indexSection.groups.filter((group) => group.id !== "processing");
    const processingGroup = indexSection.groups.find((group) => group.id === "processing");
    const exportItems = exportGroups.flatMap((group) => group.items).filter((item) => item.value !== null);
    const processingItems = processingGroup?.items.filter((item) => item.value !== null) ?? [];

    if (exportItems.length > 0) {
      lines.push(
        "",
        "-----------------------------",
        "<b>🌎 ЕКСПОРТНИЙ РИНОК</b>",
        ...renderSsiDailyTelegramBasisBlock(exportItems, "export"),
      );
    }

    if (processingItems.length > 0) {
      lines.push(
        "",
        "-----------------------------",
        "<b>🏭 РИНОК ПЕРЕРОБКИ</b>",
        ...renderSsiDailyTelegramBasisBlock(processingItems, "processing"),
      );
    }
  }

  const newsItems = buildSsiDailyTelegramMarketReview(dailyReport.newsSection);
  if (newsItems.length > 0) {
    lines.push(
      "",
      "-----------------------------",
      "<b>📰 РИНКОВИЙ ОГЛЯД</b>",
      ...newsItems.map((item) => `• ${escapeHtml(item)}`),
    );
  }

  lines.push(
    "",
    "-----------------------------",
    "🔗 <b>Powered by 1D3X Platform</b> · https://spike.1d3x.com/",
  );

  return lines.join("\n");
}

function renderSsiDailyTelegramBasisBlock(
  items: NonNullable<MediaHubDailyReportView["indexSection"]>["groups"][number]["items"],
  mode: "export" | "processing",
) {
  const byBasis = new Map<string, typeof items>();
  for (const item of items) {
    const bucket = byBasis.get(item.basis) ?? [];
    bucket.push(item);
    byBasis.set(item.basis, bucket);
  }

  return [...byBasis.entries()].flatMap(([basis, basisItems]) => [
    "",
    `<b>${escapeHtml(formatSsiDailyTelegramBasis(basis))}</b>`,
    ...basisItems.map((item) => {
      const vat = item.vatIncluded ? " в т.ч. ПДВ" : "";
      return `• ${escapeHtml(formatSsiDailyTelegramCommodityName(item.name, item.commodityCode, basis, mode))} - ${formatWholeValueCurrency(item.value)}${vat} (${formatWholeSignedCurrency(item.dayChange)})`;
    }),
  ]);
}

function buildSsiDailyTelegramMarketReview(newsSection: MediaHubDailyReportView["newsSection"]) {
  const preferredThemeIds = ["grains", "oilseeds", "processing", "key_signals"];
  return newsSection.themes
    .filter((theme) => preferredThemeIds.includes(theme.id))
    .flatMap((theme) => theme.items)
    .filter((item) => item.trim().length > 0)
    .slice(0, 4);
}

function formatSsiDailyTelegramBasis(basis: string) {
  if (/FCA Чоп/i.test(basis)) return "FCA Чоп, Україна";
  if (/СРТ ЗАВОД|CPT Crush|processing/i.test(basis)) return "СРТ завод, Україна";
  return "CPT Одеса, Україна";
}

function formatSsiDailyTelegramCommodityName(
  name: string,
  commodityCode: string,
  basis: string,
  mode: "export" | "processing",
) {
  const normalized = `${commodityCode} ${name}`.toUpperCase();
  const isChop = /FCA ЧОП|FCA_CHOP|CHOP/.test(`${basis} ${commodityCode}`.toUpperCase());

  if (normalized.includes("WHT_115") || normalized.includes("ПРОДОВОЛЬЧ")) return "Пшениця 11.5pro";
  if (normalized.includes("FEED_WHT") || normalized.includes("ФУРАЖ")) return "Пшениця фураж";
  if (normalized.includes("CORN") || normalized.includes("КУКУРУД")) return "Кукурудза";
  if (normalized.includes("SUNFLOWER") || normalized.includes("СОНЯШ")) return "Соняшник 48%";
  if (normalized.includes("SOYBEAN_NON_GMO") || normalized.includes("СОЯ НЕ") || normalized.includes("СОЯ НE")) {
    return "Соя НЕ-ГМО 33pro";
  }
  if (normalized.includes("GMO_SOY") || normalized.includes("СОЯ ГМО")) {
    return mode === "processing" ? "Соя ГМО 37pro" : "Соя ГМО 33pro";
  }
  if (normalized.includes("RAPESEED") || normalized.includes("РІПАК")) {
    if (mode === "processing") return "Ріпак НЕ-ГМО 48%";
    return isChop ? "Ріпак НЕ-ГМО 40%" : "Ріпак НЕ-ГМО 42%";
  }
  return name.replace(/\s+CPT Port$/i, "").replace(/\s+FCA Чоп$/i, "");
}

function formatWholeValueCurrency(value: number | null) {
  if (value === null) return "н/д";
  return `${Math.round(value)}$`;
}

function formatWholeSignedCurrency(value: number | null) {
  if (value === null) return "н/д";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}$`;
}

function formatShortTelegramDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year?.slice(-2)}`;
}

export const __mediaHubPublicationSchedulerTestHooks = {
  buildMediaHubWhatsAppMessages,
  buildSsiDailyWhatsAppText,
  buildSsiNonDailyWhatsAppText,
  convertTelegramHtmlToWhatsAppText,
};

export function buildMediaHubTelegramMessages(input: {
  content: MediaHubReportContentJson;
  kind: Exclude<MediaHubPublicationKind, "none">;
  latestData: PublicLatestItem[];
  locale: Locale;
  periodEndDate: string;
  tenant: "spike" | "platform";
}) {
  const text = input.tenant === "spike"
    ? normalizeTelegramCurrencyUnits(buildMediaHubTelegramText(input))
    : buildMediaHubTelegramText(input);
  if (input.kind === "daily") {
    return [fitSingleTelegramMessage(text)];
  }
  return splitTelegramMessageBySections(text);
}

function normalizeTelegramCurrencyUnits(text: string) {
  return text
    .replace(/\bUSD\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "$")
    .replace(/\b(?:дол\.?|долар(?:ів|и|а)?|доллар(?:ов|ы|а)?)\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "$")
    .replace(/\$\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "$")
    .replace(/\bEUR\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "€")
    .replace(/€\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "€")
    .replace(/\b(?:UAH|грн\.?|грив(?:ень|ні|ня)?)\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "₴")
    .replace(/₴\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "₴");
}

function fitSingleTelegramMessage(text: string) {
  const maxLength = 3900;
  if (text.length <= maxLength) {
    return text;
  }

  const lines = text.split("\n");
  const footerStart = lines.findIndex((line) => line.includes("AI-assisted Media Hub digest"));
  const footer = footerStart >= 0 ? lines.slice(footerStart) : [];
  const body = footerStart >= 0 ? lines.slice(0, footerStart) : lines;
  const requiredFooter = footer.length > 0 ? ["", ...footer] : [];
  const result: string[] = [];
  let sectionItemCount = 0;

  for (const line of body) {
    const isBullet = line.trim().startsWith("• ");
    const isHeading = /^<b>.*<\/b>$/.test(line.trim()) && !isBullet;
    if (isHeading) {
      sectionItemCount = 0;
    }
    if (isBullet) {
      sectionItemCount += 1;
      if (sectionItemCount > 2) {
        continue;
      }
    }
    const candidate = [...result, line, ...requiredFooter].join("\n");
    if (candidate.length > maxLength) {
      continue;
    }
    result.push(line);
  }

  const fitted = [...result, ...requiredFooter].join("\n").trim();
  if (fitted.length <= maxLength) {
    return fitted;
  }

  return `${fitted.slice(0, maxLength - 160).trim()}\n\n<i>Report shortened to fit one Telegram message.</i>`;
}

function splitTelegramMessageBySections(text: string) {
  const maxLength = 3900;
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let current = "";
  for (const section of splitTelegramSections(text)) {
    const candidate = current ? `${current}\n\n${section}` : section;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }
    if (current) {
      chunks.push(current);
    }
    if (section.length <= maxLength) {
      current = section;
    } else {
      chunks.push(...splitTelegramMessage(section));
      current = "";
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function splitTelegramSections(text: string) {
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of text.split("\n")) {
    const startsSection = current.length > 0 && /^<b>[^<]+<\/b>$/.test(line.trim());
    if (startsSection) {
      sections.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    sections.push(current.join("\n").trim());
  }
  return sections.filter(Boolean);
}

function splitTelegramMessage(text: string) {
  const maxLength = 3900;
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let current = "";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();

    if (line.length > maxLength) {
      if (current.trim().length > 0) {
        chunks.push(current);
        current = "";
      }

      for (let index = 0; index < line.length; index += maxLength - 120) {
        chunks.push(line.slice(index, index + maxLength - 120).trim());
      }
      continue;
    }

    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLength) {
      if (current) {
        chunks.push(current);
      }
      current = line;
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
  const evidence = Array.isArray(candidate.evidence)
    ? candidate.evidence as MediaHubEvidenceItem[]
    : [];
  const validation = isValidation(candidate.validation)
    ? candidate.validation
    : undefined;

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
    dailyReports: parseDailyReports(candidate.dailyReports),
    evidence,
    validation,
    manualMaterialsUsed: Array.isArray(candidate.manualMaterialsUsed)
      ? candidate.manualMaterialsUsed
          .filter((item) => Boolean(item) && typeof item === "object")
          .map((item) => {
            const record = item as Record<string, unknown>;
            return {
              id: String(record.id ?? ""),
              sourceDomain: record.sourceDomain ? String(record.sourceDomain) : null,
              sourceType: String(record.sourceType ?? ""),
            };
          })
      : [],
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

function isValidation(value: unknown): value is MediaHubClaimValidation {
  return Boolean(
    value &&
    typeof value === "object" &&
    ((value as { status?: unknown }).status === "passed" ||
      (value as { status?: unknown }).status === "needs_review"),
  );
}

function parseDailyReports(value: unknown): Partial<Record<Locale, MediaHubDailyReportView>> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const reports: Partial<Record<Locale, MediaHubDailyReportView>> = {};
  for (const locale of ["uk", "en"] as const) {
    const report = (value as Partial<Record<Locale, unknown>>)[locale];
    if (!report || typeof report !== "object") continue;
    const candidate = report as MediaHubDailyReportView;
    if (candidate.newsSection?.title && Array.isArray(candidate.newsSection.themes)) {
      reports[locale] = candidate;
    }
  }
  return Object.keys(reports).length > 0 ? reports : undefined;
}

export async function getLatestPublishedMediaHubReportSummary(input: {
  kind?: Exclude<MediaHubPublicationKind, "none">;
  locale: Locale;
  periodEndDate?: string;
  tenantId?: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    await ensureMediaHubReportStorage();

    const tenantId = input.tenantId ?? (isPlatformSite() ? "1d3x" : getActiveIndexConfig().id);
    const rows = await db.$queryRawUnsafe<MediaHubReportRow[]>(
      `
        SELECT *
        FROM "MediaHubReport"
        WHERE "tenantId" = $1
          AND ($2::text IS NULL OR "kind" = $2)
          AND ($3::date IS NULL OR "periodEnd" = $3::date)
          AND "status" = 'published'
        ORDER BY
          "periodEnd" DESC,
          CASE "kind"
            WHEN 'monthly' THEN 3
            WHEN 'weekly' THEN 2
            WHEN 'daily' THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      `,
      tenantId,
      input.kind ?? null,
      input.periodEndDate ?? null,
    );
    const content = parseMediaHubReportContent(rows[0]?.contentJson);
    if (!content) {
      return null;
    }

    const localized = content.localized?.[input.locale];
    const dailyReport = content.dailyReports?.[input.locale];
    if (localized?.summary?.length) {
      return {
        dailyReport,
        kind: content.kind,
        periodEndDate: content.periodEndDate,
        summaryBody: dailyReport
          ? flattenDailyReportSummary(dailyReport)
          : localized.summary,
        summaryTitle: localized.title || content.title,
      };
    }

    return {
      kind: content.kind,
      dailyReport,
      periodEndDate: content.periodEndDate,
      summaryBody: dailyReport
        ? flattenDailyReportSummary(dailyReport)
        : content.summary,
      summaryTitle: content.title,
    };
  } catch (error) {
    if (isPlatformSite()) {
      console.warn("Skipping latest 1D3X Media Hub report.", safeErrorMessage(error));
      return null;
    }
    throw error;
  }
}

function flattenDailyReportSummary(report: MediaHubDailyReportView | undefined) {
  if (!report) return [];
  return report.newsSection.themes.flatMap((theme) => [
    theme.title,
    ...theme.items,
  ]);
}

export async function getMediaHubReportArchive(input: {
  date?: string;
  kind?: Exclude<MediaHubPublicationKind, "none">;
  limit?: number;
  locale: Locale;
  query?: string;
  tenantId?: string;
}) {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    await ensureMediaHubReportStorage();

    const tenantId = input.tenantId ?? (isPlatformSite() ? "1d3x" : getActiveIndexConfig().id);
    const searchQuery = input.query?.trim();
    const searchPattern = searchQuery ? `%${searchQuery}%` : null;
    const rows = await db.$queryRawUnsafe<MediaHubReportRow[]>(
      `
        SELECT *
        FROM "MediaHubReport"
        WHERE "tenantId" = $1
          AND ($2::text IS NULL OR "kind" = $2)
          AND ($4::date IS NULL OR ("periodStart" <= $4::date AND "periodEnd" >= $4::date))
          AND (
            $5::text IS NULL
            OR "title" ILIKE $5
            OR "contentJson"::text ILIKE $5
          )
          AND "status" = 'published'
        ORDER BY
          "periodEnd" DESC,
          CASE "kind"
            WHEN 'monthly' THEN 3
            WHEN 'weekly' THEN 2
            WHEN 'daily' THEN 1
            ELSE 0
          END DESC
        LIMIT $3
      `,
      tenantId,
      input.kind ?? null,
      input.limit ?? 36,
      input.date ?? null,
      searchPattern,
    );

    return rows.flatMap((row): MediaHubReportArchiveItem[] => {
      const content = parseMediaHubReportContent(row.contentJson);
      if (!content) {
        return [];
      }
      const localized = content.localized?.[input.locale];

      return [{
        itemCount: content.totals.items,
        kind: content.kind,
        periodEndDate: content.periodEndDate,
        periodStartDate: content.periodStartDate,
        sourceCount: content.totals.sources,
        summaryTitle: localized?.title || content.title,
      }];
    });
  } catch (error) {
    if (isPlatformSite()) {
      console.warn("Skipping 1D3X Media Hub archive.", safeErrorMessage(error));
      return [];
    }
    throw error;
  }
}

async function getPreviousReportAvoidPhrases(input: {
  kind: Exclude<MediaHubPublicationKind, "none">;
  tenantId: string;
}) {
  if (!hasDatabaseUrl() || input.kind === "daily") {
    return [];
  }

  await ensureMediaHubReportStorage();

  const rows = await db.$queryRawUnsafe<MediaHubReportRow[]>(
    `
      SELECT *
      FROM "MediaHubReport"
      WHERE "tenantId" = $1
        AND "kind" = $2
        AND "status" = 'published'
      ORDER BY "periodEnd" DESC
      LIMIT 4
    `,
    input.tenantId,
    input.kind,
  );

  return [...new Set(rows.flatMap((row) => {
    const content = parseMediaHubReportContent(row.contentJson);
    const lines = [
      ...(content?.summary ?? []),
      ...(content?.localized?.uk?.summary ?? []),
      ...(content?.localized?.en?.summary ?? []),
    ];

    return lines
      .map((line) => line.replace(/^[•\-\s]+/, "").trim().slice(0, 90))
      .filter((line) => line.length >= 24);
  }))].slice(0, 30);
}

async function getPreviousReportSummariesForContext(input: {
  kind: Exclude<MediaHubPublicationKind, "none">;
  periodEndDate: string;
  periodStartDate: string;
  tenantId: string;
}) {
  if (!hasDatabaseUrl()) {
    return [] as string[];
  }

  await ensureMediaHubReportStorage();

  const rows = input.kind === "monthly"
    ? await db.$queryRawUnsafe<MediaHubReportRow[]>(
      `
        SELECT "contentJson"
        FROM "MediaHubReport"
        WHERE "tenantId" = $1
          AND "kind" = 'weekly'
          AND "status" = 'published'
          AND "periodEnd" >= $2::date
          AND "periodEnd" <= $3::date
        ORDER BY "periodEnd" ASC
        LIMIT 4
      `,
      input.tenantId,
      input.periodStartDate,
      input.periodEndDate,
    )
    : await db.$queryRawUnsafe<MediaHubReportRow[]>(
      `
        SELECT "contentJson"
        FROM "MediaHubReport"
        WHERE "tenantId" = $1
          AND "kind" = $2
          AND "status" = 'published'
          AND "periodEnd" < $3::date
        ORDER BY "periodEnd" DESC
        LIMIT 5
      `,
      input.tenantId,
      input.kind,
      input.periodEndDate,
    );

  const summaryLines = rows.flatMap((row) => {
    const content = parseMediaHubReportContent(row.contentJson);
    if (!content) {
      return [];
    }

    const lines = [
      ...content.localized?.uk?.summary ?? [],
      ...content.localized?.en?.summary ?? [],
      ...content.summary,
      content.title,
    ];

    return lines
      .filter((line) => Boolean(line && line.trim()))
      .map((line) => line.trim());
  });

  return dedupeNonEmpty(summaryLines).slice(0, input.kind === "monthly" ? 72 : 30);
}

function normalizeMediaHubKind(value: unknown): Exclude<MediaHubPublicationKind, "none"> {
  return value === "weekly" || value === "monthly" ? value : "daily";
}

function normalizeWindowKey(value: unknown): MediaHubWindowKey {
  return value === "week" || value === "month" ? value : "day";
}

function normalizeSsiCptTerminology(tenant: "spike" | "platform", value: string) {
  if (tenant !== "spike") {
    return value;
  }

  return value
    .replaceAll("CPT Odessa, Ukraine (processing)", "СРТ ЗАВОД, Україна (переробка)")
    .replaceAll("CPT Odesa, Ukraine (processing)", "СРТ ЗАВОД, Україна (переробка)")
    .replaceAll("CPT Odesa, Україна (переробці)", "СРТ ЗАВОД")
    .replaceAll("CPT Odessa, Україна (переробці)", "СРТ ЗАВОД")
    .replace(/CPT\s+Odessa\s+в\s+переробці/giu, "СРТ ЗАВОД")
    .replace(/CPT\s+Odesa\s+в\s+переробці/giu, "СРТ ЗАВОД")
    .replace(/CPT\s+Odesa\s+у\s+переробці/giu, "СРТ ЗАВОД")
    .replace(/CPT\s+Odessa\s+у\s+переробці/giu, "СРТ ЗАВОД");
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
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MediaHubReport_tenant_periodEnd_idx"
    ON "MediaHubReport"("tenantId", "periodEnd" DESC)
  `);
}

export async function getMediaHubReport(
  kind: string,
  periodEndDate: string,
  tenantId: string = getActiveIndexConfig().id,
) {
  try {
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
  } catch (error) {
    if (tenantId === "1d3x") {
      console.warn("Skipping 1D3X Media Hub report lookup.", safeErrorMessage(error));
      return null;
    }
    throw error;
  }
}

export async function getMediaHubReportEvidence(input: {
  kind: Exclude<MediaHubPublicationKind, "none">;
  periodEndDate: string;
  tenantId?: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureMediaHubReportStorage();
  const tenantId = input.tenantId ?? (isPlatformSite() ? "1d3x" : getActiveIndexConfig().id);
  const report = await getMediaHubReport(input.kind, input.periodEndDate, tenantId);
  if (!report) {
    return null;
  }

  const content = parseMediaHubReportContent(report.contentJson);
  return {
    evidence: content?.evidence ?? [],
    id: report.id,
    kind: report.kind,
    periodEndDate: input.periodEndDate,
    status: report.status,
    title: report.title,
    validation: content?.validation ?? null,
  };
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown_error";
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

export function getMediaHubTimezone() {
  const configured = process.env.MEDIA_HUB_SCHEDULE_TIMEZONE?.trim();
  return configured || DEFAULT_MEDIA_HUB_TIMEZONE;
}

export function getMediaHubReportTime(kind: MediaHubPublicationKind = "daily") {
  const configured =
    kind === "daily"
      ? (
        isPlatformSite()
          ? process.env.ID3X_MEDIA_HUB_DAILY_REPORT_TIME?.trim()
          : process.env.SPIKE_MEDIA_HUB_DAILY_REPORT_TIME?.trim()
      ) ?? process.env.MEDIA_HUB_DAILY_REPORT_TIME?.trim()
      : process.env.MEDIA_HUB_WEEKLY_REPORT_TIME?.trim();
  const fallback =
    kind === "daily"
      ? isPlatformSite()
        ? DEFAULT_PLATFORM_MEDIA_HUB_DAILY_REPORT_TIME
        : DEFAULT_SPIKE_MEDIA_HUB_DAILY_REPORT_TIME
      : DEFAULT_MEDIA_HUB_WEEKLY_REPORT_TIME;
  return configured && /^\d{2}:\d{2}$/.test(configured)
    ? configured
    : fallback;
}

export function getParisLocalDate(now: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: getMediaHubTimezone(),
    year: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getParisLocalTimeParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: getMediaHubTimezone(),
    year: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return {
    date: `${year}-${month}-${day}`,
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
  };
}

export function normalizeMediaHubTelegramChatId(value: string) {
  const trimmed = value.trim();
  if (/^\d{10,}$/.test(trimmed)) {
    return `-100${trimmed}`;
  }

  return trimmed;
}

function isId3xMediaHubTelegramPaused() {
  return /^(1|true|yes)$/i.test(
    process.env.ID3X_MEDIA_HUB_TELEGRAM_PAUSED?.trim() ?? "",
  );
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
