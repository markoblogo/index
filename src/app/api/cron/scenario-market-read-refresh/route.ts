import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  getScenarioMarketReadSnapshot,
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
  const snapshot = await getScenarioMarketReadSnapshot();

  return NextResponse.json({
    generatedAt: snapshot.generatedAt,
    seriesCount: Object.keys(snapshot.seriesByCommodityId).length,
    status: "refreshed",
  });
}
