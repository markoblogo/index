import { NextResponse } from "next/server";
import { sendRespondentSurveyEmails } from "@/lib/respondent-email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret =
    process.env.RESPONDENT_EMAIL_CRON_SECRET ?? process.env.CRON_SECRET;

  if (secret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await sendRespondentSurveyEmails("scheduled");

  return NextResponse.json({
    delivered: result.delivered,
    skippedReason: result.skippedReason,
  });
}
