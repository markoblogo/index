import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { getPublicHistoryData } from "@/lib/public-api-data";
import {
  buildScenarioMarketReadSnapshot,
  type ScenarioMarketReadSnapshot,
} from "@/lib/scenario-market-read";

export const SCENARIO_MARKET_READ_CACHE_TAG = "scenario-market-read";

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
  ["scenario-market-read", "spike-ua"],
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
