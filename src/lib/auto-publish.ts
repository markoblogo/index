import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { computePublishedChange } from "@/lib/index-publish";
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

export type AutoPublishPlanItem = {
  latestUpdatedAt: Date;
  rawCount: number;
  selectedSubmissions: AutoPublishSubmission[];
  usedCount: number;
  value: number;
};

export type AutoPublishResult = {
  date: string;
  published: number;
  skippedReason: string | null;
};

export async function autoPublishSpikeDailyIndices(
  date = formatDateKyiv(),
  options: { replaceExisting?: boolean } = {},
): Promise<AutoPublishResult> {
  const activeIndex = getActiveIndexConfig();

  if (activeIndex.id !== "spike-ua") {
    return { date, published: 0, skippedReason: "non_spike_tenant" };
  }

  if (!hasDatabaseUrl()) {
    return { date, published: 0, skippedReason: "database_not_configured" };
  }

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

  if (basisIds.length === 0 || basketByCommodityId.size === 0) {
    return { date, published: 0, skippedReason: "missing_basis_or_basket" };
  }

  const existingPublishedCount = await db.publishedIndex.count({
    where: {
      basketId: { in: basketIds },
      deliveryBasisId: { in: basisIds },
      locked: true,
      status: "published",
      tradeDate,
    },
  });

  if (existingPublishedCount > 0 && !options.replaceExisting) {
    return { date, published: 0, skippedReason: "already_published" };
  }

  const submissions = await db.priceSubmission.findMany({
    where: {
      deliveryBasisId: { in: basisIds },
      respondent: {
        active: true,
        status: "active",
      },
      status: { in: ["submitted", "verified", "published"] },
      tradeDate,
    },
  });
  const plan = buildAutoPublishPlan({
    basisByCommodityId: new Map(
      [...basisByCommodityId.entries()].map(([commodityId, basis]) => [
        commodityId,
        basis.id,
      ]),
    ),
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
    return { date, published: 0, skippedReason: "no_submissions" };
  }

  let published = 0;

  if (options.replaceExisting) {
    await db.publishedIndex.updateMany({
      data: {
        locked: false,
        status: "draft",
      },
      where: {
        basketId: { in: basketIds },
        deliveryBasisId: { in: basisIds },
        locked: true,
        status: "published",
        tradeDate,
      },
    });
  }

  for (const commodity of dbCommodities) {
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
        medianUsdPerMt: null,
        publicValueUsdPerMt: new Prisma.Decimal(planItem.value),
        rawCount: planItem.rawCount,
        status: "verified",
        usedCount: planItem.usedCount,
        valueUsdPerMt: new Prisma.Decimal(planItem.value),
        version: nextVersion,
      },
      create: {
        basketId: basket.id,
        basketWeight: basket.weight,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        medianUsdPerMt: null,
        publicValueUsdPerMt: new Prisma.Decimal(planItem.value),
        rawCount: planItem.rawCount,
        status: "verified",
        tradeDate,
        usedCount: planItem.usedCount,
        valueUsdPerMt: new Prisma.Decimal(planItem.value),
        version: nextVersion,
      },
    });

    await db.indexCalculationItem.deleteMany({
      where: { calculationId: calculation.id },
    });
    await db.indexCalculationItem.createMany({
      data: planItem.selectedSubmissions.map((submission) => ({
        calculationId: calculation.id,
        deviationPct: new Prisma.Decimal(0),
        included: true,
        priceSubmissionId: submission.id,
        priceUsdPerMt: new Prisma.Decimal(submission.price),
        respondentId: submission.respondentId,
      })),
    });

    const change = computePublishedChange(
      planItem.value,
      previous?.valueUsdPerMt.toNumber() ?? null,
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
    published += 1;
  }

  revalidatePath("/uk");
  revalidatePath("/en");
  revalidatePath("/uk/analytics");
  revalidatePath("/en/analytics");
  revalidatePath("/api/public/latest");
  revalidatePath("/api/public/history");

  return {
    date,
    published,
    skippedReason: published > 0 ? null : "no_publishable_positions",
  };
}

export function buildAutoPublishPlan({
  basisByCommodityId,
  submissions,
}: {
  basisByCommodityId: Map<string, string>;
  submissions: AutoPublishSubmission[];
}) {
  const selectedByCommodityAndRespondent = new Map<string, AutoPublishSubmission>();

  for (const submission of submissions) {
    const basisId = basisByCommodityId.get(submission.commodityId);

    if (
      !basisId ||
      submission.deliveryBasisId !== basisId ||
      submission.source === "spike" ||
      submission.status === "draft" ||
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

  return new Map(
    [...byCommodity.entries()].map(([commodityId, commoditySubmissions]) => {
      const value = roundToOneDecimal(
        commoditySubmissions.reduce((sum, submission) => sum + submission.price, 0) /
          commoditySubmissions.length,
      );
      const latestUpdatedAt = commoditySubmissions
        .map((submission) => submission.updatedAt)
        .sort((first, second) => second.getTime() - first.getTime())[0];

      return [
        commodityId,
        {
          latestUpdatedAt,
          rawCount: commoditySubmissions.length,
          selectedSubmissions: commoditySubmissions,
          usedCount: commoditySubmissions.length,
          value,
        },
      ] as const;
    }),
  );
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

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
