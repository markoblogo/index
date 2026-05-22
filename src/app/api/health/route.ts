import { NextResponse } from "next/server";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
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
