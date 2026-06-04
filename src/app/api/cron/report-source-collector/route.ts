import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  getDailyTelegramDigest,
  getWeeklyTelegramDigest,
  syncTelegramWorkspaceResources,
} from "@/lib/telegram-source-collector";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.SPIKE_REPORT_SOURCE_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const reportKind =
    url.searchParams.get("kind") === "weekly" ? "weekly" : "daily";
  const date = url.searchParams.get("date");
  const week = url.searchParams.get("week");

  if (reportKind === "weekly") {
    const sync = await syncTelegramWorkspaceResources("weekly");
    const digest = week ? await getWeeklyTelegramDigest(week) : null;
    return NextResponse.json({
      digest,
      kind: "weekly",
      sync,
      triggeredAt: new Date().toISOString(),
    });
  }

  const sync = await syncTelegramWorkspaceResources("daily");
  const digest = date ? await getDailyTelegramDigest(date) : null;
  return NextResponse.json({
    date: date ?? null,
    digest,
    kind: "daily",
    sync,
    triggeredAt: new Date().toISOString(),
  });
}
