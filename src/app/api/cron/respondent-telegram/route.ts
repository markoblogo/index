import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { sendRespondentTelegramNotifications } from "@/lib/respondent-telegram";

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
  const requestedLevel = parseReminderLevel(url.searchParams.get("level"));
  const trigger =
    url.searchParams.get("smoke") === "1"
      ? "smoke"
      : requestedLevel
        ? "manual"
        : "scheduled";
  const result = await sendRespondentTelegramNotifications({
    reminderLevel: requestedLevel,
    trigger,
  });

  return NextResponse.json(result);
}

function parseReminderLevel(value: string | null) {
  if (value === "initial" || value === "reminder_17" || value === "final_18") {
    return value;
  }

  return undefined;
}
