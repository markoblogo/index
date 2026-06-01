import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { getMarketPack, getMissingRequiredEnv } from "@/lib/market-pack";
import { getTenantContext, isProductionRuntime } from "@/lib/tenant-context";
import { tenantScopedWhere } from "@1d3x/data";
import { getActiveIndexConfig } from "@/lib/index-platform";

export type OperationalAlert = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

const MIN_RESPONDENTS_BY_TENANT: Record<string, number> = {
  "uga-ua": 5,
  "spike-ua": 5,
};

export async function evaluateOperationalAlerts(): Promise<OperationalAlert[]> {
  const context = getTenantContext();
  const pack = getMarketPack(context);
  const alerts: OperationalAlert[] = [];
  const missingRequiredEnv = isProductionRuntime(context)
    ? getMissingRequiredEnv(pack)
    : [];

  if (missingRequiredEnv.length > 0) {
    alerts.push({
      code: "missing_required_env",
      severity: "critical",
      message: `Missing required env: ${missingRequiredEnv.join(", ")}`,
    });
  }

  if (isProductionRuntime(context) && !process.env.CRON_SECRET) {
    alerts.push({
      code: "cron_secret_missing",
      severity: "critical",
      message: "CRON_SECRET is required for production cron execution.",
    });
  }

  if (!hasDatabaseUrl()) {
    alerts.push({
      code: "database_url_missing",
      severity: allowMockFallback() ? "warning" : "critical",
      message: "DATABASE_URL is not configured.",
    });
    return alerts;
  }

  if (context.tenantId !== "1d3x") {
    const tenantScope = tenantScopedWhere(context);
    const [respondentCount, latestPublished] = await Promise.all([
      db.respondent.count({
        where: { ...tenantScope, active: true, status: "active" },
      }),
      db.publishedIndex.findFirst({
        orderBy: { tradeDate: "desc" },
        where: { ...tenantScope, status: "published", locked: true },
      }),
    ]);
    const minimumRespondents =
      MIN_RESPONDENTS_BY_TENANT[context.tenantId] ?? 5;

    if (respondentCount < minimumRespondents) {
      alerts.push({
        code: "insufficient_respondents",
        severity: "warning",
        message: `Active respondent count is ${respondentCount}; minimum target is ${minimumRespondents}.`,
      });
    }

    if (!latestPublished) {
      alerts.push({
        code: "no_published_index",
        severity: "warning",
        message: `No locked published values found for ${getActiveIndexConfig().name}.`,
      });
    } else if (daysBetween(latestPublished.tradeDate, new Date()) > 3) {
      alerts.push({
        code: "stale_public_values",
        severity: "warning",
        message: `Latest published trade date is ${latestPublished.tradeDate.toISOString().slice(0, 10)}.`,
      });
    }
  }

  return alerts;
}

function daysBetween(first: Date, second: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(
    (Date.UTC(second.getUTCFullYear(), second.getUTCMonth(), second.getUTCDate()) -
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate())) /
      msPerDay,
  );
}

