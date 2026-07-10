import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { getPublicHistoryData } from "@/lib/public-api-data";
import {
  buildScenarioMarketReadSnapshot,
  type ScenarioMarketReadSnapshot,
} from "@/lib/scenario-market-read";

export const SCENARIO_MARKET_READ_CACHE_TAG = "scenario-market-read";
export const ANALYTICS_DISPLAY_CACHE_TAG = "analytics-display-snapshot";

export type AnalyticsDisplaySnapshot = {
  generatedAt: string;
  history: Array<{
    commodityId: string;
    date: string;
    dayChange: number;
    percentChange: number;
    respondents: number;
    value: number;
  }>;
};

const getCachedScenarioMarketReadSnapshot = unstable_cache(
  async () => {
    const history = await getPublicHistoryData({ scope: "analytics" });

    return buildScenarioMarketReadSnapshot(
      history.map((point) => ({
        commodityId: point.commodityId,
        date: point.date,
        value: point.valueUsdPerMt,
      })),
    );
  },
  ["scenario-market-read-v2", "spike-ua"],
  {
    revalidate: 24 * 60 * 60,
    tags: [SCENARIO_MARKET_READ_CACHE_TAG],
  },
);

export function getScenarioMarketReadSnapshot(): Promise<ScenarioMarketReadSnapshot> {
  return getCachedScenarioMarketReadSnapshot();
}

export function revalidateScenarioMarketReadSnapshot() {
  revalidateTag(SCENARIO_MARKET_READ_CACHE_TAG, "max");
}

const getCachedAnalyticsDisplaySnapshot = unstable_cache(
  async (): Promise<AnalyticsDisplaySnapshot> => {
    const history = await getPublicHistoryData({ scope: "analytics" });
    const recentDates = [...new Set(history.map((point) => point.date))]
      .sort((first, second) => second.localeCompare(first))
      .slice(0, 365);
    const visibleDates = new Set(recentDates);

    return {
      generatedAt: new Date().toISOString(),
      history: history
        .filter((point) => visibleDates.has(point.date))
        .map((point) => ({
          commodityId: point.commodityId,
          date: point.date,
          dayChange: point.changeAbs,
          percentChange: point.changePct,
          respondents: point.respondents,
          value: point.valueUsdPerMt,
        })),
    };
  },
  ["analytics-display-snapshot", "spike-ua"],
  {
    revalidate: 24 * 60 * 60,
    tags: [ANALYTICS_DISPLAY_CACHE_TAG],
  },
);

export function getAnalyticsDisplaySnapshot(): Promise<AnalyticsDisplaySnapshot> {
  return getCachedAnalyticsDisplaySnapshot();
}

export function revalidateAnalyticsDisplaySnapshot() {
  revalidateTag(ANALYTICS_DISPLAY_CACHE_TAG, "max");
}
