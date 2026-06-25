import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { getRespondentTelegramDeliveryHealth } from "@/lib/respondent-telegram-healthcheck";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.RESPONDENT_TELEGRAM_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? undefined;
  const includeAll = url.searchParams.get("all") === "1";
  const strict = url.searchParams.get("strict") !== "0";

  const report = await getRespondentTelegramDeliveryHealth({
    date,
    includeNoDeliveryOnly: !includeAll,
  });

  const payload = {
    healthy: report.failedOrMissingLatest.length === 0,
    report,
  };

  if (strict && report.failedOrMissingLatest.length > 0) {
    return NextResponse.json(payload, { status: 500 });
  }

  return NextResponse.json(payload);
}
