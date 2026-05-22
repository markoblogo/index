import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { getLatestDemoPublishedIndices } from "@/lib/demo-published-index-store";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  commodities,
  indexUpdatedAt,
  latestQuotes,
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
  const publicCommodities = commodities.map((commodity) => {
    const published = latestPublished.get(commodity.id);

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
      const published = latestPublished.get(quote.commodityId);

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
      [...latestPublished.values()].sort((first, second) =>
        second.publishedAt.localeCompare(first.publishedAt),
      )[0]?.publishedAt ?? indexUpdatedAt,
  };
}

async function getDatabasePublicIndexSnapshot(): Promise<PublicIndexSnapshot> {
  const activeRespondentCount = await getActiveRespondentCountData();
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
  const published = await Promise.all(
    dbCommodities.map((commodity) => {
      const basisConfig = getDeliveryBasisConfigForCommodityCode(
        commodity.code,
        activeIndex,
      );
      const basketCode = getDeliveryBasketCodeForCommodityCode(
        commodity.code,
        activeIndex,
      );
      const basis = basisByCode.get(basisConfig.code);
      const basket = basketByCode.get(basketCode);

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
  const publishedByCommodityId = new Map(
    published
      .filter((index): index is NonNullable<typeof index> => Boolean(index))
      .map((index) => [index.commodityId, index]),
  );
  const publicCommodities = dbCommodities.map((commodity) => {
    const mockCommodity = mockCommodityByCode.get(commodity.code) ?? commodities[0];
    const publishedIndex = publishedByCommodityId.get(commodity.id);

    if (!publishedIndex) {
      return {
        ...mockCommodity,
        code: commodity.code,
        name: { uk: commodity.nameUk, en: commodity.nameEn },
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
    const publishedIndex = publishedByCommodityId.get(commodity.id);
    const basisConfig = getDeliveryBasisConfigForCommodityCode(
      commodity.code,
      activeIndex,
    );

    if (!publishedIndex) {
      const quote = latestQuotes.find(
        (item) => item.commodityId === mockCommodity.id,
      )!;
      return { ...quote, respondents: activeRespondentCount };
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
        .sort(
          (first, second) =>
            second.publishedAt.getTime() - first.publishedAt.getTime(),
        )[0]
        ?.publishedAt.toISOString() ?? indexUpdatedAt,
  };
}
