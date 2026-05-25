import { NextResponse } from "next/server";
import {
  formatDateKyiv,
  importMn7rMonitorRespondentPrices,
} from "@/lib/mn7r-monitor-import";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret =
    process.env.MN7R_IMPORT_CRON_SECRET ?? process.env.CRON_SECRET;

  if (secret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? formatDateKyiv();
  const result = await importMn7rMonitorRespondentPrices(date);

  return NextResponse.json(result);
}
