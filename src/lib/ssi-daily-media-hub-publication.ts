import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getMediaHubReport, publishMediaHubSnapshotReport, sendMediaHubReportTelegram } from "@/lib/media-hub-publication-scheduler";
import { stringifyReportJson } from "@/lib/report-json";

export async function ensureDailyMediaHubPublication(date: string) {
  try {
    const existing = await getMediaHubReport("daily", date, "spike-ua");
    if (existing?.telegramSentAt) return { status: "skipped" as const, skippedReason: "already_sent" as const };
    const report = await publishMediaHubSnapshotReport("daily", date);
    const telegram = await sendMediaHubReportTelegram("daily", date, {
      audience: "spike",
      locale: "uk",
      skipIndexFreshnessCheck: true,
    });
    const blockedReason = "skippedReason" in telegram ? telegram.skippedReason : undefined;
    if (["already_sent", "delivery_in_progress", "telegram_delivery_needs_review", "daily_index_not_current"].includes(blockedReason ?? "")) return { report, status: "skipped" as const, telegram };
    if (
      report.status === "needs_review" ||
      telegram.status === "failed" ||
      (telegram.status === "skipped" && telegram.skippedReason !== "already_sent")
    ) {
      const fallback = await publishSsiDailyFallbackReport(
        date,
        `media_hub_report_${report.status}_telegram_${telegram.status}`,
      );
      return {
        fallback,
        report,
        status: "fallback_published" as const,
        telegram,
      };
    }
    return { report, status: "published" as const, telegram };
  } catch (error) {
    const fallback = await publishSsiDailyFallbackReport(date, safeErrorMessage(error));
    return {
      error: safeErrorMessage(error),
      fallback,
      status: "fallback_published" as const,
    };
  }
}

async function publishSsiDailyFallbackReport(date: string, sourceError: string) {
  const activeIndex = getActiveIndexConfig();
  const existing = await getMediaHubReport("daily", date, activeIndex.id);
  if (existing?.telegramSentAt || (Array.isArray(existing?.telegramMessageIds) && existing.telegramMessageIds.includes(null))) {
    return { stored: false, rows: 0, telegram: { status: "skipped" as const, skippedReason: "already_sent_or_uncertain" } };
  }
  const tradeDate = new Date(`${date}T00:00:00.000Z`);
  const rows = await db.publishedIndex.findMany({
    include: {
      basket: true,
      commodity: true,
      deliveryBasis: true,
    },
    orderBy: [{ commodity: { sortOrder: "asc" } }, { commodity: { nameUk: "asc" } }],
    where: {
      locked: true,
      status: "published",
      tradeDate,
    },
  });
  const title = `SSI daily index update - ${date}`;
  const lines = rows
    .slice(0, 18)
    .map((row) => {
      const value = row.valueUsdPerMt.toNumber().toFixed(1);
      const change =
        row.changeAbsUsdPerMt === null
          ? ""
          : ` (${formatSignedNumber(row.changeAbsUsdPerMt.toNumber())} USD/t)`;
      return `- ${row.commodity.nameUk}: ${value} USD/t${change}`;
    });
  const summary =
    lines.length > 0
      ? lines
      : ["- Published SSI index rows were not found for the selected date."];
  const contentJson = {
    generatedAt: new Date().toISOString(),
    kind: "daily",
    periodEndDate: date,
    periodStartDate: date,
    summary,
    title,
    totals: {
      items: rows.length,
      sources: 1,
      windows: 1,
    },
    windows: [
      {
        feed: [],
        itemCount: rows.length,
        label: "Daily",
        progressLabel: "published",
        sourceCount: 1,
        summaryBody: summary,
        summaryTitle: "Published SSI index values",
        topSources: [],
        topTopics: [],
        window: "day",
      },
    ],
  };
  const contentHash = createHash("sha256")
    .update(stringifyReportJson(contentJson))
    .digest("hex");

  let stored = false;
  try {
    const affected = await db.$executeRawUnsafe(
      `
        INSERT INTO "MediaHubReport" (
          "id",
          "tenantId",
          "kind",
          "periodStart",
          "periodEnd",
          "title",
          "status",
          "contentHash",
          "contentJson",
          "sourceDigest",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, 'daily', $3::date, $3::date, $4, 'published', $5, $6::jsonb, $7::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("tenantId", "kind", "periodEnd")
        DO UPDATE SET
          "title" = EXCLUDED."title",
          "status" = 'published',
          "contentHash" = EXCLUDED."contentHash",
          "contentJson" = EXCLUDED."contentJson",
          "sourceDigest" = EXCLUDED."sourceDigest",
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "MediaHubReport"."telegramSentAt" IS NULL
          AND "MediaHubReport"."telegramDeliveryClaimedAt" IS NULL
      `,
      randomUUID(),
      activeIndex.id,
      date,
      title,
      contentHash,
      JSON.stringify(contentJson),
      stringifyReportJson({ fallback: true, sourceError }),
    );
    stored = affected > 0;
  } catch (storageError) {
    console.warn("SSI daily fallback Context storage failed.", safeErrorMessage(storageError));
  }

  if (!stored) return { rows: rows.length, stored, telegram: { status: "skipped" as const, skippedReason: "fallback_not_saved_or_claimed" } };
  let telegram: Awaited<ReturnType<typeof sendMediaHubReportTelegram>> | { status: "failed"; error: string };
  try {
    telegram = await sendMediaHubReportTelegram("daily", date, { audience: "spike", locale: "uk" });
  } catch (telegramError) {
    telegram = {
      error: safeErrorMessage(telegramError),
      status: "failed" as const,
    };
  }
  return { rows: rows.length, stored, telegram };
}

function formatSignedNumber(value: number) { return `${value > 0 ? "+" : ""}${value.toFixed(1)}`; }
function safeErrorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
