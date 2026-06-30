import { NextResponse } from "next/server";
import { getBasketSources } from "@/lib/basket/data";
import { BASKET_SOURCE_REGISTRY } from "@/lib/basket-monitoring/source-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      data: {
        sources: getBasketSources(),
        monitoring: BASKET_SOURCE_REGISTRY,
      },
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  );
}
