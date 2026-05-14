import { db } from "@/lib/db";
import { getLatestDemoPublishedIndices } from "@/lib/demo-published-index-store";
import { hasDatabaseUrl } from "@/lib/admin-daily-inputs";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  commodities,
  indexUpdatedAt,
  latestQuotes,
  type Commodity,
  type CommodityId,
  type LatestQuote,
} from "@/lib/mock-data";

export type PublicIndexSnapshot = {
  commodities: Commodity[];
  latestQuotes: LatestQuote[];
  updatedAt: string;
};

const activeIndex = getActiveIndexConfig();
const primaryDeliveryBasis = activeIndex.deliveryBases[0];
const BASIS_CODE = primaryDeliveryBasis.code;
const BASKET_CODE = primaryDeliveryBasis.basketCode;
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
    return getMockPublicIndexSnapshot();
  }

  try {
    return await getDatabasePublicIndexSnapshot();
  } catch (error) {
    console.warn("Falling back to mock public index data.", error);
    return getMockPublicIndexSnapshot();
  }
}

function getMockPublicIndexSnapshot(): PublicIndexSnapshot {
  const latestPublished = getLatestDemoPublishedIndices(MOCK_BASIS_ID);
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
        return quote;
      }

      return {
        ...quote,
        id: `${quote.commodityId}-${published.date}`,
        date: published.date,
        price: published.value,
        absoluteChange: published.changeAbs ?? 0,
        percentChange: published.changePct ?? 0,
      };
    }),
    updatedAt:
      [...latestPublished.values()].sort((first, second) =>
        second.publishedAt.localeCompare(first.publishedAt),
      )[0]?.publishedAt ?? indexUpdatedAt,
  };
}

async function getDatabasePublicIndexSnapshot(): Promise<PublicIndexSnapshot> {
  const [basis, basket] = await Promise.all([
    db.deliveryBasis.findUnique({ where: { code: BASIS_CODE } }),
    db.basket.findUnique({ where: { code: BASKET_CODE } }),
  ]);

  if (!basis || !basket) {
    return getMockPublicIndexSnapshot();
  }

  const dbCommodities = await db.commodity.findMany({
    orderBy: { sortOrder: "asc" },
    where: { status: "published" },
  });
  const published = await Promise.all(
    dbCommodities.map((commodity) =>
      db.publishedIndex.findFirst({
        where: {
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          basketId: basket.id,
          status: "published",
          locked: true,
        },
        orderBy: { tradeDate: "desc" },
      }),
    ),
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

    if (!publishedIndex) {
      return latestQuotes.find((quote) => quote.commodityId === mockCommodity.id)!;
    }

    return {
      id: `${mockCommodity.id}-${publishedIndex.tradeDate.toISOString()}`,
      commodityId: mockCommodity.id,
      date: publishedIndex.tradeDate.toISOString().slice(0, 10),
      basis: basis.name,
      price: publishedIndex.valueUsdPerMt.toNumber(),
      absoluteChange: publishedIndex.changeAbsUsdPerMt?.toNumber() ?? 0,
      percentChange: publishedIndex.changePct?.toNumber() ?? 0,
      respondents: 8,
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
