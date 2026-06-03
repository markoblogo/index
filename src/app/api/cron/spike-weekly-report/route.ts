import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  autoPrepareWeeklyReportDraft,
  sendDueWeeklyReports,
} from "@/lib/weekly-ai-report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.SPIKE_WEEKLY_REPORT_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const week = url.searchParams.get("week") ?? undefined;
  const prepare = await autoPrepareWeeklyReportDraft(week);
  const telegram = await sendDueWeeklyReports();

  return NextResponse.json({
    prepare,
    telegram,
    triggeredAt: new Date().toISOString(),
  });
}
