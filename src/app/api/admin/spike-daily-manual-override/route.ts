import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import { getCurrentDemoUser } from "@/lib/demo-auth";
import { autoPublishSpikeDailyIndices, formatDateKyiv } from "@/lib/auto-publish";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { upsertRespondentPrice } from "@/lib/respondent-prices";

export const dynamic = "force-dynamic";

type ManualOverrideBody = {
  date?: string;
  force?: boolean;
  values?: Array<{
    indexCode: string;
    price: number;
  }>;
};

const SSI_MANUAL_OVERRIDE_RESPONDENT = "SSI_MANUAL_OVERRIDE";

export async function POST(request: Request) {
  const user = await getCurrentDemoUser();
  const hasAdminRole = user?.role === "admin";
  if (
    !hasAdminRole &&
    !isBearerTokenAuthorized(request, [
      process.env.SPIKE_DAILY_CATCHUP_SECRET,
      process.env.MEDIA_HUB_CATCHUP_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeIndex = getActiveIndexConfig();
  if (activeIndex.id !== "spike-ua") {
    return NextResponse.json({ error: "Only spike-ua is supported" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as ManualOverrideBody;
  const query = new URL(request.url).searchParams;
  const force = query.get("force") === "1" || body.force === true;

  if (!force) {
    return NextResponse.json(
      { error: "force is required and must be 1 or true" },
      { status: 400 },
    );
  }

  const date = normalizeDate(query.get("date") ?? body.date) ?? formatDateKyiv();
  const values = normalizeValues(body.values);

  if (values.length === 0) {
    return NextResponse.json({ error: "No valid override values provided" }, { status: 400 });
  }

  const saved = [];
  let stage = "save";
  let publish;

  try {
    for (const value of values) {
      const submission = await upsertRespondentPrice({
        currency: "USD",
        date,
        indexCode: value.indexCode,
        meta: {
          excludedFromIndex: false,
          manualOverride: true,
          overrideReason: "telegram_report_site_catchup",
          sourceReport: `ssi_telegram_daily_${date}`,
        },
        price: value.price,
        respondentCode: SSI_MANUAL_OVERRIDE_RESPONDENT,
      });

      saved.push({
        indexCode: value.indexCode,
        price: value.price,
        saved: Boolean(submission),
      });
    }

    stage = "publish";
    publish = await autoPublishSpikeDailyIndices(date, {
      generateAiBrief: false,
      publishMediaHub: false,
      replaceExisting: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Manual override failed",
        date,
        detail: error instanceof Error ? error.message : "Unknown error",
        saved,
        stage,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    date,
    authMode: hasAdminRole ? "admin_session" : "bearer_secret",
    publish,
    saved,
    tenant: activeIndex.id,
    triggeredAt: new Date().toISOString(),
  });
}

function normalizeDate(value: string | undefined | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeValues(values: ManualOverrideBody["values"]) {
  return (values ?? [])
    .filter(
      (value): value is { indexCode: string; price: number } =>
        typeof value?.indexCode === "string" &&
        value.indexCode.trim().length > 0 &&
        Number.isFinite(value.price) &&
        value.price > 0,
    )
    .map((value) => ({
      indexCode: value.indexCode.trim(),
      price: value.price,
    }));
}
