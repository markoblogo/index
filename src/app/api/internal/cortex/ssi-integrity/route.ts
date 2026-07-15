import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import { getCortexSsiIntegrityDailyReport } from "@/lib/cortex-ssi-integrity";
import { getActiveIndexConfig } from "@/lib/index-platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isBearerTokenAuthorized(request, [process.env.CORTEX_INTERNAL_API_SECRET, process.env.CRON_SECRET])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must use YYYY-MM-DD" }, { status: 400 });
  }

  const report = await getCortexSsiIntegrityDailyReport({
    date,
    tenantId: url.searchParams.get("tenantId") ?? getActiveIndexConfig().id,
  });
  return NextResponse.json({ report, shadowOnly: true });
}
