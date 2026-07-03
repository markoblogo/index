import { NextResponse } from "next/server";
import { timingSafeEqualString } from "@/lib/cron-auth";
import { handleRespondentTelegramStart } from "@/lib/respondent-onboarding";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_RESPONDENT_WEBHOOK_SECRET;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");

  if (!secret || !timingSafeEqualString(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const result = await handleRespondentTelegramStart(payload);

  return NextResponse.json(result);
}
