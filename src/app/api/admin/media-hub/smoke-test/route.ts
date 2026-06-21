import { NextResponse } from "next/server";
import { runMediaHubApiMonitoring } from "@/lib/media-hub-api-monitoring";
import { ingestScheduledMediaHubSources } from "@/lib/media-hub-manual-materials";
import {
  publishMediaHubSnapshotReport,
  sendMediaHubReportTelegram,
} from "@/lib/media-hub-publication-scheduler";
import { isPlatformSite } from "@/lib/platform-site";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SmokeTestBody = {
  date?: string;
  forceSunday?: boolean;
  generateDailyReports?: boolean;
  generateMonthly?: boolean;
  generateWeekly?: boolean;
  publishToSite?: boolean;
  publishToTelegram?: boolean;
  resend?: boolean;
  runMonitoring?: boolean;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as SmokeTestBody;
  if (!body.forceSunday) {
    return NextResponse.json(
      { error: "forceSunday=true is required for the one-off smoke test." },
      { status: 400 },
    );
  }
  if (body.generateWeekly || body.generateMonthly) {
    return NextResponse.json(
      { error: "Smoke test refuses weekly/monthly generation." },
      { status: 400 },
    );
  }

  const date = normalizeDate(body.date) ?? getLocalDate();
  const platform = isPlatformSite();
  const tenant = platform ? "1d3x" : "spike-ua";
  const locale: Locale = platform ? "en" : "uk";
  const result: Record<string, unknown> = {
    date,
    metadata: {
      excludeFromWeeklyMonthlyAggregation: true,
      forcedSundayRun: true,
      manualRun: true,
      manualRunReason: "one_off_sunday_smoke_test",
      smokeTest: true,
    },
    normalSundayGuardsChanged: false,
    tenant,
  };

  if (body.runMonitoring !== false) {
    const [scheduledSources, apiMonitoring] = await Promise.all([
      ingestScheduledMediaHubSources(),
      runMediaHubApiMonitoring({
        force: true,
        kind: "daily",
        tenantMode: platform ? "platform" : "unified",
      }),
    ]);
    result.monitoring = { apiMonitoring, scheduledSources };
  }

  if (body.generateDailyReports !== false && body.publishToSite !== false) {
    result.report = await publishMediaHubSnapshotReport("daily", date);
  }

  if (body.publishToTelegram !== false) {
    result.telegram = await sendMediaHubReportTelegram("daily", date, {
      audience: platform ? "platform" : "spike",
      force: body.resend === true,
      locale,
    });
  }

  return NextResponse.json({
    ...result,
    weeklyGenerated: false,
    monthlyGenerated: false,
  });
}

function isAuthorized(request: Request) {
  const configured = process.env.MEDIA_HUB_SMOKE_TEST_SECRET;
  if (!configured) return false;
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer === configured;
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function getLocalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: process.env.MEDIA_HUB_TIMEZONE || "Europe/Paris",
    year: "numeric",
  }).format(new Date());
}
