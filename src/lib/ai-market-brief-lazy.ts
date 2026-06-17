import type { AiAnalyticsPoint } from "@/lib/ai-market-brief";
import type { Locale } from "@/lib/i18n";

type AiMarketBriefModule = typeof import("@/lib/ai-market-brief");

async function loadAiMarketBriefModule() {
  return import("@/lib/ai-market-brief") as Promise<AiMarketBriefModule>;
}

export async function generateAndStoreDailyAiMarketBriefs(options: {
  actorUserId?: string;
  date?: string;
  force?: boolean;
  source?: string;
}) {
  const module = await loadAiMarketBriefModule();
  return module.generateAndStoreDailyAiMarketBriefs(options);
}

export async function getAiMarketBriefAdminStatus(date: string) {
  const module = await loadAiMarketBriefModule();
  return module.getAiMarketBriefAdminStatus(date);
}

export async function getLatestAiCardComments(locale: Locale) {
  const module = await loadAiMarketBriefModule();
  return module.getLatestAiCardComments(locale);
}

export async function getPublishedAiMarketBrief({
  activeRespondentCount,
  history,
  locale,
}: {
  activeRespondentCount: number;
  history: AiAnalyticsPoint[];
  locale: Locale;
}) {
  const module = await loadAiMarketBriefModule();
  return module.getPublishedAiMarketBrief({
    activeRespondentCount,
    history,
    locale,
  });
}

export async function sendAiBriefTelegramSummary(date: string, locale: Locale) {
  const module = await loadAiMarketBriefModule();
  return module.sendAiBriefTelegramSummary(date, locale);
}

export async function buildAiBriefTelegramSummaryText(data: {
  activeRespondentCount: number;
  locale: Locale;
  reportDate: string;
  items: Array<{
    title: string;
    changePercent: string;
    changeStatus:
      | "up"
      | "down"
      | "flat"
      | "new_entry"
      | "unknown";
    value: string;
  }>;
}) {
  const module = await loadAiMarketBriefModule();
  return module.buildAiBriefTelegramSummaryText(data);
}

export async function isAiBriefLocaleCompatible(locale: string) {
  const module = await loadAiMarketBriefModule();
  return module.isAiBriefLocaleCompatible(locale);
}

export async function mapConfidenceLabel(confidence: string, locale: Locale): Promise<string> {
  const module = await loadAiMarketBriefModule();
  return module.mapConfidenceLabel(confidence, locale);
}
