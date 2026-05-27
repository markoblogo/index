import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { ensureSpikeAdminUsers } from "@/lib/spike-admin-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.SPIKE_ADMIN_INVITE_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const result = await ensureSpikeAdminUsers({
    regenerateTemporaryPasswords: url.searchParams.get("force") === "1",
    sendInvites: true,
  });

  return NextResponse.json(result);
}
