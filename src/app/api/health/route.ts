import { NextResponse } from "next/server";
import { hasConfiguredCronSecret } from "@/lib/cron-auth";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { getMarketPack, getMissingRequiredEnv } from "@/lib/market-pack";
import { evaluateOperationalAlerts } from "@/lib/operational-alerts";
import { getTenantContext, isProductionRuntime } from "@1d3x/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenantContext = getTenantContext();
  const marketPack = getMarketPack(tenantContext);
  const databaseConfigured = hasDatabaseUrl();
  const databaseRequired = !allowMockFallback();
  const missingRequiredEnv = isProductionRuntime(tenantContext)
    ? getMissingRequiredEnv(marketPack)
    : [];
  const cronSecretConfigured = hasConfiguredCronSecret([process.env.CRON_SECRET]);
  const operationalAlerts = await evaluateOperationalAlerts();
  const hasCriticalAlert = operationalAlerts.some(
    (alert) => alert.severity === "critical",
  );
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
      ok:
        database !== "unavailable" &&
        (databaseConfigured || !databaseRequired) &&
        missingRequiredEnv.length === 0 &&
        !hasCriticalAlert,
      service: "index-platform",
      timestamp: new Date().toISOString(),
      tenant: tenantContext,
      marketPack: {
        brandName: marketPack.brandName,
        integrations: marketPack.integrations,
        publicSiteUrl: marketPack.publicSiteUrl,
      },
      database,
      databaseRequired,
      cronSecretConfigured,
      missingRequiredEnv,
      providers: getProviderReadiness(marketPack.integrations),
      operationalAlerts,
      siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status:
        database === "unavailable" ||
        (databaseRequired && !databaseConfigured) ||
        missingRequiredEnv.length > 0 ||
        hasCriticalAlert
          ? 503
          : 200,
    },
  );
}

function getProviderReadiness(integrations: readonly string[]) {
  return Object.fromEntries(
    integrations.map((integration) => [integration, isProviderConfigured(integration)]),
  );
}

function isProviderConfigured(integration: string) {
  if (integration === "resend") {
    return Boolean(process.env.RESEND_API_KEY);
  }

  if (integration === "mn7r") {
    return Boolean(process.env.MN7R_API_URL && process.env.MN7R_INDEX_EXPORT_TOKEN);
  }

  if (integration === "telegram") {
    return Boolean(process.env.SPIKE_TELEGRAM_BOT_TOKEN);
  }

  if (integration === "nbu-fx") {
    return true;
  }

  return false;
}
