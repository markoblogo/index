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
  const explicitTrigger = url.searchParams.get("trigger");
  const trigger = url.searchParams.get("smoke") === "1"
    ? "smoke"
    : explicitTrigger === "manual"
      ? "manual"
      : requestedLevel
        ? "scheduled"
        : "scheduled";
  const result = await sendRespondentTelegramNotifications({
    reminderLevel: requestedLevel,
    respondentId: url.searchParams.get("respondentId") ?? undefined,
    trigger,
  });

  return NextResponse.json(result);
}

function parseReminderLevel(value: string | null) {
  if (value === "initial" || value === "reminder_18" || value === "final_19") {
    return value;
  }
  if (value === "reminder_17") return "reminder_18";
  if (value === "final_18") return "final_19";

  return undefined;
}
