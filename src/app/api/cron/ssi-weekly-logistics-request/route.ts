import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { requestSsiWeeklyLogisticsMaterials } from "@/lib/ssi-weekly-logistics-control";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secrets = [
    process.env.SSI_WEEKLY_LOGISTICS_CRON_SECRET,
    process.env.SPIKE_WEEKLY_REPORT_CRON_SECRET,
    process.env.CRON_SECRET,
  ];
  if (!isCronRequestAuthorized(request, secrets)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const result = await requestSsiWeeklyLogisticsMaterials(date);
  return NextResponse.json({ result, triggeredAt: new Date().toISOString() });
}
