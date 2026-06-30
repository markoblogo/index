import { NextResponse } from "next/server";
import { getBasketMonthlyReport } from "@/lib/basket/data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      data: getBasketMonthlyReport(),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  );
}
