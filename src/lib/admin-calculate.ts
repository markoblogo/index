import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
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
  todayInputDate,
} from "@/lib/admin-daily-inputs";
import { getActiveRespondentCount } from "@/lib/respondent-directory";
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
  }>;
  published: {
    value: number;
    changeAbs: number | null;
    changePct: number | null;
    locked: boolean;
  } | null;
};

export type AdminCalculationData = {
  date: string;
  basisLabel: string;
  lockReason: string | null;
  lockedForPublication: boolean;
  publicationStatus: "not_published" | "published_locked";
  source: "database" | "mock";
  commodities: AdminCalculationCommodity[];
};

const MOCK_BASIS_ID = "fob-black-sea";

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
    redirect(`/admin/calculate?date=${date}&notice=locked`);
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
  revalidatePublishedIndexViews();
  redirect(`/admin/calculate?date=${date}&notice=published_database`);
}

function revalidatePublishedIndexViews() {
  revalidatePath("/uk");
  revalidatePath("/en");
  revalidatePath("/uk/analytics");
  revalidatePath("/en/analytics");
  revalidatePath("/api/public/latest");
  revalidatePath("/api/public/history");
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
    source: "mock",
    commodities: inputData.commodities.map((commodity) => {
      const cells = cellsByCommodity.get(commodity.id) ?? [];
      const result = calculateIndexValue({
        date,
        commodityId: commodity.id,
        deliveryBasisId: MOCK_BASIS_ID,
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
    const change = computePublishedChange(publishedValue, previous?.value ?? null);

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
  const lockedForPublication = isPastTradeDate(date) && publishedIndices.size > 0;

  return {
    date,
    basisLabel: getActiveIndexTenant().defaultDeliveryBasis,
    lockReason: lockedForPublication ? lockedPublicationReason() : null,
    lockedForPublication,
    publicationStatus: publishedIndices.size > 0 ? "published_locked" : "not_published",
    source: "database",
    commodities: dbCommodities.map((commodity) => {
      const basis = context.basisByCommodityId.get(commodity.id);
      const basket = context.basketByCommodityId.get(commodity.id);

      if (!basis || !basket) {
        throw new Error(`Missing basis or basket for ${commodity.code}.`);
      }

      const calculationInput = buildDatabaseCalculationInput(context, commodity.id);
      const result = calculateIndexValue({
        date,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        basketWeight: basket.weight.toNumber(),
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
        published: publishedIndex
          ? {
              value: publishedIndex.valueUsdPerMt.toNumber(),
              changeAbs: publishedIndex.changeAbsUsdPerMt?.toNumber() ?? null,
              changePct: publishedIndex.changePct?.toNumber() ?? null,
              locked: publishedIndex.locked,
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
      date,
      commodityId: commodity.id,
      deliveryBasisId: basis.id,
      basketWeight: basket.weight.toNumber(),
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

    await db.indexCalculationItem.createMany({
      data: calculationInput.selectedSubmissions.map((submission) => {
        const excluded = excludedByRespondent.get(submission.respondentId);

        return {
          calculationId: calculation.id,
          priceSubmissionId: submission.id,
          respondentId: submission.respondentId,
          priceUsdPerMt: submission.priceUsdPerMt,
          included: !excluded,
          deviationPct: excluded
            ? new Prisma.Decimal(excluded.deviationPct)
            : new Prisma.Decimal(0),
          exclusionReason: excluded ? "outside_2pct_median_band" : null,
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

  const [submissions, indicatives, calculations, published] = await Promise.all([
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
    }),
  ]);

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

  return {
    respondentNameById,
    selectedSubmissions,
    spikeIndicative: indicative?.priceUsdPerMt.toNumber() ?? null,
    submissions: selectedSubmissions.map(
      (submission): PriceSubmission => ({
        respondentId: submission.respondentId,
        price: submission.priceUsdPerMt.toNumber(),
      }),
    ),
  };
}

function isPastTradeDate(date: string) {
  return date < todayInputDate();
}

async function isPublicationLockedForDate(date: string) {
  if (!isPastTradeDate(date)) {
    return false;
  }

  if (!hasDatabaseUrl()) {
    return true;
  }

  const context = await getDatabaseCalculationContext(date);
  return (context?.publishedIndices.size ?? 0) > 0;
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
}: {
  basketRespondentCount: number;
  code: string;
  name: string;
  result: ReturnType<typeof calculateIndexValue>;
  spikeIndicative: number | null;
  version: number;
  respondentNameById: Map<string, string>;
  published: AdminCalculationCommodity["published"];
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
    excluded: result.excluded.map((item) => ({
      ...item,
      respondentName: respondentNameById.get(item.respondentId) ?? item.respondentId,
      deviationPct: roundToTwoDecimals(item.deviationPct),
    })),
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
