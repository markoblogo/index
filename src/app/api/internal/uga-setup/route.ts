import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { provisionUgaOperations } from "@/lib/uga-operations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.RESPONDENT_TELEGRAM_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sendEmails = url.searchParams.get("sendEmails") === "1";
  const exposeTemporaryPasswords = url.searchParams.get("exposeTemporaryPasswords") === "1";

  try {
    const result = await provisionUgaOperations({ sendEmails });

    return NextResponse.json({
      ...result,
      credentials: exposeTemporaryPasswords
        ? result.credentials
        : result.credentials.map(({ temporaryPassword, ...credential }) => credential),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "UGA setup failed",
      },
      { status: 500 },
    );
  }
}
