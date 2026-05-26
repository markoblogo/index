import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { getLatestDemoPublishedIndices } from "@/lib/demo-published-index-store";
import { getDemoSubmission } from "@/lib/demo-submission-store";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { buildLiveSubmissionValues } from "@/lib/live-submission-values";
import {
  commodities,
  indexUpdatedAt,
  latestQuotes,
  respondents,
  type Commodity,
  type CommodityId,
  type LatestQuote,
} from "@/lib/mock-data";
import {
  getActiveRespondentCount,
  getActiveRespondentCountData,
} from "@/lib/respondent-directory";
import {
  getConfiguredDeliveryBasisCodes,
  getDeliveryBasketCodeForCommodityCode,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";

export type PublicIndexSnapshot = {
  commodities: Commodity[];
  latestQuotes: LatestQuote[];
  updatedAt: string;
};

const activeIndex = getActiveIndexConfig();
const primaryDeliveryBasis = activeIndex.deliveryBases[0];
const MOCK_BASIS_ID = primaryDeliveryBasis.code.toLowerCase().replaceAll("_", "-");
const commodityCodeByMockId: Record<CommodityId, string> = Object.fromEntries(
  activeIndex.commodities.map((commodity) => [commodity.id, commodity.dbCode]),
);
const mockCommodityByCode = new Map(
  commodities.flatMap((commodity) => [
    [commodity.code, commodity],
    [commodityCodeByMockId[commodity.id], commodity],
  ]),
);

export async function getPublicIndexSnapshot(): Promise<PublicIndexSnapshot> {
  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production public index data.");
    }

    return getMockPublicIndexSnapshot();
  }

  try {
    return await getDatabasePublicIndexSnapshot();
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock public index data.", error);
      return getMockPublicIndexSnapshot();
    }

    console.error("Failed to load database public index data.", error);
    throw error;
  }
}

function getMockPublicIndexSnapshot(): PublicIndexSnapshot {
  const latestPublished = getLatestDemoPublishedIndices(MOCK_BASIS_ID);
  const activeRespondentCount = getActiveRespondentCount();
  const today = todayKyivDate();
  const liveValues = getMockLiveSubmissionValues(today);
  const publicCommodities = commodities.map((commodity) => {
    const liveValue = liveValues.get(commodity.id);
    const published = latestPublished.get(commodity.id);

    if (liveValue) {
      const previous = published?.value ?? commodity.latest ?? liveValue.value;
      const latest = liveValue.value;

      return {
        ...commodity,
        latest,
        absoluteChange: roundToOneDecimal(latest - previous),
        percentChange: calculatePercentChange(latest, previous),
        sparkline: [...commodity.sparkline.slice(1), latest],
      };
    }

    if (!published) {
      return commodity;
    }

    return {
      ...commodity,
      latest: published.value,
      absoluteChange: published.changeAbs ?? 0,
      percentChange: published.changePct ?? 0,
      sparkline: [...commodity.sparkline.slice(1), published.value],
    };
  });

  return {
    commodities: publicCommodities,
    latestQuotes: latestQuotes.map((quote) => {
      const liveValue = liveValues.get(quote.commodityId);
      const published = latestPublished.get(quote.commodityId);

      if (liveValue) {
        const previous = published?.value ?? quote.price ?? liveValue.value;

        return {
          ...quote,
          id: `${quote.commodityId}-${today}`,
          date: today,
          price: liveValue.value,
          absoluteChange: roundToOneDecimal(liveValue.value - previous),
          percentChange: calculatePercentChange(liveValue.value, previous),
          respondents: liveValue.respondentCount,
        };
      }

      if (!published) {
        return { ...quote, respondents: activeRespondentCount };
      }

      return {
        ...quote,
        id: `${quote.commodityId}-${published.date}`,
        date: published.date,
        price: published.value,
        absoluteChange: published.changeAbs ?? 0,
        percentChange: published.changePct ?? 0,
        respondents: activeRespondentCount,
      };
    }),
    updatedAt:
      getLatestPublicUpdate(liveValues, []) ??
      [...latestPublished.values()].sort((first, second) =>
        second.publishedAt.localeCompare(first.publishedAt),
      )[0]?.publishedAt ?? indexUpdatedAt,
  };
}

function getMockLiveSubmissionValues(date: string) {
  const submissions = commodities.flatMap((commodity) =>
    respondents.flatMap((respondent) =>
      (["admin", "respondent"] as const)
        .map((source) => {
          const submission = getDemoSubmission({
            commodityId: commodity.id,
            date,
            respondentId: respondent.id,
            source,
          });

          if (!submission) {
            return null;
          }

          return {
            commodityId: commodity.id,
            deliveryBasisId: MOCK_BASIS_ID,
            price: submission.price,
            respondentId: respondent.id,
            source,
            status: submission.status,
            updatedAt: new Date(submission.updatedAt),
          };
        })
        .filter((submission): submission is NonNullable<typeof submission> =>
          Boolean(submission),
        ),
    ),
  );

  return buildLiveSubmissionValues({
    basisByCommodityId: new Map(
      commodities.map((commodity) => [commodity.id, MOCK_BASIS_ID]),
    ),
    submissions,
  });
}

async function getDatabasePublicIndexSnapshot(): Promise<PublicIndexSnapshot> {
  const activeRespondentCount = await getActiveRespondentCountData();
  const today = todayKyivDate();
  const todayTradeDate = dateToUtcDate(today);
  const [bases, baskets] = await Promise.all([
    db.deliveryBasis.findMany({
      where: { code: { in: getConfiguredDeliveryBasisCodes(activeIndex) } },
    }),
    db.basket.findMany({
      where: {
        code: { in: activeIndex.deliveryBases.map((basis) => basis.basketCode) },
      },
    }),
  ]);
  const basisByCode = new Map(bases.map((basis) => [basis.code, basis]));
  const basketByCode = new Map(baskets.map((basket) => [basket.code, basket]));

  if (bases.length === 0 || baskets.length === 0) {
    if (allowMockFallback()) {
      return getMockPublicIndexSnapshot();
    }

    throw new Error("Missing configured basis or basket.");
  }

  const dbCommodities = await db.commodity.findMany({
    orderBy: { sortOrder: "asc" },
    where: { status: "published" },
  });
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
  const published = await Promise.all(
    dbCommodities.map((commodity) => {
      const basisConfig = getDeliveryBasisConfigForCommodityCode(
        commodity.code,
        activeIndex,
      );
      const basis = basisByCode.get(basisConfig.code);
      const basket = basketByCommodityId.get(commodity.id);

      if (!basis || !basket) {
        return null;
      }

      return db.publishedIndex.findFirst({
        where: {
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          basketId: basket.id,
          status: "published",
          locked: true,
        },
        orderBy: { tradeDate: "desc" },
      });
    }),
  );
  const liveSubmissions =
    activeIndex.id === "spike-ua" && basisIds.length > 0
      ? await db.priceSubmission.findMany({
          where: {
            deliveryBasisId: { in: basisIds },
            respondent: {
              active: true,
              status: "active",
            },
            status: { in: ["submitted", "verified", "published"] },
            tradeDate: todayTradeDate,
          },
        })
      : [];
  const liveValues = buildLiveSubmissionValues({
    basisByCommodityId: new Map(
      [...basisByCommodityId.entries()].map(([commodityId, basis]) => [
        commodityId,
        basis.id,
      ]),
    ),
    submissions: liveSubmissions.map((submission) => ({
      commodityId: submission.commodityId,
      deliveryBasisId: submission.deliveryBasisId,
      price: submission.priceUsdPerMt.toNumber(),
      respondentId: submission.respondentId,
      source: submission.source,
      status: submission.status,
      updatedAt: submission.updatedAt,
    })),
  });
  const previousPublished = await Promise.all(
    activeIndex.id === "spike-ua" && liveValues.size > 0
      ? dbCommodities.map((commodity) => {
          const basis = basisByCommodityId.get(commodity.id);
          const basket = basketByCommodityId.get(commodity.id);

          if (!basis || !basket) {
            return null;
          }

          return db.publishedIndex.findFirst({
            where: {
              basketId: basket.id,
              commodityId: commodity.id,
              deliveryBasisId: basis.id,
              status: "published",
              locked: true,
              tradeDate: { lt: todayTradeDate },
            },
            orderBy: { tradeDate: "desc" },
          });
        })
      : [],
  );
  const publishedByCommodityId = new Map(
    published
      .filter((index): index is NonNullable<typeof index> => Boolean(index))
      .filter(
        (index) => index.tradeDate.toISOString().slice(0, 10) === latestPublishedDate,
      )
      .map((index) => [index.commodityId, index]),
  );
  const latestPublishedDate =
    published
      .filter((index): index is NonNullable<typeof index> => Boolean(index))
      .map((index) => index.tradeDate.toISOString().slice(0, 10))
      .sort()
      .at(-1) ?? today;
  const previousPublishedByCommodityId = new Map(
    previousPublished
      .filter((index): index is NonNullable<typeof index> => Boolean(index))
      .map((index) => [index.commodityId, index]),
  );
  const publicCommodities = dbCommodities.map((commodity) => {
    const mockCommodity = mockCommodityByCode.get(commodity.code) ?? commodities[0];
    const liveValue = liveValues.get(commodity.id);
    const publishedIndex = publishedByCommodityId.get(commodity.id);

    if (liveValue) {
      const previous =
        previousPublishedByCommodityId.get(commodity.id)?.valueUsdPerMt.toNumber() ??
        publishedIndex?.valueUsdPerMt.toNumber() ??
        mockCommodity.latest ??
        liveValue.value;
      const latest = liveValue.value;

      return {
        ...mockCommodity,
        code: commodity.code,
        name: { uk: commodity.nameUk, en: commodity.nameEn },
        latest,
        absoluteChange: roundToOneDecimal(latest - previous),
        percentChange: calculatePercentChange(latest, previous),
        sparkline: [...mockCommodity.sparkline.slice(1), latest],
      };
    }

    if (!publishedIndex) {
      return {
        ...mockCommodity,
        code: commodity.code,
        name: { uk: commodity.nameUk, en: commodity.nameEn },
        latest: null,
        absoluteChange: 0,
        percentChange: 0,
      };
    }

    const latest = publishedIndex.valueUsdPerMt.toNumber();

    return {
      ...mockCommodity,
      code: commodity.code,
      name: { uk: commodity.nameUk, en: commodity.nameEn },
      latest,
      absoluteChange: publishedIndex.changeAbsUsdPerMt?.toNumber() ?? 0,
      percentChange: publishedIndex.changePct?.toNumber() ?? 0,
      sparkline: [...mockCommodity.sparkline.slice(1), latest],
    };
  });
  const publicLatestQuotes = dbCommodities.map((commodity) => {
    const mockCommodity = mockCommodityByCode.get(commodity.code) ?? commodities[0];
    const liveValue = liveValues.get(commodity.id);
    const publishedIndex = publishedByCommodityId.get(commodity.id);
    const basisConfig = getDeliveryBasisConfigForCommodityCode(
      commodity.code,
      activeIndex,
    );

    if (liveValue) {
      const previous =
        previousPublishedByCommodityId.get(commodity.id)?.valueUsdPerMt.toNumber() ??
        publishedIndex?.valueUsdPerMt.toNumber() ??
        mockCommodity.latest ??
        liveValue.value;

      return {
        id: `${mockCommodity.id}-${today}`,
        commodityId: mockCommodity.id,
        date: today,
        basis: basisConfig.name,
        price: liveValue.value,
        absoluteChange: roundToOneDecimal(liveValue.value - previous),
        percentChange: calculatePercentChange(liveValue.value, previous),
        respondents: liveValue.respondentCount,
      };
    }

    if (!publishedIndex) {
      const quote = latestQuotes.find(
        (item) => item.commodityId === mockCommodity.id,
      )!;
      return {
        ...quote,
        basis: basisConfig.name,
        date: latestPublishedDate,
        price: null,
        absoluteChange: 0,
        percentChange: 0,
        respondents: activeRespondentCount,
      };
    }

    return {
      id: `${mockCommodity.id}-${publishedIndex.tradeDate.toISOString()}`,
      commodityId: mockCommodity.id,
      date: publishedIndex.tradeDate.toISOString().slice(0, 10),
      basis: basisConfig.name,
      price: publishedIndex.valueUsdPerMt.toNumber(),
      absoluteChange: publishedIndex.changeAbsUsdPerMt?.toNumber() ?? 0,
      percentChange: publishedIndex.changePct?.toNumber() ?? 0,
      respondents: activeRespondentCount,
    };
  });

  return {
    commodities: publicCommodities,
    latestQuotes: publicLatestQuotes,
    updatedAt:
      getLatestPublicUpdate(liveValues, published) ?? indexUpdatedAt,
  };
}

function getLatestPublicUpdate(
  liveValues: Map<string, { latestUpdatedAt: Date }>,
  published: Array<{ publishedAt: Date } | null>,
) {
  const liveUpdatedAt = [...liveValues.values()]
    .map((value) => value.latestUpdatedAt)
    .sort((first, second) => second.getTime() - first.getTime())[0];
  const publishedAt = published
    .filter((index): index is NonNullable<typeof index> => Boolean(index))
    .map((index) => index.publishedAt)
    .sort((first, second) => second.getTime() - first.getTime())[0];
  const latest = [liveUpdatedAt, publishedAt]
    .filter((date): date is Date => Boolean(date))
    .sort((first, second) => second.getTime() - first.getTime())[0];

  return latest?.toISOString();
}

function todayKyivDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(new Date());
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function calculatePercentChange(latest: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) {
    return 0;
  }

  return Math.round(((latest - previous) / previous) * 1000) / 10;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
