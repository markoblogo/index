import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import type { DemoUser } from "@/lib/demo-auth";
import {
  getDemoCalculationVersion,
  getDemoPublishedIndex,
  getLatestDemoPublishedIndexBefore,
  incrementDemoCalculationVersion,
  setDemoPublishedIndex,
} from "@/lib/demo-published-index-store";
import {
  calculateIndexValue,
  type IndexCalculationStatus,
  type PriceSubmission,
} from "@/lib/index-calculation";
import {
  computeBenchmarkBlend,
  computePublishedChange,
} from "@/lib/index-publish";
import { commodities } from "@/lib/mock-data";
import {
  getDailyInputData,
  isAutoPreviousDayOutlier,
  isSubmissionExcluded,
  isSubmissionManuallyIncluded,
  shouldExcludeSubmission,
  todayInputDate,
} from "@/lib/admin-daily-inputs";
import {
  canManuallyUnlockPublicationDate,
  revalidatePublishedIndexViews,
} from "@/lib/admin-publication-lock";
import { generateAndStoreDailyAiMarketBriefs } from "@/lib/ai-market-brief-lazy";
import { getActiveRespondentCount } from "@/lib/respondent-directory";
import { syncIndexPositionDirectory } from "@/lib/position-directory-sync";
import {
  getActiveIndexTenant,
  getConfiguredDeliveryBasisCodes,
  getDeliveryBasketCodeForCommodityCode,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";

export { todayInputDate };

export type AdminCalculationCommodity = {
  id: string;
  code: string;
  name: string;
  version: number;
  status: IndexCalculationStatus;
  basketRespondentCount: number;
  rawCount: number;
  usedCount: number;
  median: number | null;
  value: number | null;
  rawValue: number | null;
  spikeIndicative: number | null;
  spikeDifference: number | null;
  spikeDeviationPct: number | null;
  benchmarkBlendedValue: number | null;
  excluded: Array<{
    respondentId: string;
    respondentName: string;
    price: number;
    deviationPct: number;
    reason?: string;
  }>;
  published: {
    value: number;
    changeAbs: number | null;
    changePct: number | null;
    locked: boolean;
    publishedAt?: Date | string;
    publishedByName?: string | null;
  } | null;
};

export type AdminCalculationData = {
  date: string;
  basisLabel: string;
  lockReason: string | null;
  lockedForPublication: boolean;
  publicationStatus: "not_published" | "published_locked" | "published_unlocked";
  canUnlockPublication: boolean;
  source: "database" | "mock";
  commodities: AdminCalculationCommodity[];
};

const MOCK_BASIS_ID = "fob-black-sea";
const SSI_OUTLIER_THRESHOLD = 0.06;

export async function getAdminCalculationData(
  date: string,
): Promise<AdminCalculationData> {
  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production calculation data.");
    }

    return getMockCalculationData(date);
  }

  try {
    return await getDatabaseCalculationData(date);
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock calculation data.", error);
      return getMockCalculationData(date);
    }

    console.error("Failed to load database calculation data.", error);
    throw error;
  }
}

export async function recalculateAdminIndices(formData: FormData, user: DemoUser) {
  const date = String(formData.get("date") ?? todayInputDate());

  if (await isPublicationLockedForDate(date)) {
    if (!canManuallyUnlockPublicationDate(date)) {
      redirect(`/admin/calculate?date=${date}&notice=locked`);
    }

    await unlockPublishedIndicesForRecalculation(date, user);
  }

  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production recalculation.");
    }

    for (const commodity of commodities) {
      incrementDemoCalculationVersion({
        commodityId: commodity.id,
        date,
        deliveryBasisId: MOCK_BASIS_ID,
      });
    }

    redirect(`/admin/calculate?date=${date}&notice=recalculated_mock`);
  }

  await persistDatabaseCalculations(date, user);
  redirect(`/admin/calculate?date=${date}&notice=recalculated_database`);
}

async function unlockPublishedIndicesForRecalculation(date: string, user: DemoUser) {
  if (!hasDatabaseUrl()) return;

  const tradeDate = dateToUtcDate(date);
  const basisCodes = getConfiguredDeliveryBasisCodes();
  const lockedRows = await db.publishedIndex.findMany({
    where: {
      tradeDate,
      deliveryBasis: { code: { in: basisCodes } },
      locked: true,
      status: "published",
    },
    select: {
      id: true,
      commodityId: true,
      valueUsdPerMt: true,
    },
  });

  if (lockedRows.length === 0) return;

  await db.publishedIndex.updateMany({
    where: { id: { in: lockedRows.map((row) => row.id) } },
    data: { locked: false },
  });

  await db.auditLog.create({
    data: {
      actorRole: "admin",
      action: "index.recalculate_auto_unlock",
      entityType: "PublishedIndex",
      summary: `Auto-unlocked ${lockedRows.length} published index values before recalculation on ${date}.`,
      beforeJson: {
        locked: true,
        tradeDate: date,
        rows: lockedRows.map((row) => ({
          id: row.id,
          commodityId: row.commodityId,
          valueUsdPerMt: row.valueUsdPerMt.toNumber(),
        })),
      },
      afterJson: {
        locked: false,
        tradeDate: date,
        username: user.username,
      },
    },
  });
}

export async function publishAdminIndices(formData: FormData, user: DemoUser) {
  const date = String(formData.get("date") ?? todayInputDate());
  const benchmarkBlendCommodityIds = new Set(
    formData.getAll("benchmarkBlendCommodityIds").map(String),
  );

  if (await isPublicationLockedForDate(date)) {
    redirect(`/admin/calculate?date=${date}&notice=locked`);
  }

  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production publication.");
    }

    await publishMockIndices(date, benchmarkBlendCommodityIds);
    revalidatePublishedIndexViews();
    redirect(`/admin/calculate?date=${date}&notice=published_mock`);
  }

  const calculations = await persistDatabaseCalculations(date, user);
  await publishDatabaseCalculations(date, calculations, user, benchmarkBlendCommodityIds);
  await generateAndStoreDailyAiMarketBriefs({
    actorUserId: user.userId,
    date,
    force: true,
    source: "admin_publish",
  });
  revalidatePublishedIndexViews();
  redirect(`/admin/calculate?date=${date}&notice=published_database`);
}

async function getMockCalculationData(date: string): Promise<AdminCalculationData> {
  const inputData = await getDailyInputData(date);
  const basketRespondentCount = getActiveRespondentCount();
  const respondentNameById = new Map(
    inputData.respondents.map((respondent) => [respondent.id, respondent.name]),
  );
  const cellsByCommodity = new Map<string, typeof inputData.cells>();

  for (const cell of inputData.cells) {
    const cells = cellsByCommodity.get(cell.commodityId) ?? [];
    cells.push(cell);
    cellsByCommodity.set(cell.commodityId, cells);
  }

  return {
    date,
    basisLabel: inputData.basisLabel,
    lockReason: isPastTradeDate(date) ? lockedPublicationReason() : null,
    lockedForPublication: isPastTradeDate(date),
    publicationStatus: isPastTradeDate(date) ? "published_locked" : "not_published",
    canUnlockPublication: false,
    source: "mock",
    commodities: inputData.commodities.map((commodity) => {
      const cells = cellsByCommodity.get(commodity.id) ?? [];
      const result = calculateIndexValue({
        calculationMethod: "median_all",
        date,
        commodityId: commodity.id,
        deliveryBasisId: MOCK_BASIS_ID,
        outlierThreshold: getCalculationOutlierThreshold(),
        submissions: cells.map((cell) => ({
          respondentId: cell.respondentId,
          price: cell.excluded ? undefined : cell.price,
        })),
      });
      const spikeIndicative = cells[0]?.spikeIndicative ?? null;
      const published = getDemoPublishedIndex({
        commodityId: commodity.id,
        date,
        deliveryBasisId: MOCK_BASIS_ID,
      });

      return buildCalculationCommodity({
        code: commodity.code,
        name: commodity.name,
        result,
        spikeIndicative,
        version: getDemoCalculationVersion({
          commodityId: commodity.id,
          date,
          deliveryBasisId: MOCK_BASIS_ID,
        }),
        respondentNameById,
        published,
        basketRespondentCount,
      });
    }),
  };
}

async function publishMockIndices(
  date: string,
  benchmarkBlendCommodityIds: Set<string>,
) {
  const data = await getMockCalculationData(date);

  for (const commodity of data.commodities) {
    if (commodity.status !== "publishable" || commodity.value === null) {
      continue;
    }

    const existing = getDemoPublishedIndex({
      commodityId: commodity.id,
      date,
      deliveryBasisId: MOCK_BASIS_ID,
    });

    if (existing?.locked) {
      continue;
    }

    const previous = getLatestDemoPublishedIndexBefore({
      commodityId: commodity.id,
      date,
      deliveryBasisId: MOCK_BASIS_ID,
    });
    const publishedValue =
      benchmarkBlendCommodityIds.has(commodity.id) &&
      commodity.benchmarkBlendedValue !== null
        ? commodity.benchmarkBlendedValue
        : commodity.value;
    const change = computePublishedChange(publishedValue, previous?.value ?? null, {
      displayRounding: getActiveIndexTenant().id === "spike-ua" ? "whole" : "one_decimal",
    });

    setDemoPublishedIndex({
      commodityId: commodity.id,
      date,
      deliveryBasisId: MOCK_BASIS_ID,
      value: publishedValue,
      ...change,
      locked: true,
      publishedAt: new Date().toISOString(),
      version: commodity.version,
    });
  }
}

async function getDatabaseCalculationData(date: string): Promise<AdminCalculationData> {
  const context = await getDatabaseCalculationContext(date);

  if (!context) {
    if (allowMockFallback()) {
      return getMockCalculationData(date);
    }

    throw new Error(`Missing calculation context for ${date}.`);
  }

  const { dbCommodities, existingCalculations, publishedIndices } = context;
  const lockedPublishedCount = [...publishedIndices.values()].filter(
    (publishedIndex) => publishedIndex.locked,
  ).length;
  const lockedForPublication = isPastTradeDate(date)
    ? publishedIndices.size > 0
    : lockedPublishedCount > 0;

  return {
    date,
    basisLabel: getActiveIndexTenant().defaultDeliveryBasis,
    lockReason: lockedForPublication ? lockedPublicationReason() : null,
    lockedForPublication,
    publicationStatus:
      lockedPublishedCount > 0
        ? "published_locked"
        : publishedIndices.size > 0
          ? "published_unlocked"
          : "not_published",
    canUnlockPublication:
      lockedPublishedCount > 0 && canManuallyUnlockPublicationDate(date),
    source: "database",
    commodities: dbCommodities.map((commodity) => {
      const basis = context.basisByCommodityId.get(commodity.id);
      const basket = context.basketByCommodityId.get(commodity.id);

      if (!basis || !basket) {
        throw new Error(`Missing basis or basket for ${commodity.code}.`);
      }

      const calculationInput = buildDatabaseCalculationInput(context, commodity.id);
      const result = calculateIndexValue({
        calculationMethod: "median_all",
        date,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        basketWeight: basket.weight.toNumber(),
        outlierThreshold: getCalculationOutlierThreshold(),
        submissions: calculationInput.submissions,
      });
      const existingCalculation = existingCalculations.get(commodity.id);
      const publishedIndex = publishedIndices.get(commodity.id);

      return buildCalculationCommodity({
        code: commodity.code,
        name: commodity.nameUk,
        result,
        spikeIndicative: calculationInput.spikeIndicative,
        version: existingCalculation?.version ?? 1,
        respondentNameById: calculationInput.respondentNameById,
        selectedSubmissions: calculationInput.selectedSubmissions,
        previousPublished: calculationInput.previousPublished,
        published: publishedIndex
          ? {
              value: publishedIndex.valueUsdPerMt.toNumber(),
              changeAbs: publishedIndex.changeAbsUsdPerMt?.toNumber() ?? null,
              changePct: publishedIndex.changePct?.toNumber() ?? null,
              locked: publishedIndex.locked,
              publishedAt: publishedIndex.publishedAt,
              publishedByName:
                publishedIndex.publishedBy?.name ?? publishedIndex.publishedBy?.email ?? null,
            }
          : null,
        basketRespondentCount: context.dbRespondents.length,
      });
    }),
  };
}

async function persistDatabaseCalculations(
  date: string,
  user: DemoUser,
  targetCommodityId?: string | null,
) {
  const context = await getDatabaseCalculationContext(date);

  if (!context) {
    return [];
  }

  const tradeDate = dateToUtcDate(date);
  const savedCalculations = [];

  for (const commodity of context.dbCommodities) {
    if (targetCommodityId && commodity.id !== targetCommodityId) {
      continue;
    }

    const calculationInput = buildDatabaseCalculationInput(context, commodity.id);
    const basis = context.basisByCommodityId.get(commodity.id);
    const basket = context.basketByCommodityId.get(commodity.id);

    if (!basis || !basket) {
      continue;
    }

    const result = calculateIndexValue({
      calculationMethod: "median_all",
      date,
      commodityId: commodity.id,
      deliveryBasisId: basis.id,
      basketWeight: basket.weight.toNumber(),
      outlierThreshold: getCalculationOutlierThreshold(),
      submissions: calculationInput.submissions,
    });
    const previousCalculation = context.existingCalculations.get(commodity.id);
    const nextVersion = (previousCalculation?.version ?? 0) + 1;
    const dbStatus = toDatabaseCalculationStatus(result.status);

    const calculation = await db.indexCalculation.upsert({
      where: {
        tradeDate_commodityId_deliveryBasisId_basketId: {
          tradeDate,
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          basketId: basket.id,
        },
      },
      update: {
        status: dbStatus,
        medianUsdPerMt: toDecimalOrNull(result.median),
        valueUsdPerMt: toDecimalOrNull(result.rawValue),
        publicValueUsdPerMt: toDecimalOrNull(result.value),
        rawCount: result.rawCount,
        usedCount: result.usedCount,
        basketWeight: basket.weight,
        version: nextVersion,
        calculatedById: await getDatabaseUserId(user),
        calculatedAt: new Date(),
      },
      create: {
        tradeDate,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        basketId: basket.id,
        status: dbStatus,
        medianUsdPerMt: toDecimalOrNull(result.median),
        valueUsdPerMt: toDecimalOrNull(result.rawValue),
        publicValueUsdPerMt: toDecimalOrNull(result.value),
        rawCount: result.rawCount,
        usedCount: result.usedCount,
        basketWeight: basket.weight,
        version: nextVersion,
        calculatedById: await getDatabaseUserId(user),
      },
    });

    await db.indexCalculationItem.deleteMany({
      where: { calculationId: calculation.id },
    });

    const excludedByRespondent = new Map(
      result.excluded.map((item) => [item.respondentId, item]),
    );
    const manuallyExcludedRespondentIds = new Set(
      calculationInput.selectedSubmissions
        .filter(isSubmissionExcluded)
        .map((submission) => submission.respondentId),
    );
    const autoPreviousDayExcludedRespondentIds = new Set(
      calculationInput.selectedSubmissions
        .filter((submission) =>
          !calculationInput.forceIncludedRespondentIds.has(submission.respondentId) &&
          isAutoPreviousDayOutlier(submission, calculationInput.previousPublished),
        )
        .map((submission) => submission.respondentId),
    );

    await db.indexCalculationItem.createMany({
      data: calculationInput.selectedSubmissions.map((submission) => {
        const excluded = excludedByRespondent.get(submission.respondentId);
        const manuallyExcluded = manuallyExcludedRespondentIds.has(submission.respondentId);
        const autoPreviousDayExcluded = autoPreviousDayExcludedRespondentIds.has(
          submission.respondentId,
        );

        return {
          calculationId: calculation.id,
          priceSubmissionId: submission.id,
          respondentId: submission.respondentId,
          priceUsdPerMt: submission.priceUsdPerMt,
          included: !excluded && !manuallyExcluded && !autoPreviousDayExcluded,
          deviationPct: excluded
            ? new Prisma.Decimal(excluded.deviationPct)
            : new Prisma.Decimal(0),
          exclusionReason: manuallyExcluded
            ? "manual_exclude_from_index"
            : autoPreviousDayExcluded
              ? "previous_day_5pct_deviation"
              : excluded ? "outside_2pct_median_band" : null,
        };
      }),
    });

    await db.auditLog.create({
      data: {
        actorUserId: await getDatabaseUserId(user),
        actorRole: "admin",
        action: "index_calculation.recalculated",
        entityType: "IndexCalculation",
        entityId: calculation.id,
        summary: `Recalculated version ${nextVersion} for ${commodity.code} on ${date}.`,
        beforeJson: previousCalculation
          ? {
              version: previousCalculation.version,
              status: previousCalculation.status,
              publicValueUsdPerMt:
                previousCalculation.publicValueUsdPerMt?.toNumber() ?? null,
            }
          : Prisma.JsonNull,
        afterJson: {
          version: nextVersion,
          status: dbStatus,
          publicValueUsdPerMt: result.value,
          rawCount: result.rawCount,
          usedCount: result.usedCount,
        },
      },
    });

    savedCalculations.push(calculation);
  }

  return savedCalculations;
}

async function publishDatabaseCalculations(
  date: string,
  calculations: Awaited<ReturnType<typeof persistDatabaseCalculations>>,
  user: DemoUser,
  benchmarkBlendCommodityIds: Set<string>,
) {
  const publisherUserId = await getDatabaseUserId(user);

  for (const calculation of calculations) {
    if (
      !isPublishableDatabaseCalculation(calculation.status) ||
      calculation.publicValueUsdPerMt === null
    ) {
      continue;
    }

    const existing = await db.publishedIndex.findUnique({
      where: {
        tradeDate_commodityId_deliveryBasisId_basketId: {
          tradeDate: calculation.tradeDate,
          commodityId: calculation.commodityId,
          deliveryBasisId: calculation.deliveryBasisId,
          basketId: calculation.basketId,
        },
      },
    });

    if (existing?.locked) {
      continue;
    }

    const previous = await db.publishedIndex.findFirst({
      where: {
        commodityId: calculation.commodityId,
        deliveryBasisId: calculation.deliveryBasisId,
        basketId: calculation.basketId,
        tradeDate: { lt: calculation.tradeDate },
        status: "published",
        locked: true,
      },
      orderBy: { tradeDate: "desc" },
    });
    const calculatedValue = calculation.publicValueUsdPerMt.toNumber();
    const benchmarkIndicative = benchmarkBlendCommodityIds.has(calculation.commodityId)
      ? await db.externalIndicative.findFirst({
          where: {
            tradeDate: calculation.tradeDate,
            commodityId: calculation.commodityId,
            deliveryBasisId: calculation.deliveryBasisId,
            source: "spike",
          },
        })
      : null;
    const benchmarkBlend = computeBenchmarkBlend(
      calculatedValue,
      benchmarkIndicative?.priceUsdPerMt.toNumber() ?? null,
      Boolean(benchmarkIndicative),
    );
    const currentValue = benchmarkBlend.finalValue;
    const change = computePublishedChange(
      currentValue,
      previous?.valueUsdPerMt.toNumber() ?? null,
      {
        displayRounding:
          getActiveIndexTenant().id === "spike-ua" ? "whole" : "one_decimal",
      },
    );

    const publishedData = {
      calculationId: calculation.id,
      status: "published" as const,
      calculatedValueUsdPerMt: new Prisma.Decimal(calculatedValue),
      benchmarkBlendEnabled: benchmarkBlend.benchmarkBlendEnabled,
      benchmarkValueUsdPerMt: benchmarkBlend.benchmarkValue
        ? new Prisma.Decimal(benchmarkBlend.benchmarkValue)
        : null,
      adjustmentMethod: benchmarkBlend.method,
      adjustmentReason: benchmarkBlend.benchmarkBlendEnabled
        ? "Admin enabled benchmark blend before publication."
        : null,
      valueUsdPerMt: new Prisma.Decimal(currentValue),
      changeAbsUsdPerMt:
        change.changeAbs === null ? null : new Prisma.Decimal(change.changeAbs),
      changePct:
        change.changePct === null ? null : new Prisma.Decimal(change.changePct),
      locked: true,
      publishedById: publisherUserId,
    };
    const publishedIndex = await db.publishedIndex.upsert({
      where: {
        tradeDate_commodityId_deliveryBasisId_basketId: {
          tradeDate: calculation.tradeDate,
          commodityId: calculation.commodityId,
          deliveryBasisId: calculation.deliveryBasisId,
          basketId: calculation.basketId,
        },
      },
      update: publishedData,
      create: {
        ...publishedData,
        tradeDate: calculation.tradeDate,
        commodityId: calculation.commodityId,
        deliveryBasisId: calculation.deliveryBasisId,
        basketId: calculation.basketId,
      },
    });

    await db.indexCalculation.update({
      where: { id: calculation.id },
      data: { status: "published" },
    });

    await db.auditLog.create({
      data: {
        actorUserId: publisherUserId,
        actorRole: "admin",
        action: "index.published",
        entityType: "PublishedIndex",
        entityId: publishedIndex.id,
        summary: `Published locked index for ${calculation.commodityId} on ${date}.`,
        beforeJson: Prisma.JsonNull,
        afterJson: {
          tradeDate: date,
          commodityId: calculation.commodityId,
          valueUsdPerMt: currentValue,
          benchmarkBlendApplied: benchmarkBlend.benchmarkBlendEnabled,
          benchmarkValueUsdPerMt: benchmarkBlend.benchmarkValue,
          changeAbsUsdPerMt: change.changeAbs,
          changePct: change.changePct,
          locked: true,
          calculationVersion: calculation.version,
        },
      },
    });
  }
}

function isPublishableDatabaseCalculation(status: string) {
  if (status === "verified") {
    return true;
  }

  return getActiveIndexTenant().id === "spike-ua" && status === "insufficient_data";
}

async function getDatabaseCalculationContext(date: string) {
  const tradeDate = dateToUtcDate(date);
  const activeIndex = getActiveIndexTenant();
  await syncIndexPositionDirectory(activeIndex);

  const basisCodes = getConfiguredDeliveryBasisCodes(activeIndex);
  const basketCodes = activeIndex.deliveryBases.map((basis) => basis.basketCode);
  const [bases, baskets, dbCommodities, dbRespondents] = await Promise.all([
    db.deliveryBasis.findMany({ where: { code: { in: basisCodes } } }),
    db.basket.findMany({ where: { code: { in: basketCodes } } }),
    db.commodity.findMany({
      orderBy: { sortOrder: "asc" },
      where: { status: "published" },
    }),
    db.respondent.findMany({
      orderBy: { legalName: "asc" },
      where: { active: true, status: "active" },
    }),
  ]);
  const basisByCode = new Map(bases.map((basis) => [basis.code, basis]));
  const basketByCode = new Map(baskets.map((basket) => [basket.code, basket]));
  const basisByCommodityId = new Map(
    dbCommodities
      .map((commodity) => {
        const basisConfig = getDeliveryBasisConfigForCommodityCode(
          commodity.code,
          activeIndex,
        );
        const basis = basisByCode.get(basisConfig.code);

        return basis ? ([commodity.id, basis] as const) : null;
      })
      .filter((entry): entry is readonly [string, (typeof bases)[number]] =>
        Boolean(entry),
      ),
  );
  const basketByCommodityId = new Map(
    dbCommodities
      .map((commodity) => {
        const basketCode = getDeliveryBasketCodeForCommodityCode(
          commodity.code,
          activeIndex,
        );
        const basket = basketByCode.get(basketCode);

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

  if (
    basisIds.length === 0 ||
    basketIds.length === 0 ||
    dbCommodities.length === 0
  ) {
    return null;
  }

  const [submissions, indicatives, calculations, published, previousPublished] = await Promise.all([
    db.priceSubmission.findMany({
      where: {
        tradeDate,
        deliveryBasisId: { in: basisIds },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.externalIndicative.findMany({
      where: {
        tradeDate,
        deliveryBasisId: { in: basisIds },
        source: "spike",
      },
    }),
    db.indexCalculation.findMany({
      where: {
        tradeDate,
        deliveryBasisId: { in: basisIds },
        basketId: { in: basketIds },
      },
    }),
    db.publishedIndex.findMany({
      where: {
        tradeDate,
        deliveryBasisId: { in: basisIds },
        basketId: { in: basketIds },
      },
      include: {
        publishedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    db.publishedIndex.findMany({
      where: {
        tradeDate: { lt: tradeDate },
        deliveryBasisId: { in: basisIds },
        basketId: { in: basketIds },
        status: "published",
        locked: true,
      },
      orderBy: { tradeDate: "desc" },
    }),
  ]);
  const previousPublishedIndices = new Map<string, (typeof previousPublished)[number]>();

  for (const publishedIndex of previousPublished) {
    if (!previousPublishedIndices.has(publishedIndex.commodityId)) {
      previousPublishedIndices.set(publishedIndex.commodityId, publishedIndex);
    }
  }

  return {
    basisByCommodityId,
    basketByCommodityId,
    dbCommodities,
    dbRespondents,
    submissions,
    indicatives,
    existingCalculations: new Map(
      calculations.map((calculation) => [calculation.commodityId, calculation]),
    ),
    publishedIndices: new Map(
      published.map((publishedIndex) => [publishedIndex.commodityId, publishedIndex]),
    ),
    previousPublishedIndices,
  };
}

function buildDatabaseCalculationInput(
  context: NonNullable<Awaited<ReturnType<typeof getDatabaseCalculationContext>>>,
  commodityId: string,
) {
  const respondentNameById = new Map(
    context.dbRespondents.map((respondent) => [respondent.id, respondent.legalName]),
  );
  const submissionsByRespondent = new Map<string, typeof context.submissions>();
  const basis = context.basisByCommodityId.get(commodityId);

  for (const submission of context.submissions) {
    if (
      submission.commodityId !== commodityId ||
      (basis && submission.deliveryBasisId !== basis.id)
    ) {
      continue;
    }

    const current = submissionsByRespondent.get(submission.respondentId) ?? [];
    current.push(submission);
    submissionsByRespondent.set(submission.respondentId, current);
  }

  const selectedSubmissions = [...submissionsByRespondent.values()]
    .map(
      (submissions) =>
        submissions.find((submission) => submission.source === "admin") ??
        submissions.find((submission) => submission.source === "respondent"),
    )
    .filter((submission): submission is NonNullable<typeof submission> =>
      Boolean(submission),
    );
  const indicative = context.indicatives.find(
    (item) =>
      item.commodityId === commodityId &&
      (!basis || item.deliveryBasisId === basis.id),
  );
  const previousPublished =
    context.previousPublishedIndices.get(commodityId)?.valueUsdPerMt.toNumber() ?? null;

  return {
    forceIncludedRespondentIds: new Set(
      selectedSubmissions
        .filter((submission) =>
          isForceIncludedCalculationSubmission(
            submission,
            respondentNameById.get(submission.respondentId),
          ),
        )
        .map((submission) => submission.respondentId),
    ),
    respondentNameById,
    previousPublished,
    selectedSubmissions,
    spikeIndicative: indicative?.priceUsdPerMt.toNumber() ?? null,
    submissions: selectedSubmissions.map(
      (submission): PriceSubmission => {
        const manuallyExcluded = isSubmissionExcluded(submission);
        const forceInclude = isForceIncludedCalculationSubmission(
          submission,
          respondentNameById.get(submission.respondentId),
        );

        return {
          forceInclude,
          respondentId: submission.respondentId,
          price: manuallyExcluded || (!forceInclude && shouldExcludeSubmission(submission, previousPublished))
            ? undefined
            : submission.priceUsdPerMt.toNumber(),
        };
      },
    ),
  };
}

function isForceIncludedCalculationSubmission(
  submission: { metadata?: unknown; respondentId: string },
  respondentName: string | undefined,
) {
  return (
    !isSubmissionExcluded(submission) &&
    (isSubmissionManuallyIncluded(submission) ||
      isTrustedSsiBrokerRespondent(submission.respondentId, respondentName))
  );
}

function isTrustedSsiBrokerRespondent(respondentId: string, respondentName: string | undefined) {
  if (getActiveIndexTenant().id !== "spike-ua") {
    return false;
  }

  const normalized = normalizeTrustedRespondentName(`${respondentId} ${respondentName ?? ""}`);
  return TRUSTED_SSI_BROKER_RESPONDENT_TOKENS.some((token) => normalized.includes(token));
}

function getCalculationOutlierThreshold() {
  return getActiveIndexTenant().id === "spike-ua" ? SSI_OUTLIER_THRESHOLD : undefined;
}

const TRUSTED_SSI_BROKER_RESPONDENT_TOKENS = [
  "фоп вікторія",
  "фоп виктория",
  "fop viktoria",
  "фоп соловей",
  "fop solovey",
  "контінентал",
  "континентал",
  "continental",
];

function normalizeTrustedRespondentName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isPastTradeDate(date: string) {
  return date < todayInputDate();
}

async function isPublicationLockedForDate(date: string) {
  if (!hasDatabaseUrl()) {
    return isPastTradeDate(date);
  }

  const context = await getDatabaseCalculationContext(date);
  const publishedIndices = [...(context?.publishedIndices.values() ?? [])];
  const lockedPublishedCount = publishedIndices.filter((index) => index.locked).length;

  return isPastTradeDate(date)
    ? publishedIndices.length > 0
    : lockedPublishedCount > 0;
}

function lockedPublicationReason() {
  return `Published ${getActiveIndexTenant().name} values for this trade date are locked. Historical published indices cannot be recalculated or republished.`;
}

function buildCalculationCommodity({
  code,
  name,
  result,
  spikeIndicative,
  version,
  respondentNameById,
  published,
  basketRespondentCount,
  selectedSubmissions = [],
  previousPublished = null,
}: {
  basketRespondentCount: number;
  code: string;
  name: string;
  result: ReturnType<typeof calculateIndexValue>;
  spikeIndicative: number | null;
  version: number;
  respondentNameById: Map<string, string>;
  published: AdminCalculationCommodity["published"];
  selectedSubmissions?: Array<{
    metadata: unknown;
    priceUsdPerMt: { toNumber(): number };
    respondentId: string;
  }>;
  previousPublished?: number | null;
}): AdminCalculationCommodity {
  const spikeDifference =
    result.value === null || spikeIndicative === null
      ? null
      : roundToOneDecimal(result.value - spikeIndicative);
  const spikeDeviationPct =
    spikeDifference === null || spikeIndicative === null
      ? null
      : roundToTwoDecimals((spikeDifference / spikeIndicative) * 100);
  const benchmarkBlendedValue =
    result.value === null || spikeIndicative === null
      ? null
      : roundToOneDecimal((result.value + spikeIndicative) / 2);

  return {
    id: result.commodityId,
    code,
    name,
    version,
    status: result.status,
    basketRespondentCount,
    rawCount: result.rawCount,
    usedCount: result.usedCount,
    median: result.median === null ? null : roundToOneDecimal(result.median),
    value: result.value,
    rawValue: result.rawValue,
    spikeIndicative,
    spikeDifference,
    spikeDeviationPct,
    benchmarkBlendedValue,
    excluded: result.excluded
      .filter((item) => item.deviationPct > 0.005)
      .map((item) => ({
        ...item,
        respondentName: respondentNameById.get(item.respondentId) ?? item.respondentId,
        deviationPct: roundToTwoDecimals(item.deviationPct),
        reason: "outside_2pct_median_band",
      }))
      .concat(
        selectedSubmissions
          .filter(isSubmissionExcluded)
          .map((submission) => ({
            respondentId: submission.respondentId,
            respondentName: respondentNameById.get(submission.respondentId) ?? submission.respondentId,
            price: submission.priceUsdPerMt.toNumber(),
            deviationPct: 0,
            reason: "manual_exclude_from_index",
          })),
        selectedSubmissions
          .filter((submission) =>
            !selectedSubmissions.some(
              (candidate) =>
                candidate.respondentId === submission.respondentId &&
                isForceIncludedCalculationSubmission(
                  candidate,
                  respondentNameById.get(candidate.respondentId),
                ),
            ) &&
            isAutoPreviousDayOutlier(submission, previousPublished),
          )
          .map((submission) => ({
            respondentId: submission.respondentId,
            respondentName: respondentNameById.get(submission.respondentId) ?? submission.respondentId,
            price: submission.priceUsdPerMt.toNumber(),
            deviationPct:
              previousPublished && previousPublished > 0
                ? roundToTwoDecimals(
                    (Math.abs(submission.priceUsdPerMt.toNumber() - previousPublished) /
                      previousPublished) *
                      100,
                  )
                : 0,
            reason: "previous_day_5pct_deviation",
          })),
      ),
    published,
  };
}

function toDatabaseCalculationStatus(status: IndexCalculationStatus) {
  if (status === "publishable") {
    return "verified";
  }

  return status;
}

async function getDatabaseUserId(user: DemoUser) {
  const existing = await db.user.findFirst({
    where: {
      role: user.role,
      OR: [{ email: user.username }, { name: user.username }],
    },
  });

  if (existing) {
    return existing.id;
  }

  const fallback = await db.user.findFirst({
    where: { role: user.role },
  });

  return fallback?.id ?? null;
}

function toDecimalOrNull(value: number | null) {
  return value === null ? null : new Prisma.Decimal(value);
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
