import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { evaluateOperationalAlerts } from "@/lib/operational-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.OPS_ALERTS_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await evaluateOperationalAlerts();
  const hasCritical = alerts.some((alert) => alert.severity === "critical");

  return NextResponse.json(
    {
      ok: !hasCritical,
      alerts,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "no-store" },
      status: hasCritical ? 503 : 200,
    },
  );
}

