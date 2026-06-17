import type { AiAnalyticsPoint, PublicAiMarketBrief } from "@/lib/ai-market-brief-types";
import type { Locale } from "@/lib/i18n";

type AiMarketBriefAdminModule = typeof import("@/lib/ai-market-brief");
type AiMarketBriefPublicModule = typeof import("@/lib/ai-market-brief-public");

async function loadAiMarketBriefAdminModule() {
  return import("@/lib/ai-market-brief") as Promise<AiMarketBriefAdminModule>;
}

async function loadAiMarketBriefPublicModule() {
  return import("@/lib/ai-market-brief-public") as Promise<AiMarketBriefPublicModule>;
}

export async function generateAndStoreDailyAiMarketBriefs(options: {
  actorUserId?: string;
  date?: string;
  force?: boolean;
  source?: string;
}) {
  const module = await loadAiMarketBriefAdminModule();
  return module.generateAndStoreDailyAiMarketBriefs(options);
}

export async function getAiMarketBriefAdminStatus(date: string) {
  const module = await loadAiMarketBriefAdminModule();
  return module.getAiMarketBriefAdminStatus(date);
}

export async function getLatestAiCardComments(locale: Locale) {
  const module = await loadAiMarketBriefPublicModule();
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
  const module = await loadAiMarketBriefPublicModule();
  return module.getPublishedAiMarketBrief({
    activeRespondentCount,
    history,
    locale,
  });
}

export async function sendAiBriefTelegramSummary(date: string, locale: Locale) {
  const module = await loadAiMarketBriefAdminModule();
  return module.sendAiBriefTelegramSummary(date, locale);
}

export async function buildAiBriefTelegramSummaryText(
  brief: PublicAiMarketBrief,
  locale: Locale,
  template?: string,
  latestData?: Array<{
    basis: string;
    changeAbs: number | null;
    commodityId: string;
    commodityNameEn: string;
    commodityNameUk: string;
    valueUsdPerMt: number | null;
  }>,
) {
  const module = await loadAiMarketBriefAdminModule();
  return module.buildAiBriefTelegramSummaryText(brief, locale, template, latestData);
}

export async function isAiBriefLocaleCompatible(
  brief: PublicAiMarketBrief,
  locale: Locale,
) {
  const module = await loadAiMarketBriefPublicModule();
  return module.isAiBriefLocaleCompatible(brief, locale);
}

export async function mapConfidenceLabel(confidence: string, locale: Locale): Promise<string> {
  const module = await loadAiMarketBriefPublicModule();
  return module.mapConfidenceLabel(confidence, locale);
}
