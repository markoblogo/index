import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  autoPublishSpikeDailyIndices,
  formatDateKyiv,
  isKyivAutoPublishHour,
  type AutoPublishResult,
} from "@/lib/auto-publish";
import { importMn7rMonitorRespondentPrices } from "@/lib/mn7r-monitor-import";
import { syncTelegramWorkspaceResources } from "@/lib/telegram-source-collector";

export const dynamic = "force-dynamic";

type MonitorImportResult = Awaited<ReturnType<typeof importMn7rMonitorRespondentPrices>>;
type CronPublishResult = AutoPublishResult & {
  monitorImport: MonitorImportResult | null;
  monitorImportError: string | null;
};

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.SPIKE_AUTO_PUBLISH_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  if (!force && !isKyivAutoPublishHour()) {
    return NextResponse.json({
      date: formatDateKyiv(),
      published: 0,
      skippedReason: "outside_kyiv_19_publish_window",
    });
  }

  const requestedDate = url.searchParams.get("date");
  const date = requestedDate ?? formatDateKyiv();
  const targetDates = requestedDate
    ? [requestedDate]
    : [...new Set([getPreviousBusinessDate(date), date])];
  const shouldImportMonitor = url.searchParams.get("import") === "1";
  const replaceExisting = url.searchParams.get("replace") === "1";
  const shouldSyncSources = url.searchParams.get("sync") === "1";

  const sourceSync = shouldSyncSources
    ? await syncTelegramWorkspaceResources("daily")
    : { skippedReason: "source_sync_not_requested", status: "skipped" as const };
  const results: CronPublishResult[] = [];

  for (const targetDate of targetDates) {
    let monitorImport:
      | Awaited<ReturnType<typeof importMn7rMonitorRespondentPrices>>
      | null = null;
    let monitorImportError: string | null = null;

    if (shouldImportMonitor) {
      try {
        monitorImport = await importMn7rMonitorRespondentPrices(targetDate);
      } catch (error) {
        monitorImportError =
          error instanceof Error ? error.message : "Unknown MN7R import error";
      }
    }

    const result = await autoPublishSpikeDailyIndices(targetDate, { replaceExisting });
    results.push({
      ...result,
      monitorImport,
      monitorImportError,
    });
  }

  const primaryResult = results[results.length - 1] ?? {
    date,
    published: 0,
    skippedReason: "no_target_dates",
  };
  const published = results.reduce((sum, result) => sum + result.published, 0);
  const skippedReason = published > 0 ? null : primaryResult.skippedReason;

  return NextResponse.json({
    ...primaryResult,
    published,
    skippedReason,
    results,
    sourceSync,
  });
}

function getPreviousBusinessDate(date: string) {
  let previous = shiftIsoDate(date, -1);

  while (getIsoWeekday(previous) >= 6) {
    previous = shiftIsoDate(previous, -1);
  }

  return previous;
}

function shiftIsoDate(date: string, days: number) {
  const utcDate = new Date(`${date}T00:00:00.000Z`);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function getIsoWeekday(date: string) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}
