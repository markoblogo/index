import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { syncUgaDemoIndicesFromSpike } from "@/lib/uga-spike-demo-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.UGA_SPIKE_DEMO_SYNC_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.UGA_SPIKE_DEMO_SYNC_ENABLED !== "enabled") {
    return NextResponse.json({
      copied: 0,
      skippedReason: "uga_spike_demo_sync_disabled",
    });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "latest" ? "latest" : "history";
  const sourceBaseUrl =
    url.searchParams.get("source") ??
    process.env.UGA_SPIKE_PUBLIC_API_BASE ??
    "https://spike.1d3x.com";
  const result = await syncUgaDemoIndicesFromSpike({ mode, sourceBaseUrl });

  revalidatePath("/uk");
  revalidatePath("/en");
  revalidatePath("/uk/analytics");
  revalidatePath("/en/analytics");
  revalidatePath("/api/public/latest");
  revalidatePath("/api/public/history");

  return NextResponse.json(result);
}
