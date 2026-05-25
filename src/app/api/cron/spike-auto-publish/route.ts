import { NextResponse } from "next/server";
import {
  autoPublishSpikeDailyIndices,
  formatDateKyiv,
  isKyivAutoPublishHour,
} from "@/lib/auto-publish";
import { importMn7rMonitorRespondentPrices } from "@/lib/mn7r-monitor-import";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret =
    process.env.SPIKE_AUTO_PUBLISH_CRON_SECRET ?? process.env.CRON_SECRET;

  if (secret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  if (!force && !isKyivAutoPublishHour()) {
    return NextResponse.json({
      date: formatDateKyiv(),
      published: 0,
      skippedReason: "outside_kyiv_19_publish_window",
    });
  }

  const date = url.searchParams.get("date") ?? formatDateKyiv();
  const shouldImportMonitor = url.searchParams.get("import") !== "0";
  let monitorImport:
    | Awaited<ReturnType<typeof importMn7rMonitorRespondentPrices>>
    | null = null;
  let monitorImportError: string | null = null;

  if (shouldImportMonitor) {
    try {
      monitorImport = await importMn7rMonitorRespondentPrices(date);
    } catch (error) {
      monitorImportError =
        error instanceof Error ? error.message : "Unknown MN7R import error";
    }
  }

  const result = await autoPublishSpikeDailyIndices(date);

  return NextResponse.json({
    ...result,
    monitorImport,
    monitorImportError,
  });
}
