import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import {
  formatDateKyiv,
  getMn7rMonitorImportAudit,
  importMn7rMonitorRespondentPrices,
  isKyivMn7rImportHour,
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
  const force =
    url.searchParams.get("force") === "1" ||
    url.pathname !== "/api/cron/mn7r-monitor-prices";

  if (!force && !isKyivMn7rImportHour()) {
    return NextResponse.json({
      date: formatDateKyiv(),
      imported: 0,
      skipped: 0,
      skippedReason: "outside_kyiv_17_import_window",
    });
  }

  const date = url.searchParams.get("date") ?? formatDateKyiv();
  const result = await importMn7rMonitorRespondentPrices(date);
  if (url.searchParams.get("diagnostics") === "1") {
    const audit = await getMn7rMonitorImportAudit(date);

    return NextResponse.json({
      ...result,
      diagnostics: audit?.diagnostics ?? [],
      generatedAt: audit?.generatedAt ?? null,
      rawCount: audit?.rawCount ?? null,
    });
  }

  return NextResponse.json(result);
}
