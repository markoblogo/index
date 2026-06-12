import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getEverydayArchitectureSummary, getEverydayIndexDashboard } from "@/lib/everyday-index/dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const headerStore = await headers();
  const country = url.searchParams.get("country");
  const geoCountry =
    headerStore.get("x-vercel-ip-country") ??
    headerStore.get("cf-ipcountry") ??
    headerStore.get("cloudfront-viewer-country") ??
    headerStore.get("x-country") ??
    headerStore.get("x-country-code");
  const data = await getEverydayIndexDashboard({
    country,
    geoCountry,
  });

  return NextResponse.json(
    {
      data,
      architecture: getEverydayArchitectureSummary(),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
