import { NextResponse } from "next/server";
import { normalizeBasketMarket } from "@/lib/basket/data";
import { getBasketLatestDbFirst } from "@/lib/basket/server-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = normalizeBasketMarket(searchParams.get("market"));

  return NextResponse.json(
    {
      data: await getBasketLatestDbFirst(market),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
