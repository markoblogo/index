import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { syncTelegramWorkspaceResources } from "@/lib/telegram-source-collector";
import { runDueMediaHubPublication } from "@/lib/media-hub-publication-scheduler";

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
  const sourceSync = await syncTelegramWorkspaceResources("weekly");
  const publication = await runDueMediaHubPublication({
    date: week,
  });

  return NextResponse.json({
    publication,
    sourceSync,
    triggeredAt: new Date().toISOString(),
  });
}
