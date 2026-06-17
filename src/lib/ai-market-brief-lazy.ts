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
  const loadedModule = await loadAiMarketBriefAdminModule();
  return loadedModule.generateAndStoreDailyAiMarketBriefs(options);
}

export async function getAiMarketBriefAdminStatus(date: string) {
  const loadedModule = await loadAiMarketBriefAdminModule();
  return loadedModule.getAiMarketBriefAdminStatus(date);
}

export async function getLatestAiCardComments(locale: Locale) {
  const loadedModule = await loadAiMarketBriefPublicModule();
  return loadedModule.getLatestAiCardComments(locale);
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
  const loadedModule = await loadAiMarketBriefPublicModule();
  return loadedModule.getPublishedAiMarketBrief({
    activeRespondentCount,
    history,
    locale,
  });
}

export async function sendAiBriefTelegramSummary(date: string, locale: Locale) {
  const loadedModule = await loadAiMarketBriefAdminModule();
  return loadedModule.sendAiBriefTelegramSummary(date, locale);
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
  const loadedModule = await loadAiMarketBriefAdminModule();
  return loadedModule.buildAiBriefTelegramSummaryText(
    brief,
    locale,
    template,
    latestData,
  );
}

export async function isAiBriefLocaleCompatible(
  brief: PublicAiMarketBrief,
  locale: Locale,
) {
  const loadedModule = await loadAiMarketBriefPublicModule();
  return loadedModule.isAiBriefLocaleCompatible(brief, locale);
}

export async function mapConfidenceLabel(confidence: string, locale: Locale): Promise<string> {
  const loadedModule = await loadAiMarketBriefPublicModule();
  return loadedModule.mapConfidenceLabel(confidence, locale);
}
