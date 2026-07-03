import { NextResponse } from "next/server";
import { timingSafeEqualString } from "@/lib/cron-auth";
import {
  sendMediaHubReportWhatsAppForKind,
  type MediaHubPublicationKind,
} from "@/lib/media-hub-publication-scheduler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headerSecret = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const configuredSecret = process.env.SPIKE_DAILY_CATCHUP_SECRET || process.env.CRON_SECRET;
  if (!headerSecret || !configuredSecret || !timingSafeEqualString(headerSecret, configuredSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams;
  const payload = (await request.json().catch(() => ({}))) as { date?: string; kind?: string };
  const date = normalizeDate(query.get("date") ?? payload.date) ?? todayKyivDate();
  const kind = normalizeKind(query.get("kind") ?? payload.kind) ?? "daily";
  const result = await sendMediaHubReportWhatsAppForKind(kind, date);

  return NextResponse.json({ date, kind, result });
}

function normalizeDate(value: string | undefined | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeKind(value: string | undefined | null): Exclude<MediaHubPublicationKind, "none"> | undefined {
  return value === "daily" || value === "weekly" || value === "monthly" ? value : undefined;
}

function todayKyivDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(new Date());
}
