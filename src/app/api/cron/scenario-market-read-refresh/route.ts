import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  getAnalyticsDisplaySnapshot,
  getScenarioMarketReadSnapshot,
  revalidateAnalyticsDisplaySnapshot,
  revalidateScenarioMarketReadSnapshot,
} from "@/lib/scenario-market-read-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.SCENARIO_MARKET_READ_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateScenarioMarketReadSnapshot();
  revalidateAnalyticsDisplaySnapshot();
  const [snapshot, analyticsSnapshot] = await Promise.all([
    getScenarioMarketReadSnapshot(),
    getAnalyticsDisplaySnapshot(),
  ]);

  return NextResponse.json({
    generatedAt: snapshot.generatedAt,
    analyticsGeneratedAt: analyticsSnapshot.generatedAt,
    analyticsHistoryCount: analyticsSnapshot.history.length,
    seriesCount: Object.keys(snapshot.seriesByCommodityId).length,
    status: "refreshed",
  });
}
