import { NextResponse } from "next/server";
import { timingSafeEqualString } from "@/lib/cron-auth";
import { runDueMediaHubPublication } from "@/lib/media-hub-publication-scheduler";
import { isPlatformSite } from "@/lib/platform-site";
import { type MediaHubPublicationKind } from "@/lib/media-hub-publication-scheduler";

export const dynamic = "force-dynamic";

type SiteCatchupBody = {
  date?: string;
  force?: boolean;
  kind?: "daily" | "weekly" | "monthly";
  forceKind?: "daily" | "weekly" | "monthly";
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as SiteCatchupBody;
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

  const result = await runDueMediaHubPublication({
    date,
    forceKind: kind,
    publishTelegram: false,
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
  const secrets = [
    process.env.MEDIA_HUB_REPAIR_SECRET,
    process.env.MEDIA_HUB_SMOKE_TEST_SECRET,
  ].filter((secret): secret is string => Boolean(secret));
  if (secrets.length === 0) return false;

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(bearer && secrets.some((secret) => timingSafeEqualString(bearer, secret)));
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
