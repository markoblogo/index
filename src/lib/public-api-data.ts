import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { SITE_CONFIG } from "@/lib/constants";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  commodities,
  weeklySeries,
  type CommodityId,
} from "@/lib/mock-data";
import { getPublicIndexSnapshot } from "@/lib/public-index-data";
import {
  getActiveRespondentCount,
  getActiveRespondentCountData,
} from "@/lib/respondent-directory";

export type PublicLatestItem = {
  commodityId: CommodityId;
  commodityCode: string;
  commodityNameUk: string;
  commodityNameEn: string;
  date: string;
  basis: string;
  valueUsdPerMt: number;
  changeAbs: number;
  changePct: number;
  respondents: number;
};

export type PublicHistoryItem = PublicLatestItem & {
  status: "published";
};

const activeIndex = getActiveIndexConfig();
const primaryDeliveryBasis = activeIndex.deliveryBases[0];
const BASIS_CODE = primaryDeliveryBasis.code;
const BASKET_CODE = primaryDeliveryBasis.basketCode;
const demoDates = [
  "2026-05-01",
  "2026-05-02",
  "2026-05-03",
  "2026-05-04",
  "2026-05-05",
  "2026-05-06",
  "2026-05-07",
  "2026-05-08",
];

const mockCommodityIdByCode: Record<string, CommodityId> = {
  CORN: "corn",
  WHT_115: "wheat-115",
  "WHT 11.5": "wheat-115",
  FEED_WHT: "feed-wheat",
  "FEED WHT": "feed-wheat",
  GMO_SOY: "gmo-soybean",
  "GMO SOY": "gmo-soybean",
};

export async function getPublicLatestData() {
  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production public latest data.");
    }

    return getMockLatestData();
  }

  try {
    return await getDatabaseLatestData();
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock public latest data.", error);
      return getMockLatestData();
    }

    console.error("Failed to load database public latest data.", error);
    throw error;
  }
}

export async function getPublicHistoryData() {
  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production public history data.");
    }

    return getMockHistoryData();
  }

  try {
    return await getDatabaseHistoryData();
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock public history data.", error);
      return getMockHistoryData();
    }

    console.error("Failed to load database public history data.", error);
    throw error;
  }
}

async function getMockLatestData(): Promise<PublicLatestItem[]> {
  const snapshot = await getPublicIndexSnapshot();

  return snapshot.latestQuotes.map((quote) => {
    const commodity = commodities.find((item) => item.id === quote.commodityId)!;

    return {
      commodityId: commodity.id,
      commodityCode: commodity.code,
      commodityNameUk: commodity.name.uk,
      commodityNameEn: commodity.name.en,
      date: quote.date,
      basis: quote.basis,
      valueUsdPerMt: quote.price,
      changeAbs: quote.absoluteChange,
      changePct: quote.percentChange,
      respondents: quote.respondents,
    };
  });
}

function getMockHistoryData(): PublicHistoryItem[] {
  const activeRespondentCount = getActiveRespondentCount();

  return commodities.flatMap((commodity) =>
    weeklySeries[commodity.id].map((value, index, values) => {
      const previousValue = values[index - 1] ?? value;
      const changeAbs = roundOne(value - previousValue);

      return {
        commodityId: commodity.id,
        commodityCode: commodity.code,
        commodityNameUk: commodity.name.uk,
        commodityNameEn: commodity.name.en,
        date: demoDates[index],
        basis: SITE_CONFIG.defaultDeliveryBasis,
        valueUsdPerMt: value,
        changeAbs,
        changePct:
          previousValue === 0 ? 0 : roundTwo((changeAbs / previousValue) * 100),
        respondents: activeRespondentCount,
        status: "published",
      };
    }),
  );
}

async function getDatabaseLatestData(): Promise<PublicLatestItem[]> {
  const [basis, basket, dbCommodities] = await Promise.all([
    db.deliveryBasis.findUnique({ where: { code: BASIS_CODE } }),
    db.basket.findUnique({ where: { code: BASKET_CODE } }),
    db.commodity.findMany({
      orderBy: { sortOrder: "asc" },
      where: { status: "published" },
    }),
  ]);

  if (!basis || !basket) {
    if (allowMockFallback()) {
      return getMockLatestData();
    }

    throw new Error(`Missing basis or basket for ${BASIS_CODE}/${BASKET_CODE}.`);
  }
  const activeRespondentCount = await getActiveRespondentCountData();

  const rows = await Promise.all(
    dbCommodities.map(async (commodity) => {
      const published = await db.publishedIndex.findFirst({
        orderBy: { tradeDate: "desc" },
        where: {
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          basketId: basket.id,
          locked: true,
          status: "published",
        },
      });

      if (!published) {
        return null;
      }

      return {
        commodityId: mockCommodityIdByCode[commodity.code] ?? "corn",
        commodityCode: commodity.code,
        commodityNameUk: commodity.nameUk,
        commodityNameEn: commodity.nameEn,
        date: published.tradeDate.toISOString().slice(0, 10),
        basis: basis.name,
        valueUsdPerMt: published.valueUsdPerMt.toNumber(),
        changeAbs: published.changeAbsUsdPerMt?.toNumber() ?? 0,
        changePct: published.changePct?.toNumber() ?? 0,
        respondents: activeRespondentCount,
      };
    }),
  );

  return rows.filter((row): row is PublicLatestItem => Boolean(row));
}

async function getDatabaseHistoryData(): Promise<PublicHistoryItem[]> {
  const [basis, basket] = await Promise.all([
    db.deliveryBasis.findUnique({ where: { code: BASIS_CODE } }),
    db.basket.findUnique({ where: { code: BASKET_CODE } }),
  ]);

  if (!basis || !basket) {
    if (allowMockFallback()) {
      return getMockHistoryData();
    }

    throw new Error(`Missing basis or basket for ${BASIS_CODE}/${BASKET_CODE}.`);
  }
  const activeRespondentCount = await getActiveRespondentCountData();

  const rows = await db.publishedIndex.findMany({
    include: { commodity: true },
    orderBy: [{ tradeDate: "desc" }, { commodity: { sortOrder: "asc" } }],
    take: 365,
    where: {
      deliveryBasisId: basis.id,
      basketId: basket.id,
      locked: true,
      status: "published",
    },
  });

  return rows.map((row) => ({
    commodityId: mockCommodityIdByCode[row.commodity.code] ?? "corn",
    commodityCode: row.commodity.code,
    commodityNameUk: row.commodity.nameUk,
    commodityNameEn: row.commodity.nameEn,
    date: row.tradeDate.toISOString().slice(0, 10),
    basis: basis.name,
    valueUsdPerMt: row.valueUsdPerMt.toNumber(),
    changeAbs: row.changeAbsUsdPerMt?.toNumber() ?? 0,
    changePct: row.changePct?.toNumber() ?? 0,
    respondents: activeRespondentCount,
    status: "published",
  }));
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}
