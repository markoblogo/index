import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
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
  providerAllowlist?: string[];
  resend?: boolean;
  runMonitoring?: boolean;
};

const DEFAULT_SMOKE_PROVIDER_ALLOWLIST = [
  "currents",
  "guardian",
  "gnews",
  "marketaux",
  "newsapi",
  "newsdata",
  "brave_search",
  "un_comtrade_releases",
  "world_news_api",
];

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
    const previousAllowlist = process.env.MEDIA_HUB_API_PROVIDER_ALLOWLIST;
    process.env.MEDIA_HUB_API_PROVIDER_ALLOWLIST = (
      Array.isArray(body.providerAllowlist) && body.providerAllowlist.length > 0
        ? body.providerAllowlist
        : DEFAULT_SMOKE_PROVIDER_ALLOWLIST
    ).join(",");
    try {
      const [scheduledSources, apiMonitoring] = await Promise.all([
        ingestScheduledMediaHubSources().catch((error: unknown) => ({
          error: safeErrorMessage(error),
          status: "failed" as const,
        })),
        runMediaHubApiMonitoring({
          force: true,
          kind: "daily",
          tenantMode: platform ? "platform" : "unified",
        }).catch((error: unknown) => ({
          error: safeErrorMessage(error),
          status: "failed" as const,
        })),
      ]);
      result.monitoring = { apiMonitoring, scheduledSources };
    } finally {
      if (previousAllowlist === undefined) {
        delete process.env.MEDIA_HUB_API_PROVIDER_ALLOWLIST;
      } else {
        process.env.MEDIA_HUB_API_PROVIDER_ALLOWLIST = previousAllowlist;
      }
    }
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
  return isBearerTokenAuthorized(request, [process.env.MEDIA_HUB_SMOKE_TEST_SECRET]);
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown_error";
}

function getLocalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: process.env.MEDIA_HUB_TIMEZONE || "Europe/Paris",
    year: "numeric",
  }).format(new Date());
}
