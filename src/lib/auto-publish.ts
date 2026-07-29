import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { calculateIndexValue } from "@/lib/index-calculation";
import { generateAndStoreDailyAiMarketBriefs } from "@/lib/ai-market-brief-lazy";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { computePublishedChange } from "@/lib/index-publish";
import { persistCortexSsiIntegrityObservation } from "@/lib/cortex-ssi-integrity";
import {
  normalizeMediaHubTelegramChatId,
  publishMediaHubSnapshotReport,
  sendMediaHubReportTelegram,
} from "@/lib/media-hub-publication-scheduler";
import { syncIndexPositionDirectory } from "@/lib/position-directory-sync";
import {
  getConfiguredDeliveryBasisCodes,
  getDeliveryBasketCodeForCommodityCode,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";

export type AutoPublishSubmission = {
  id: string;
  commodityId: string;
  deliveryBasisId: string;
  price: number;
  respondentId: string;
  source: "admin" | "respondent" | "spike";
  status: string;
  updatedAt: Date;
};

const TELEGRAM_DELIVERY_TIMEOUT_MS = 15_000;

export type AutoPublishPlanItem = {
  carriedForwardFromPreviousPublished?: boolean;
  excludedSubmissions: Array<AutoPublishSubmission & {
    deviationPct: number;
    exclusionReason: "previous_day_5pct_deviation" | "outside_2pct_median_band";
  }>;
  latestUpdatedAt: Date;
  median: number;
  rawCount: number;
  rawValue: number;
  selectedSubmissions: AutoPublishSubmission[];
  usedCount: number;
  value: number;
};

export type AutoPublishResult = {
  aiBrief?: Awaited<ReturnType<typeof generateAndStoreDailyAiMarketBriefs>> | null;
  date: string;
  inputDiagnostics?: SsiPublishInputDiagnostics;
  mediaHub?: Awaited<ReturnType<typeof ensureDailyMediaHubPublication>> | null;
  published: number;
  receipt?: SsiPublishSiteReceipt;
  skippedReason: string | null;
};

export type SsiPublishSiteReceipt = {
  expectedPositions: number;
  missingPositionKeys: string[];
  status: "current" | "missing";
};

export type SsiPublishInputDiagnostics = {
  eligibleForCalculation: number;
  inactiveOrNonActiveRespondent: number;
  nonPublishableStatus: number;
  respondentDrafts: number;
  spikeSource: number;
  totalForDateAndConfiguredBases: number;
};

export async function autoPublishSpikeDailyIndices(
  date = formatDateKyiv(),
  options: {
    existingPublishedOnly?: boolean;
    generateAiBrief?: boolean;
    publishMediaHub?: boolean;
    replaceExisting?: boolean;
  } = {},
): Promise<AutoPublishResult> {
  const activeIndex = getActiveIndexConfig();

  if (activeIndex.id !== "spike-ua") {
    return { date, published: 0, skippedReason: "non_spike_tenant" };
  }

  if (!hasDatabaseUrl()) {
    return { date, published: 0, skippedReason: "database_not_configured" };
  }

  await syncIndexPositionDirectory(activeIndex);

  const tradeDate = dateToUtcDate(date);
  const basisCodes = getConfiguredDeliveryBasisCodes(activeIndex);
  const [bases, baskets, dbCommodities] =
    await Promise.all([
      db.deliveryBasis.findMany({ where: { code: { in: basisCodes } } }),
      db.basket.findMany({
        where: {
          code: { in: activeIndex.deliveryBases.map((basis) => basis.basketCode) },
        },
      }),
      db.commodity.findMany({
        orderBy: { sortOrder: "asc" },
        where: { status: "published" },
      }),
    ]);

  const basisByCode = new Map(bases.map((basis) => [basis.code, basis]));
  const basketByCode = new Map(baskets.map((basket) => [basket.code, basket]));
  const basisByCommodityId = new Map(
    dbCommodities
      .map((commodity) => {
        const basis = basisByCode.get(
          getDeliveryBasisConfigForCommodityCode(commodity.code, activeIndex).code,
        );

        return basis ? ([commodity.id, basis] as const) : null;
      })
      .filter((entry): entry is readonly [string, (typeof bases)[number]] =>
        Boolean(entry),
      ),
  );
  const basketByCommodityId = new Map(
    dbCommodities
      .map((commodity) => {
        const basket = basketByCode.get(
          getDeliveryBasketCodeForCommodityCode(commodity.code, activeIndex),
        );

        return basket ? ([commodity.id, basket] as const) : null;
      })
      .filter((entry): entry is readonly [string, (typeof baskets)[number]] =>
        Boolean(entry),
      ),
  );
  const basisIds = [...new Set([...basisByCommodityId.values()].map((basis) => basis.id))];
  const basketIds = [
    ...new Set([...basketByCommodityId.values()].map((basket) => basket.id)),
  ];
  const expectedPositions = dbCommodities.flatMap((commodity) => {
    const basis = basisByCommodityId.get(commodity.id);
    const basket = basketByCommodityId.get(commodity.id);
    return basis && basket
      ? [{ basketId: basket.id, commodityId: commodity.id, deliveryBasisId: basis.id }]
      : [];
  });
  if (basisIds.length === 0 || basketByCommodityId.size === 0) {
    return { date, published: 0, skippedReason: "missing_basis_or_basket" };
  }

  const existingPublishedRows = await db.publishedIndex.findMany({
    select: { commodityId: true },
    where: {
      basketId: { in: basketIds },
      deliveryBasisId: { in: basisIds },
      locked: true,
      status: "published",
      tradeDate,
    },
  });
  const existingPublishedCount = existingPublishedRows.length;
  const existingPublishedCommodityIds = new Set(
    existingPublishedRows.map((row) => row.commodityId),
  );

  const allSubmissions = await db.priceSubmission.findMany({
    where: {
      deliveryBasisId: { in: basisIds },
      tradeDate,
    },
    include: {
      respondent: {
        select: { active: true, status: true },
      },
    },
  });
  const publishableStatuses = new Set(["draft", "submitted", "verified", "published"]);
  const submissions = allSubmissions.filter(
    (submission) =>
      submission.respondent.active &&
      submission.respondent.status === "active" &&
      publishableStatuses.has(submission.status),
  );
  const inputDiagnostics: SsiPublishInputDiagnostics = {
    respondentDrafts: allSubmissions.filter(
      (submission) => submission.status === "draft" && submission.source !== "admin",
    ).length,
    eligibleForCalculation: submissions.filter(
      (submission) =>
        submission.source !== "spike" &&
        submission.priceUsdPerMt.gt(0),
    ).length,
    inactiveOrNonActiveRespondent: allSubmissions.filter(
      (submission) => !submission.respondent.active || submission.respondent.status !== "active",
    ).length,
    nonPublishableStatus: allSubmissions.filter(
      (submission) => !publishableStatuses.has(submission.status),
    ).length,
    spikeSource: allSubmissions.filter((submission) => submission.source === "spike").length,
    totalForDateAndConfiguredBases: allSubmissions.length,
  };
  const withReceipt = async (result: AutoPublishResult): Promise<AutoPublishResult> => ({
    ...result,
    inputDiagnostics,
    receipt: await getSsiPublishSiteReceipt({
      date,
      expectedPositions,
      published: result.published,
      skippedReason: result.skippedReason,
    }),
  });

  if (options.existingPublishedOnly && existingPublishedCount === 0) {
    return withReceipt({ date, published: 0, skippedReason: "not_yet_published" });
  }
  const previousPublishedByCommodityId = await getPreviousPublishedValuesByCommodityId({
    basketIds,
    basisIds,
    tradeDate,
  });
  const plan = buildAutoPublishPlan({
    basisByCommodityId: new Map(
      [...basisByCommodityId.entries()].map(([commodityId, basis]) => [
        commodityId,
        basis.id,
      ]),
    ),
    date,
    previousPublishedByCommodityId,
    submissions: submissions.map((submission) => ({
      id: submission.id,
      commodityId: submission.commodityId,
      deliveryBasisId: submission.deliveryBasisId,
      price: submission.priceUsdPerMt.toNumber(),
      respondentId: submission.respondentId,
      source: submission.source,
      status: submission.status,
      updatedAt: submission.updatedAt,
    })),
  });

  if (plan.size === 0) {
    let mediaHub: AutoPublishResult["mediaHub"] = null;
    if (existingPublishedCount > 0 && options.publishMediaHub !== false) {
      mediaHub = await ensureDailyMediaHubPublication(date);
    }
    if (existingPublishedCount > 0) {
      revalidateSsiPublicIndexViews();
    }
    return withReceipt({
      date,
      mediaHub,
      published: 0,
      skippedReason: existingPublishedCount > 0 ? "already_published" : "no_submissions",
    });
  }

  const commodityIdsToPublish = selectAutoPublishCommodityIds({
    existingPublishedCommodityIds,
    plannedCommodityIds: [...plan.keys()],
    replaceExisting: Boolean(options.replaceExisting),
  });

  if (commodityIdsToPublish.length === 0) {
    let mediaHub: AutoPublishResult["mediaHub"] = null;
    if (options.publishMediaHub !== false) {
      mediaHub = await ensureDailyMediaHubPublication(date);
    }
    revalidateSsiPublicIndexViews();
    return withReceipt({ date, mediaHub, published: 0, skippedReason: "already_published" });
  }

  const commodityIdsToPublishSet = new Set(commodityIdsToPublish);
  const integritySnapshots: Array<{
    currentValue: number;
    positionKey: string;
    previousValue: number | null;
    snapshotDate?: string;
    storedChangeAbs: number | null;
  }> = [];

  let published = 0;

  if (options.replaceExisting) {
    await db.publishedIndex.updateMany({
      data: {
        locked: false,
        status: "draft",
      },
      where: {
        basketId: { in: basketIds },
        commodityId: { in: commodityIdsToPublish },
        deliveryBasisId: { in: basisIds },
        locked: true,
        status: "published",
        tradeDate,
      },
    });
  }

  for (const commodity of dbCommodities) {
    if (!commodityIdsToPublishSet.has(commodity.id)) {
      continue;
    }

    const planItem = plan.get(commodity.id);
    const basis = basisByCommodityId.get(commodity.id);
    const basket = basketByCommodityId.get(commodity.id);

    if (!planItem || !basis || !basket) {
      continue;
    }

    const previous = await db.publishedIndex.findFirst({
      where: {
        basketId: basket.id,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        locked: true,
        status: "published",
        tradeDate: { lt: tradeDate },
      },
      orderBy: { tradeDate: "desc" },
    });
    const previousCalculation = await db.indexCalculation.findUnique({
      where: {
        tradeDate_commodityId_deliveryBasisId_basketId: {
          basketId: basket.id,
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          tradeDate,
        },
      },
    });
    const nextVersion = (previousCalculation?.version ?? 0) + 1;
    const calculation = await db.indexCalculation.upsert({
      where: {
        tradeDate_commodityId_deliveryBasisId_basketId: {
          basketId: basket.id,
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          tradeDate,
        },
      },
      update: {
        calculatedAt: new Date(),
        medianUsdPerMt: new Prisma.Decimal(planItem.median),
        publicValueUsdPerMt: new Prisma.Decimal(planItem.value),
        rawCount: planItem.rawCount,
        status: "verified",
        usedCount: planItem.usedCount,
        valueUsdPerMt: new Prisma.Decimal(planItem.rawValue),
        version: nextVersion,
      },
      create: {
        basketId: basket.id,
        basketWeight: basket.weight,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        medianUsdPerMt: new Prisma.Decimal(planItem.median),
        publicValueUsdPerMt: new Prisma.Decimal(planItem.value),
        rawCount: planItem.rawCount,
        status: "verified",
        tradeDate,
        usedCount: planItem.usedCount,
        valueUsdPerMt: new Prisma.Decimal(planItem.rawValue),
        version: nextVersion,
      },
    });

    await db.indexCalculationItem.deleteMany({
      where: { calculationId: calculation.id },
    });
    await db.indexCalculationItem.createMany({
      data: [
        ...planItem.selectedSubmissions.map((submission) => ({
          calculationId: calculation.id,
          deviationPct: new Prisma.Decimal(0),
          included: true,
          priceSubmissionId: submission.id,
          priceUsdPerMt: new Prisma.Decimal(submission.price),
          respondentId: submission.respondentId,
        })),
        ...planItem.excludedSubmissions.map((submission) => ({
          calculationId: calculation.id,
          deviationPct: new Prisma.Decimal(submission.deviationPct),
          exclusionReason: submission.exclusionReason,
          included: false,
          priceSubmissionId: submission.id,
          priceUsdPerMt: new Prisma.Decimal(submission.price),
          respondentId: submission.respondentId,
        })),
      ],
    });

    const change = computePublishedChange(
      planItem.value,
      previous?.valueUsdPerMt.toNumber() ?? null,
      {
        displayRounding:
          getActiveIndexConfig().id === "spike-ua" ? "whole" : "one_decimal",
      },
    );
    const publishedData = {
      benchmarkBlendEnabled: false,
      calculatedValueUsdPerMt: new Prisma.Decimal(planItem.value),
      calculationId: calculation.id,
      changeAbsUsdPerMt:
        change.changeAbs === null ? null : new Prisma.Decimal(change.changeAbs),
      changePct:
        change.changePct === null ? null : new Prisma.Decimal(change.changePct),
      locked: true,
      status: "published" as const,
      valueUsdPerMt: new Prisma.Decimal(planItem.value),
    };
    const publishedIndex = await db.publishedIndex.upsert({
      where: {
        tradeDate_commodityId_deliveryBasisId_basketId: {
          basketId: basket.id,
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          tradeDate,
        },
      },
      update: publishedData,
      create: {
        ...publishedData,
        basketId: basket.id,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        tradeDate,
      },
    });

    await db.indexCalculation.update({
      where: { id: calculation.id },
      data: { status: "published" },
    });
    await db.auditLog.create({
      data: {
        action: "index.auto_published",
        afterJson: {
          calculationVersion: nextVersion,
          commodityId: commodity.id,
          rawCount: planItem.rawCount,
          tradeDate: date,
          usedCount: planItem.usedCount,
          valueUsdPerMt: planItem.value,
        },
        beforeJson: Prisma.JsonNull,
        entityId: publishedIndex.id,
        entityType: "PublishedIndex",
        summary: `Auto-published ${commodity.code} at ${planItem.value} USD/t for ${date}.`,
      },
    });
    integritySnapshots.push({
      currentValue: planItem.value,
      positionKey: `${commodity.id}:${basis.id}`,
      previousValue: previous?.valueUsdPerMt.toNumber() ?? null,
      snapshotDate: date,
      storedChangeAbs: change.changeAbs,
    });
    published += 1;
  }

  if (published > 0) {
    await persistCortexSsiIntegrityObservation({
      date,
      inputs: submissions.map((submission) => ({
        positionKey: `${submission.commodityId}:${submission.deliveryBasisId}`,
        price: submission.priceUsdPerMt.toNumber(),
        respondentId: submission.respondentId,
      })),
      snapshots: integritySnapshots,
      stage: "index_snapshot",
      tenantId: activeIndex.id,
    }).catch((error: unknown) => {
      console.warn("Skipping Cortex SSI index integrity observation.", safeErrorMessage(error));
    });
  }

  revalidateSsiPublicIndexViews();

  const aiBrief =
    published > 0 && options.generateAiBrief !== false
      ? await generateAndStoreDailyAiMarketBriefs({
          date,
          source: "auto_publish",
        })
      : null;

  let mediaHub: AutoPublishResult["mediaHub"] = null;
  if (published > 0 && options.publishMediaHub !== false) {
    mediaHub = await ensureDailyMediaHubPublication(date);
  }

  return withReceipt({
    aiBrief,
    date,
    mediaHub,
    published,
    skippedReason: published > 0 ? null : "no_publishable_positions",
  });
}

function revalidateSsiPublicIndexViews() {
  revalidatePath("/uk");
  revalidatePath("/en");
  revalidatePath("/uk/analytics");
  revalidatePath("/en/analytics");
  revalidatePath("/api/public/latest");
  revalidatePath("/api/public/history");
  revalidateTag("public-index-data", "max");
}

async function getSsiPublishSiteReceipt(input: {
  date: string;
  expectedPositions: Array<{
    basketId: string;
    commodityId: string;
    deliveryBasisId: string;
  }>;
  published: number;
  skippedReason: string | null;
}): Promise<SsiPublishSiteReceipt> {
  const expectedPositionKeys = input.expectedPositions.map(
    (position) => `${position.commodityId}:${position.deliveryBasisId}:${position.basketId}`,
  );
  const rows = input.expectedPositions.length === 0
    ? []
    : await db.publishedIndex.findMany({
      select: { basketId: true, commodityId: true, deliveryBasisId: true, tradeDate: true },
      where: {
        OR: input.expectedPositions.map((position) => ({
          basketId: position.basketId,
          commodityId: position.commodityId,
          deliveryBasisId: position.deliveryBasisId,
          locked: true,
          status: "published",
        })),
      },
      orderBy: { tradeDate: "desc" },
    });
  const latestDateByPosition = new Map<string, string>();
  for (const row of rows) {
    const key = `${row.commodityId}:${row.deliveryBasisId}:${row.basketId}`;
    if (!latestDateByPosition.has(key)) {
      latestDateByPosition.set(key, row.tradeDate.toISOString().slice(0, 10));
    }
  }
  const missingPositionKeys = expectedPositionKeys.filter(
    (key) => latestDateByPosition.get(key) !== input.date,
  );
  const receipt: SsiPublishSiteReceipt = {
    expectedPositions: expectedPositionKeys.length,
    missingPositionKeys,
    status: missingPositionKeys.length === 0 && expectedPositionKeys.length > 0
      ? "current"
      : "missing",
  };

  if (receipt.status === "missing") {
    const entityId = `spike-ua:${input.date}`;
    const existing = await db.auditLog.findFirst({
      select: { id: true },
      where: {
        action: "index.publish_site_missing_snapshot",
        entityId,
        entityType: "SsiPublishSiteReceipt",
      },
    });
    if (!existing) {
      await db.auditLog.create({
        data: {
          action: "index.publish_site_missing_snapshot",
          afterJson: {
            date: input.date,
            expectedPositions: receipt.expectedPositions,
            missingPositionKeys: receipt.missingPositionKeys,
            published: input.published,
            skippedReason: input.skippedReason,
          },
          entityId,
          entityType: "SsiPublishSiteReceipt",
          summary: `SSI publish-site did not create a current snapshot for ${input.date}.`,
        },
      });
    }
  }

  return receipt;
}

async function ensureDailyMediaHubPublication(date: string) {
  try {
    const report = await publishMediaHubSnapshotReport("daily", date);
    const telegram = await sendMediaHubReportTelegram("daily", date, {
      audience: "spike",
      locale: "uk",
      skipIndexFreshnessCheck: true,
    });
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
  const tradeDate = dateToUtcDate(date);
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
        summaryBody: summary.join("\n"),
        summaryTitle: "Published SSI index values",
        topSources: [],
        topTopics: [],
        window: "day",
      },
    ],
  };
  const contentHash = createHash("sha256")
    .update(JSON.stringify(contentJson))
    .digest("hex");

  let stored = false;
  try {
    await db.$executeRawUnsafe(
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
      `,
      randomUUID(),
      activeIndex.id,
      date,
      title,
      contentHash,
      JSON.stringify(contentJson),
      JSON.stringify({ fallback: true, sourceError }),
    );
    stored = true;
  } catch (storageError) {
    console.warn("SSI daily fallback Context storage failed.", safeErrorMessage(storageError));
  }

  let telegram: Awaited<ReturnType<typeof sendSsiFallbackTelegram>>;
  try {
    telegram = await sendSsiFallbackTelegram(date, summary);
  } catch (telegramError) {
    telegram = {
      error: safeErrorMessage(telegramError),
      status: "failed" as const,
    };
  }
  return { rows: rows.length, stored, telegram };
}

async function sendSsiFallbackTelegram(date: string, summary: string[]) {
  const botToken = firstNonEmpty([
    process.env.SPIKE_TELEGRAM_BOT_TOKEN,
    process.env.INDEX_TELEGRAM_BOT_TOKEN,
  ]);
  const chatId = firstNonEmpty([
    process.env.SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID,
    process.env.MEDIA_HUB_TELEGRAM_CHAT_ID,
    process.env.SPIKE_AI_TELEGRAM_CHAT_ID,
    process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID,
    process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID,
  ]);

  if (!botToken || !chatId) {
    return { reason: "telegram_not_configured", status: "skipped" as const };
  }

  const text = fitTelegramMessage(
    [
      `<b>Spike Spot Index daily update</b>`,
      escapeHtml(date),
      "",
      "<b>Published SSI index values</b>",
      ...summary.map(escapeHtml),
      "",
      "<i>Fallback Context digest based on published SSI index data. Not a trading recommendation.</i>",
      "",
      "<b>Spike Spot Index</b>",
      "https://spike.1d3x.com/",
    ].join("\n"),
  );
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: normalizeMediaHubTelegramChatId(chatId),
      disable_web_page_preview: true,
      parse_mode: "HTML",
      text,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }, TELEGRAM_DELIVERY_TIMEOUT_MS);

  if (!response.ok) {
    return {
      error: await response.text(),
      status: "failed" as const,
    };
  }

  const payload = (await response.json()) as { result?: { message_id?: number } };
  return {
    messageIds: payload.result?.message_id ? [payload.result.message_id] : [],
    status: "sent" as const,
  };
}

function fitTelegramMessage(text: string) {
  const maxLength = 3900;
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 120).trim()}\n\n<i>Report shortened to fit one Telegram message.</i>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatSignedNumber(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function firstNonEmpty(values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function buildAutoPublishPlan({
  basisByCommodityId,
  date = "auto-publish",
  previousPublishedByCommodityId = new Map(),
  submissions,
}: {
  basisByCommodityId: Map<string, string>;
  date?: string;
  previousPublishedByCommodityId?: Map<string, number>;
  submissions: AutoPublishSubmission[];
}): Map<string, AutoPublishPlanItem> {
  const selectedByCommodityAndRespondent = new Map<string, AutoPublishSubmission>();

  for (const submission of submissions) {
    const basisId = basisByCommodityId.get(submission.commodityId);

    if (
      !basisId ||
      submission.deliveryBasisId !== basisId ||
      submission.source === "spike" ||
      !Number.isFinite(submission.price) ||
      submission.price <= 0
    ) {
      continue;
    }

    const key = `${submission.commodityId}:${submission.respondentId}`;
    const current = selectedByCommodityAndRespondent.get(key);

    if (!current || shouldReplaceSubmission(current, submission)) {
      selectedByCommodityAndRespondent.set(key, submission);
    }
  }

  const byCommodity = new Map<string, AutoPublishSubmission[]>();

  for (const submission of selectedByCommodityAndRespondent.values()) {
    const current = byCommodity.get(submission.commodityId) ?? [];
    current.push(submission);
    byCommodity.set(submission.commodityId, current);
  }

  const planEntries = [...basisByCommodityId.keys()].map((commodityId): [string, AutoPublishPlanItem] | null => {
      const commoditySubmissions = byCommodity.get(commodityId) ?? [];
      const previousPublished = previousPublishedByCommodityId.get(commodityId) ?? null;
      const previousDayExcludedSubmissions = commoditySubmissions
        .filter((submission) => isAutoPublishPreviousDayOutlier(submission.price, previousPublished))
        .map((submission) => ({
          ...submission,
          deviationPct: getPreviousDayDeviationPct(submission.price, previousPublished),
          exclusionReason: "previous_day_5pct_deviation" as const,
        }));
      const candidateSubmissions = commoditySubmissions.filter(
        (submission) => !isAutoPublishPreviousDayOutlier(submission.price, previousPublished),
      );

      if (candidateSubmissions.length === 0) {
        return buildPreviousPublishedFallbackPlanEntry({
          commodityId,
          commoditySubmissions,
          date,
          previousDayExcludedSubmissions,
          previousPublished,
        });
      }
      const calculation = calculateIndexValue({
        calculationMethod: "median_all",
        date,
        commodityId,
        deliveryBasisId: basisByCommodityId.get(commodityId) ?? "",
        submissions: candidateSubmissions.map((submission) => ({
          respondentId: submission.respondentId,
          price: submission.price,
        })),
      });

      if (
        calculation.status !== "publishable" ||
        calculation.value === null ||
        calculation.rawValue === null ||
        calculation.median === null
      ) {
        return buildPreviousPublishedFallbackPlanEntry({
          commodityId,
          commoditySubmissions,
          date,
          previousDayExcludedSubmissions,
          previousPublished,
        });
      }

      const medianExcludedByRespondentId = new Map(
        calculation.excluded.map((excluded) => [excluded.respondentId, excluded]),
      );
      const selectedSubmissions = candidateSubmissions.filter(
        (submission) => !medianExcludedByRespondentId.has(submission.respondentId),
      );
      const medianExcludedSubmissions = candidateSubmissions.flatMap((submission) => {
        const excluded = medianExcludedByRespondentId.get(submission.respondentId);
        return excluded
          ? [{
              ...submission,
              deviationPct: excluded.deviationPct,
              exclusionReason: "outside_2pct_median_band" as const,
            }]
          : [];
      });
      const latestUpdatedAt = commoditySubmissions
        .map((submission) => submission.updatedAt)
        .sort((first, second) => second.getTime() - first.getTime())[0];

      const planItem: AutoPublishPlanItem = {
        excludedSubmissions: [...previousDayExcludedSubmissions, ...medianExcludedSubmissions],
        latestUpdatedAt,
        median: calculation.median,
        rawCount: commoditySubmissions.length,
        rawValue: calculation.rawValue,
        selectedSubmissions,
        usedCount: calculation.usedCount,
        value: calculation.value,
      };

      return [
        commodityId,
        planItem,
      ];
    }).filter((entry): entry is [string, AutoPublishPlanItem] => Boolean(entry));
  const plan = new Map<string, AutoPublishPlanItem>(
    planEntries,
  );

  return plan;
}

function buildPreviousPublishedFallbackPlanEntry({
  commodityId,
  commoditySubmissions,
  date,
  previousDayExcludedSubmissions,
  previousPublished,
}: {
  commodityId: string;
  commoditySubmissions: AutoPublishSubmission[];
  date: string;
  previousDayExcludedSubmissions: AutoPublishPlanItem["excludedSubmissions"];
  previousPublished: number | null;
}): [string, AutoPublishPlanItem] | null {
  if (previousPublished === null || previousPublished <= 0) {
    return null;
  }
  const latestUpdatedAt = commoditySubmissions
    .map((submission) => submission.updatedAt)
    .sort((first, second) => second.getTime() - first.getTime())[0] ??
    new Date(`${date}T00:00:00.000Z`);

  return [
    commodityId,
    {
      carriedForwardFromPreviousPublished: true,
      excludedSubmissions: previousDayExcludedSubmissions,
      latestUpdatedAt,
      median: previousPublished,
      rawCount: commoditySubmissions.length,
      rawValue: previousPublished,
      selectedSubmissions: [],
      usedCount: 0,
      value: previousPublished,
    },
  ];
}

export function selectAutoPublishCommodityIds({
  existingPublishedCommodityIds,
  plannedCommodityIds,
  replaceExisting,
}: {
  existingPublishedCommodityIds: Set<string>;
  plannedCommodityIds: string[];
  replaceExisting: boolean;
}) {
  return plannedCommodityIds.filter(
    (commodityId) => replaceExisting || !existingPublishedCommodityIds.has(commodityId),
  );
}

async function getPreviousPublishedValuesByCommodityId({
  basketIds,
  basisIds,
  tradeDate,
}: {
  basketIds: string[];
  basisIds: string[];
  tradeDate: Date;
}) {
  const rows = await db.publishedIndex.findMany({
    orderBy: { tradeDate: "desc" },
    where: {
      basketId: { in: basketIds },
      deliveryBasisId: { in: basisIds },
      locked: true,
      status: "published",
      tradeDate: { lt: tradeDate },
    },
  });
  const result = new Map<string, number>();
  for (const row of rows) {
    if (!result.has(row.commodityId)) {
      result.set(row.commodityId, row.valueUsdPerMt.toNumber());
    }
  }
  return result;
}

function isAutoPublishPreviousDayOutlier(price: number, previousPublished: number | null) {
  return previousPublished !== null &&
    previousPublished > 0 &&
    Math.abs(price - previousPublished) / previousPublished > 0.05;
}

function getPreviousDayDeviationPct(price: number, previousPublished: number | null) {
  if (previousPublished === null || previousPublished <= 0) {
    return 0;
  }
  return Math.round((Math.abs(price - previousPublished) / previousPublished) * 10000) / 100;
}

export function isKyivAutoPublishHour(date = new Date()) {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Kyiv",
  }).format(date);

  return hour === "19";
}

export function formatDateKyiv(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(date);
}

function shouldReplaceSubmission(
  current: AutoPublishSubmission,
  candidate: AutoPublishSubmission,
) {
  if (current.source !== candidate.source) {
    return candidate.source === "admin";
  }

  return candidate.updatedAt > current.updatedAt;
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
