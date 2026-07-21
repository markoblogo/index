import { NextResponse } from "next/server";
import { autoPublishSpikeDailyIndices } from "@/lib/auto-publish";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  getMediaHubPublicationCatchupWindowMinutes,
  getMediaHubPublicationPlan,
  getMediaHubReport,
  getParisLocalDate,
  isMediaHubPublicationCatchupDue,
  isMediaHubPublicationDue,
  runDueMediaHubPublication,
  type MediaHubPublicationKind,
} from "@/lib/media-hub-publication-scheduler";
import { isPlatformSite } from "@/lib/platform-site";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secrets = [
    process.env.MEDIA_HUB_CRON_SECRET,
    process.env.SPIKE_MEDIA_HUB_CRON_SECRET,
    process.env.SPIKE_WEEKLY_REPORT_CRON_SECRET,
    process.env.CRON_SECRET,
  ];

  if (
    !secrets.some((secret) => typeof secret === "string" && secret.length > 0) ||
    !isCronRequestAuthorized(request, secrets)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? undefined;
  const forceKind = normalizeKind(url.searchParams.get("kind"));
  const forceTelegram = url.searchParams.get("resend") === "1";
  const isRetryCron = url.pathname === "/api/cron/media-hub-publish-retry";
  const isTenantScheduledAlias =
    (url.pathname === "/api/cron/media-hub-publish-weekday-16" && !isPlatformSite()) ||
    (url.pathname === "/api/cron/media-hub-publish-weekday-17" && isPlatformSite());
  const isSharedScheduledAlias =
    url.pathname === "/api/cron/media-hub-publish-saturday-12" ||
    url.pathname === "/api/cron/media-hub-publish-saturday-13";

  const now = new Date();
  const plan = getMediaHubPublicationPlan(date ?? getParisLocalDate(now));
  const isDue = isMediaHubPublicationDue(now);
  const isCatchupDue = isRetryCron && isMediaHubPublicationCatchupDue(now, plan);
  const forced = Boolean(
    date ||
      forceKind ||
      isTenantScheduledAlias ||
      isSharedScheduledAlias,
  );

  if (!forced && !isDue && !isCatchupDue) {
    return NextResponse.json({
      plan,
      skippedReason: "outside_media_hub_report_time",
      catchupWindowMinutes: isRetryCron
        ? getMediaHubPublicationCatchupWindowMinutes()
        : undefined,
      status: "skipped",
      triggeredAt: new Date().toISOString(),
    });
  }

  if (isRetryCron && hasDatabaseUrl()) {
    const tenantId = isPlatformSite() ? "1d3x" : getActiveIndexConfig().id;
    const existing = await getMediaHubReport(plan.kind, plan.date, tenantId);
    if (existing?.telegramSentAt) {
      return NextResponse.json({
        plan,
        skippedReason: "already_published_and_telegram_sent",
        status: "skipped",
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  if (isRetryCron && !hasDatabaseUrl() && !forced && !isDue) {
    return NextResponse.json({
      plan,
      skippedReason: "retry_disabled_without_database",
      status: "skipped",
      triggeredAt: new Date().toISOString(),
    });
  }

  const shouldEnsureSsiDailyIndices =
    !isPlatformSite() &&
    (forceKind ?? plan.kind) === "daily" &&
    getActiveIndexConfig().id === "spike-ua";
  const ssiAutoPublish = shouldEnsureSsiDailyIndices
    ? await autoPublishSpikeDailyIndices(plan.date, {
        generateAiBrief: false,
        publishMediaHub: false,
        replaceExisting: false,
      })
    : null;

  if (shouldEnsureSsiDailyIndices && ssiAutoPublish?.receipt?.status !== "current") {
    return NextResponse.json({
      plan,
      result: {
        skippedReason: "daily_index_not_current",
        status: "blocked_missing_publish_site_snapshot",
      },
      ssiAutoPublish,
      triggeredAt: new Date().toISOString(),
    });
  }

  const publication = await runDueMediaHubPublication({
    date: plan.date,
    forceKind,
    forceTelegram,
    skipSsiDailyIndexFreshnessCheck: shouldEnsureSsiDailyIndices && ssiAutoPublish?.receipt?.status === "current",
  });

  return NextResponse.json({
    ...publication,
    ssiAutoPublish,
    catchupRoute: isRetryCron,
    catchupWindowMinutes: isRetryCron
      ? getMediaHubPublicationCatchupWindowMinutes()
      : undefined,
    triggeredAt: new Date().toISOString(),
  });
}

function normalizeKind(value: string | null): MediaHubPublicationKind | undefined {
  return value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "none"
    ? value
    : undefined;
}
