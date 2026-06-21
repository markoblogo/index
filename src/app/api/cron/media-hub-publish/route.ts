import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  getMediaHubPublicationPlan,
  isMediaHubPublicationDue,
  runDueMediaHubPublication,
  type MediaHubPublicationKind,
} from "@/lib/media-hub-publication-scheduler";

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
  const forced = Boolean(date || forceKind);

  if (!forced && !isMediaHubPublicationDue()) {
    const plan = getMediaHubPublicationPlan();
    return NextResponse.json({
      plan,
      skippedReason: "outside_media_hub_report_time",
      status: "skipped",
      triggeredAt: new Date().toISOString(),
    });
  }

  const plan = getMediaHubPublicationPlan(date);
  const publication = await runDueMediaHubPublication({
    date: plan.date,
    forceKind,
    forceTelegram,
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
