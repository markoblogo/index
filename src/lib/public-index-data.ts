import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { getLatestAiCardComments } from "@/lib/ai-market-brief";
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
import { syncIndexPositionDirectory } from "@/lib/position-directory-sync";
import { buildRealSparkline } from "@/lib/sparkline";
import {
  getConfiguredDeliveryBasisCodes,
  getDeliveryBasketCodeForCommodityCode,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";
import { getSpikePublicVisibleTradeDate } from "@/lib/spike-publication-window";

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
  const visibleDate =
    activeIndex.id === "spike-ua" ? getSpikePublicVisibleTradeDate() : todayKyivDate();
  const visiblePublishedEntries = [...latestPublished.values()].filter(
    (entry) => entry.date <= visibleDate,
  );
  const latestVisiblePublishedDate =
    visiblePublishedEntries
      .map((entry) => entry.date)
      .sort()
      .at(-1) ?? visibleDate;
  const latestVisiblePublished = new Map(
    visiblePublishedEntries
      .filter((entry) => entry.date === latestVisiblePublishedDate)
      .map((entry) => [entry.commodityId, entry] as const),
  );
  const publicCommodities = commodities.map((commodity) => {
    const published = latestVisiblePublished.get(commodity.id);

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
      const published = latestVisiblePublished.get(quote.commodityId);

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
      visiblePublishedEntries
        .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt))[0]
        ?.publishedAt ??
      [...latestPublished.values()].sort((first, second) =>
        second.publishedAt.localeCompare(first.publishedAt),
      )[0]?.publishedAt ?? indexUpdatedAt,
  };
}

async function getDatabasePublicIndexSnapshot(): Promise<PublicIndexSnapshot> {
  await syncIndexPositionDirectory(activeIndex);

  const activeRespondentCount = await getActiveRespondentCountData();
  const today = todayKyivDate();
  const todayTradeDate = dateToUtcDate(today);
  const visibleTradeDate =
    activeIndex.id === "spike-ua" ? getSpikePublicVisibleTradeDate() : today;
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
        },
        orderBy: { tradeDate: "desc" },
      });
    }),
  );
  const recentPublished = await Promise.all(
    dbCommodities.map((commodity) => {
      const basis = basisByCommodityId.get(commodity.id);
      const basket = basketByCommodityId.get(commodity.id);

      if (!basis || !basket) {
        return Promise.resolve([]);
      }

      return db.publishedIndex.findMany({
        orderBy: { tradeDate: "desc" },
        take: 14,
        where: {
          basketId: basket.id,
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          status: "published",
        },
      });
    }),
  );
  const recentPublishedByCommodityId = new Map(
    dbCommodities.map((commodity, index) => [
      commodity.id,
      recentPublished[index]
        .map((publishedIndex) => ({
          date: publishedIndex.tradeDate.toISOString().slice(0, 10),
          value: publishedIndex.valueUsdPerMt.toNumber(),
        }))
        .reverse(),
    ]),
  );
  const latestPublishedDate =
    published
      .filter((index): index is NonNullable<typeof index> => Boolean(index))
      .map((index) => index.tradeDate.toISOString().slice(0, 10))
      .filter((date) => date <= visibleTradeDate)
      .sort()
      .at(-1) ?? visibleTradeDate;
  const publishedByCommodityId = new Map(
    published
      .filter((index): index is NonNullable<typeof index> => Boolean(index))
      .filter(
        (index) => index.tradeDate.toISOString().slice(0, 10) === latestPublishedDate,
      )
      .map((index) => [index.commodityId, index]),
  );
  const [aiCommentsUk, aiCommentsEn] =
    activeIndex.id === "spike-ua"
      ? await Promise.all([
          getLatestAiCardComments("uk"),
          getLatestAiCardComments("en"),
        ])
      : [{}, {}];
  const publicCommodities = dbCommodities.map((commodity) => {
    const mockCommodity = mockCommodityByCode.get(commodity.code) ?? commodities[0];
    const publishedIndex = publishedByCommodityId.get(commodity.id);
    const history = recentPublishedByCommodityId.get(commodity.id) ?? [];
    const aiComment = {
      en: aiCommentsEn[commodity.code] ?? aiCommentsEn[mockCommodity.code] ?? "",
      uk: aiCommentsUk[commodity.code] ?? aiCommentsUk[mockCommodity.code] ?? "",
    };

    if (!publishedIndex) {
      return {
        ...mockCommodity,
        code: commodity.code,
        name: { uk: commodity.nameUk, en: commodity.nameEn },
        latest: null,
        absoluteChange: 0,
        percentChange: 0,
        sparkline: buildRealSparkline(history, null),
        aiComment,
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
      sparkline: buildRealSparkline(history, latest),
      aiComment,
    };
  });
  const publicLatestQuotes = dbCommodities.map((commodity) => {
    const mockCommodity = mockCommodityByCode.get(commodity.code) ?? commodities[0];
    const publishedIndex = publishedByCommodityId.get(commodity.id);
    const basisConfig = getDeliveryBasisConfigForCommodityCode(
      commodity.code,
      activeIndex,
    );

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
      published
        .filter((index): index is NonNullable<typeof index> => Boolean(index))
        .filter((index) => index.tradeDate.toISOString().slice(0, 10) <= visibleTradeDate)
        .map((index) => index.publishedAt)
        .sort((first, second) => second.getTime() - first.getTime())[0]
        ?.toISOString() ?? indexUpdatedAt,
  };
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
