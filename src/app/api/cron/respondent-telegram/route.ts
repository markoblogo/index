import { NextResponse } from "next/server";
import { sendRespondentTelegramNotifications } from "@/lib/respondent-telegram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret =
    process.env.RESPONDENT_TELEGRAM_CRON_SECRET ?? process.env.CRON_SECRET;

  if (secret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const trigger = url.searchParams.get("smoke") === "1" ? "smoke" : "scheduled";
  const result = await sendRespondentTelegramNotifications({ trigger });

  return NextResponse.json(result);
}
