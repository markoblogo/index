import { handleRespondentTelegramCron } from "@/lib/respondent-telegram-cron-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRespondentTelegramCron(request);
}
