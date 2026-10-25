import "server-only";
import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { syncGoogleDriveContextMaterials } from "@/lib/media-hub-google-drive";
import { getMediaHubReport, publishMediaHubSnapshotReport, sendMediaHubReportTelegram } from "@/lib/media-hub-publication-scheduler";
import { isPlatformSite } from "@/lib/platform-site";
import { isSsiPeriodicPublicationHeld } from "@/lib/ssi-periodic-publication-hold";
import { getSsiWeeklyLogisticsPublicationBlock } from "@/lib/ssi-weekly-logistics-control";
import { runSsiWeeklyPhase, type SsiWeeklyPhase } from "@/lib/ssi-weekly-workflow";

export function runScheduledSsiWeeklyPhase(phase: SsiWeeklyPhase, now = new Date()) {
  if (process.env.SSI_WEEKLY_PAIRED_DRAFTS === "1" && !isPlatformSite() && getActiveIndexConfig().id === "spike-ua") return Promise.resolve({ status: "skipped", periodEndDate: undefined, skippedReason: "mac_owned_paired_draft_workflow" });
  return runSsiWeeklyPhase(phase, now, {
    held: isSsiPeriodicPublicationHeld("spike-ua", "weekly"),
    ssiTenant: !isPlatformSite() && getActiveIndexConfig().id === "spike-ua",
    sync: () => syncGoogleDriveContextMaterials(),
    gate: (periodEndDate) => getSsiWeeklyLogisticsPublicationBlock({ periodEndDate, publishTelegram: false }),
    report: (date) => getMediaHubReport("weekly", date, "spike-ua"),
    publish: (date) => publishMediaHubSnapshotReport("weekly", date),
    send: (date) => sendMediaHubReportTelegram("weekly", date, { audience: "spike", locale: "uk" }),
  });
}

export async function handleSsiWeeklyCron(request: Request, phase: SsiWeeklyPhase) {
  const secrets = [process.env.MEDIA_HUB_CRON_SECRET, process.env.SPIKE_MEDIA_HUB_CRON_SECRET, process.env.SPIKE_WEEKLY_REPORT_CRON_SECRET, process.env.CRON_SECRET];
  if (!isCronRequestAuthorized(request, secrets)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runScheduledSsiWeeklyPhase(phase);
    if (result.status === "blocked" || result.status === "failed" || result.status === "needs_review" || result.status === "blocked_missing_required_materials") {
      console.warn("SSI weekly workflow requires attention", { phase, periodEndDate: result.periodEndDate, status: result.status, reason: result.skippedReason });
    }
    return NextResponse.json(result);
  } catch {
    console.error("SSI weekly workflow failed", { phase });
    return NextResponse.json({ status: "failed", error: "SSI weekly workflow failed." }, { status: 502 });
  }
}
