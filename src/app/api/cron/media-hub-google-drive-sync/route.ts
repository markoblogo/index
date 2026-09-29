import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { syncGoogleDriveContextMaterials } from "@/lib/media-hub-google-drive";
import { isPlatformSite } from "@/lib/platform-site";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secrets = [process.env.MEDIA_HUB_CRON_SECRET, process.env.SPIKE_MEDIA_HUB_CRON_SECRET, process.env.CRON_SECRET];
  if (!secrets.some((value) => value) || !isCronRequestAuthorized(request, secrets)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isPlatformSite()) {
    return NextResponse.json({ status: "skipped", reason: "ssi_only_source" });
  }
  try {
    return NextResponse.json(await syncGoogleDriveContextMaterials());
  } catch (error) {
    console.error("SSI Google Drive Context sync failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Google Drive Context sync failed." }, { status: 502 });
  }
}
