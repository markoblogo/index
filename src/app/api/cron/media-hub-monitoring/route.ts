import { NextResponse } from "next/server";
import { get1d3xRssWindows } from "@/lib/media-hub-rss";
import { getSpikeMediaHubLiveWindows } from "@/lib/media-hub-monitoring";
import { isPlatformSite } from "@/lib/platform-site";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";
import { syncTelegramWorkspaceResources } from "@/lib/telegram-source-collector";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secrets = [
    process.env.MEDIA_HUB_CRON_SECRET,
    process.env.SPIKE_MEDIA_HUB_CRON_SECRET,
    process.env.SPIKE_REPORT_SOURCE_CRON_SECRET,
    process.env.CRON_SECRET,
  ];

  if (
    !secrets.some((secret) => typeof secret === "string" && secret.length > 0) ||
    !isCronRequestAuthorized(request, secrets)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPlatformSite()) {
    const windows = await get1d3xRssWindows();

    return NextResponse.json({
      mode: "rss",
      tenant: "1d3x",
      triggeredAt: new Date().toISOString(),
      windows: windows.map((window) => ({
        itemCount: window.itemCount,
        progressLabel: window.progressLabel,
        sourceCount: window.sourceCount,
        topicCount: window.topicCount,
        window: window.window,
      })),
    });
  }

  const [dailySync, weeklySync] = await Promise.all([
    syncTelegramWorkspaceResources("daily"),
    syncTelegramWorkspaceResources("weekly"),
  ]);
  const [ukWindows, enWindows] = await Promise.all([
    getSpikeMediaHubLiveWindows("uk"),
    getSpikeMediaHubLiveWindows("en"),
  ]);

  return NextResponse.json({
    mode: "telegram",
    tenant: "spike-ua",
    triggeredAt: new Date().toISOString(),
    sync: {
      daily: dailySync,
      weekly: weeklySync,
    },
    windows: {
      en: summarizeWindows(enWindows),
      uk: summarizeWindows(ukWindows),
    },
  });
}

function summarizeWindows(windows: MediaHubWindowSnapshot[]) {
  return windows.map((window) => ({
    itemCount: window.itemCount,
    progressLabel: window.progressLabel,
    sourceCount: window.sourceCount,
    topicCount: window.topicCount,
    window: window.window,
  }));
}
