import { NextResponse } from "next/server";
import {
  generateAndStoreDailyAiMarketBriefs,
  getPublishedAiMarketBrief,
  sendAiBriefTelegramSummary,
  type AiAnalyticsPoint,
} from "@/lib/ai-market-brief-lazy";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import type { Locale } from "@/lib/i18n";
import { getPublicHistoryData } from "@/lib/public-api-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory-lazy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const [historyRows, activeRespondentCount] = await Promise.all([
    getPublicHistoryData(),
    getActiveRespondentCountData(),
  ]);
  const history: AiAnalyticsPoint[] = historyRows.map((row) => ({
    commodityId: row.commodityId,
    date: row.date,
    dayChange: row.changeAbs,
    percentChange: row.changePct,
    respondents: row.respondents,
    value: row.valueUsdPerMt,
  }));
  const brief = await getPublishedAiMarketBrief({
    activeRespondentCount,
    history,
    locale,
  });

  return NextResponse.json(
    {
      data: brief,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}

export async function POST(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.SPIKE_AI_BRIEF_CRON_SECRET,
      process.env.SPIKE_AUTO_PUBLISH_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const result = await generateAndStoreDailyAiMarketBriefs({
    date: url.searchParams.get("date") ?? undefined,
    force: url.searchParams.get("force") === "1",
    source: "api",
  });
  const telegram =
    url.searchParams.get("telegram") === "1" && result.date
      ? await sendAiBriefTelegramSummary(result.date, "uk")
      : null;

  return NextResponse.json({ ...result, telegram });
}

function normalizeLocale(value: string | null): Locale {
  return value === "en" ? "en" : "uk";
}
