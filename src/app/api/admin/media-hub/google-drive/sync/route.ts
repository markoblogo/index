import { NextResponse } from "next/server";
import { getCurrentDemoUser } from "@/lib/demo-auth";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getGoogleDriveSyncStatus, syncGoogleDriveContextMaterials } from "@/lib/media-hub-google-drive";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorized() {
  const user = await getCurrentDemoUser();
  return user?.role === "admin" && user.passwordSetupStatus === "active" && getActiveIndexConfig().id === "spike-ua";
}

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getGoogleDriveSyncStatus(), { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  try {
    return NextResponse.json(await syncGoogleDriveContextMaterials());
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("SSI Google Drive admin sync failed", message);
    return NextResponse.json({ error: /^(Google Drive|Google returned|Stored Google Drive)/.test(message)
      ? message : "Google Drive sync failed. Please retry or reconnect the account." }, { status: 502 });
  }
}
