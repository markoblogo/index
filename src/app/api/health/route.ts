import { NextResponse } from "next/server";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import {
  fetchUgaSpikeReadthrough,
  getUgaSpikeReadthroughSource,
  isUgaSpikeReadthroughEnabled,
} from "@/lib/uga-spike-readthrough";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isUgaSpikeReadthroughEnabled()) {
    try {
      const payload = await fetchUgaSpikeReadthrough("latest");
      return NextResponse.json(
        {
          ok: payload.data.length > 0,
          service: "uga-index",
          timestamp: new Date().toISOString(),
          mode: "spike_readthrough",
          source: getUgaSpikeReadthroughSource(),
          upstream: payload.data.length > 0 ? "ok" : "empty",
          database: "not_configured",
          databaseRequired: false,
          siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
        },
        {
          headers: { "Cache-Control": "no-store" },
          status: payload.data.length > 0 ? 200 : 503,
        },
      );
    } catch {
      return NextResponse.json(
        {
          ok: false,
          service: "uga-index",
          timestamp: new Date().toISOString(),
          mode: "spike_readthrough",
          source: getUgaSpikeReadthroughSource(),
          upstream: "unavailable",
          database: "not_configured",
          databaseRequired: false,
          siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
        },
        {
          headers: { "Cache-Control": "no-store" },
          status: 503,
        },
      );
    }
  }

  const databaseConfigured = hasDatabaseUrl();
  const databaseRequired = !allowMockFallback();
  let database: "configured" | "ok" | "unavailable" | "not_configured" =
    databaseConfigured ? "configured" : "not_configured";

  if (databaseConfigured) {
    try {
      await db.$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "unavailable";
    }
  }

  return NextResponse.json(
    {
      ok: database !== "unavailable" && (databaseConfigured || !databaseRequired),
      service: "uga-index",
      timestamp: new Date().toISOString(),
      database,
      databaseRequired,
      siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status:
        database === "unavailable" || (databaseRequired && !databaseConfigured)
          ? 503
          : 200,
    },
  );
}
