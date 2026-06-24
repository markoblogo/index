import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  sendRespondentTelegramNotifications,
  type TelegramReminderLevel,
  type TelegramTrigger,
} from "@/lib/respondent-telegram";

type RespondentTelegramCronOptions = {
  reminderLevel?: TelegramReminderLevel;
  trigger?: TelegramTrigger;
};

export async function handleRespondentTelegramCron(
  request: Request,
  options: RespondentTelegramCronOptions = {},
) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.RESPONDENT_TELEGRAM_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedLevel =
    options.reminderLevel ?? parseReminderLevel(url.searchParams.get("level"));
  const explicitTrigger = url.searchParams.get("trigger");
  const trigger =
    options.trigger ??
    (url.searchParams.get("smoke") === "1"
      ? "smoke"
      : explicitTrigger === "manual"
        ? "manual"
        : "scheduled");
  const result = await sendRespondentTelegramNotifications({
    reminderLevel: requestedLevel,
    respondentId: url.searchParams.get("respondentId") ?? undefined,
    trigger,
  });
  console.info("respondent_telegram_cron_result", {
    delivered: result.delivered.length,
    reminderLevel: requestedLevel ?? null,
    skippedReason: result.skippedReason,
    statuses: summarizeStatuses(result.delivered),
    trigger,
  });

  return NextResponse.json({
    ...result,
    reminderLevel: requestedLevel ?? null,
    trigger,
  });
}

function parseReminderLevel(value: string | null): TelegramReminderLevel | undefined {
  if (value === "initial" || value === "reminder_18" || value === "final_19") {
    return value;
  }
  if (value === "reminder_17") return "reminder_18";
  if (value === "final_18") return "final_19";

  return undefined;
}

function summarizeStatuses(delivered: Array<{ status: string }>) {
  return delivered.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}
