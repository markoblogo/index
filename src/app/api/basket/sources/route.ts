import { NextResponse } from "next/server";
import { BASKET_SOURCE_REGISTRY } from "@/lib/basket-monitoring/source-registry";
import { getBasketSourcesDbFirst } from "@/lib/basket/server-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      data: {
        sources: await getBasketSourcesDbFirst(),
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
