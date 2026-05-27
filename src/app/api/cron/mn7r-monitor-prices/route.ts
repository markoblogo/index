import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  formatDateKyiv,
  importMn7rMonitorRespondentPrices,
} from "@/lib/mn7r-monitor-import";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.MN7R_IMPORT_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? formatDateKyiv();
  const result = await importMn7rMonitorRespondentPrices(date);

  return NextResponse.json(result);
}
