import { NextResponse } from "next/server";
import { getFxRates } from "@/lib/fx-rates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fxRates = await getFxRates(searchParams.get("date") ?? undefined);

  return NextResponse.json(
    {
      data: fxRates,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    },
  );
}
