import { NextResponse } from "next/server";
import { timingSafeEqualString } from "@/lib/cron-auth";
import { getCurrentDemoUser } from "@/lib/demo-auth";
import { autoPublishSpikeDailyIndices, formatDateKyiv } from "@/lib/auto-publish";
import { runDueMediaHubPublication } from "@/lib/media-hub-publication-scheduler";
import { isPlatformSite } from "@/lib/platform-site";

export const dynamic = "force-dynamic";

type CatchupBody = {
  date?: string;
  force?: boolean;
  replaceExisting?: boolean;
  publishMediaHub?: boolean;
  mediaHubKind?: "daily" | "weekly" | "monthly";
  mediaHubResend?: boolean;
};

export async function POST(request: Request) {
  const user = await getCurrentDemoUser();
  const headerSecret = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const configuredSecret = process.env.SPIKE_DAILY_CATCHUP_SECRET;
  const hasAdminRole = user?.role === "admin";
  const hasSecret = Boolean(
    headerSecret &&
      configuredSecret &&
      configuredSecret.length > 0 &&
      timingSafeEqualString(headerSecret, configuredSecret),
  );

  if (!hasAdminRole && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = ((await request.json().catch(() => ({}))) as CatchupBody) || {};
  const query = new URL(request.url).searchParams;

  const queryDate = query.get("date");
  const queryForce = query.get("force");
  const queryReplace = query.get("replace");
  const queryPublishMediaHub = query.get("mediaHub");
  const queryKind = query.get("kind") ?? query.get("mediaHubKind");
  const queryResend = query.get("resend");

  const date = normalizeDate(queryDate ?? payload.date) ?? formatDateKyiv();
  const platform = isPlatformSite();
  const publishMediaHub = queryPublishMediaHub
    ? queryPublishMediaHub !== "0"
    : payload.publishMediaHub !== false;
  const force = queryForce
    ? queryForce === "1"
    : Boolean(payload.force);
  const replaceExisting = queryReplace
    ? queryReplace === "1"
    : Boolean(payload.replaceExisting);
  const mediaHubResend = queryResend
    ? queryResend === "1"
    : payload.mediaHubResend === true;
  const mediaHubKind = normalizeKind(queryKind || payload.mediaHubKind);

  const result: Record<string, unknown> = {
    date,
    requestedDate: (queryDate ?? payload.date ?? null),
    triggerSource: hasSecret ? "secret" : "admin_session",
    platform,
    tenant: platform ? "1d3x" : "spike-ua",
    triggeredAt: new Date().toISOString(),
    force,
  };

  if (!platform) {
    const indices = await autoPublishSpikeDailyIndices(date, {
      generateAiBrief: false,
      publishMediaHub,
      replaceExisting: replaceExisting || force,
    });
    result.indices = indices;
    return NextResponse.json(result);
  }

  const publication = await runDueMediaHubPublication({
    date,
    forceKind: mediaHubKind ?? "daily",
    forceTelegram: mediaHubResend,
  });

  result.mediaHub = publication;
  return NextResponse.json(result);
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeKind(value: string | undefined): "daily" | "weekly" | "monthly" | undefined {
  return value === "weekly" || value === "monthly" || value === "daily"
    ? value
    : undefined;
}
