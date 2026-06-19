import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  getMediaHubPublicationPlan,
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
  const forced = Boolean(date || forceKind);

  if (!forced) {
    const minute = new Date().getUTCMinutes();
    if (isPlatformSite() && minute !== 30) {
      return NextResponse.json({
        skippedReason: "platform_media_hub_runs_on_half_hour_slot",
        status: "skipped",
        triggeredAt: new Date().toISOString(),
      });
    }
    if (!isPlatformSite() && minute === 30) {
      return NextResponse.json({
        skippedReason: "spike_media_hub_runs_on_full_hour_slot",
        status: "skipped",
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  const plan = getMediaHubPublicationPlan(date);
  const publication = await runDueMediaHubPublication({
    date: plan.date,
    forceKind,
  });

  return NextResponse.json({
    ...publication,
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
