import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import { runDueMediaHubPublication } from "@/lib/media-hub-publication-scheduler";
import { isPlatformSite } from "@/lib/platform-site";
import { type MediaHubPublicationKind } from "@/lib/media-hub-publication-scheduler";

export const dynamic = "force-dynamic";

type CatchupBody = {
  date?: string;
  deletePreviousTelegram?: boolean;
  force?: boolean;
  kind?: "daily" | "weekly" | "monthly";
  resend?: boolean;
  forceKind?: "daily" | "weekly" | "monthly";
  sendTelegram?: boolean;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CatchupBody;
  const query = new URL(request.url).searchParams;

  const force = query.get("force") === "1" ? true : Boolean(body.force);
  if (!force) {
    return NextResponse.json(
      { error: "force is required and must be 1 or true" },
      { status: 400 },
    );
  }

  const date = normalizeDate(query.get("date") ?? body.date) ?? getLocalDate();
  const kind = normalizeKind(
    query.get("kind") ??
      query.get("forceKind") ??
      body.kind ??
      body.forceKind ??
      (isPlatformSite() ? "daily" : "daily"),
  );
  const resend = query.get("resend") === "1" ? true : body.resend === true;
  const deletePreviousTelegram = query.get("deletePreviousTelegram") === "1"
    ? true
    : body.deletePreviousTelegram === true;
  const sendTelegram = query.get("sendTelegram") === "0"
    ? false
    : query.get("sendTelegram") === "1"
      ? true
      : body.sendTelegram ?? true;

  const result = await runDueMediaHubPublication({
    date,
    deletePreviousTelegram,
    forceKind: kind,
    forceTelegram: resend,
    publishTelegram: sendTelegram,
  });

  return NextResponse.json({
    date,
    kind,
    tenant: isPlatformSite() ? "1d3x" : "spike-ua",
    platform: isPlatformSite(),
    result,
    triggeredAt: new Date().toISOString(),
  });
}

function isAuthorized(request: Request) {
  return isBearerTokenAuthorized(request, [
    process.env.MEDIA_HUB_CATCHUP_SECRET,
    process.env.MEDIA_HUB_REPAIR_SECRET,
    process.env.MEDIA_HUB_SMOKE_TEST_SECRET,
  ]);
}

function normalizeKind(value: string | undefined): MediaHubPublicationKind | undefined {
  return value === "daily" || value === "weekly" || value === "monthly" ? value : "daily";
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function getLocalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: process.env.MEDIA_HUB_SCHEDULE_TIMEZONE || "Europe/Kyiv",
    year: "numeric",
  }).format(new Date());
}
