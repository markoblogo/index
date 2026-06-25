import { NextResponse } from "next/server";
import { runMediaHubApiMonitoring } from "@/lib/media-hub-api-monitoring";
import { ingestScheduledMediaHubSources } from "@/lib/media-hub-manual-materials";
import {
  runDueMediaHubPublication,
  type MediaHubPublicationKind,
} from "@/lib/media-hub-publication-scheduler";
import { isPlatformSite } from "@/lib/platform-site";
import { syncTelegramWorkspaceResources } from "@/lib/telegram-source-collector";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    date?: string;
    kind?: RepairKind;
    resend?: boolean;
    runMonitoring?: boolean;
  };
  const date = normalizeDate(body.date) ?? getLocalDate();
  const kind: RepairKind = normalizeKind(body.kind) ?? "daily";
  const platform = isPlatformSite();
  const result: Record<string, unknown> = {
    date,
    kind,
    tenant: platform ? "1d3x" : "spike-ua",
    triggeredAt: new Date().toISOString(),
  };

  if (body.runMonitoring !== false) {
    result.monitoring = platform
      ? await Promise.all([
          ingestScheduledMediaHubSources(),
          runMediaHubApiMonitoring({ force: true, kind, tenantMode: "platform" }),
        ]).then(([scheduledSources, apiMonitoring]) => ({ apiMonitoring, scheduledSources }))
      : await Promise.all([
          syncTelegramWorkspaceResources(kind === "daily" ? "daily" : "weekly", { maxPagesPerChannel: 2 }),
          ingestScheduledMediaHubSources(),
          runMediaHubApiMonitoring({ force: true, kind, tenantMode: "unified" }),
        ]).then(([telegramSync, scheduledSources, apiMonitoring]) => ({
          apiMonitoring,
          scheduledSources,
          telegramSync,
        }));
  }

  result.publication = await runDueMediaHubPublication({
    date,
    forceKind: kind,
    forceTelegram: body.resend === true,
  });

  return NextResponse.json(result);
}

function isAuthorized(request: Request) {
  const secrets = [
    process.env.MEDIA_HUB_REPAIR_SECRET,
    process.env.MEDIA_HUB_SMOKE_TEST_SECRET,
  ].filter((secret): secret is string => Boolean(secret));
  if (secrets.length === 0) return false;

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(bearer && secrets.includes(bearer));
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

type RepairKind = Exclude<MediaHubPublicationKind, "none">;

function normalizeKind(value: string | undefined): RepairKind | undefined {
  return value === "daily" || value === "weekly" || value === "monthly"
    ? value
    : undefined;
}

function getLocalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: process.env.MEDIA_HUB_SCHEDULE_TIMEZONE || "Europe/Kyiv",
    year: "numeric",
  }).format(new Date());
}
