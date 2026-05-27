import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { sendRespondentSurveyEmails } from "@/lib/respondent-email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.RESPONDENT_EMAIL_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendRespondentSurveyEmails("scheduled");

  return NextResponse.json({
    delivered: result.delivered,
    skippedReason: result.skippedReason,
  });
}
