import { NextResponse } from "next/server";
import { ensureSpikeAdminUsers } from "@/lib/spike-admin-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret =
    process.env.SPIKE_ADMIN_INVITE_SECRET ?? process.env.CRON_SECRET;

  if (secret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const result = await ensureSpikeAdminUsers({
    regenerateTemporaryPasswords: url.searchParams.get("force") === "1",
    sendInvites: true,
  });

  return NextResponse.json(result);
}
