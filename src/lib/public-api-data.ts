import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  commodities,
  weeklySeries,
  type CommodityId,
} from "@/lib/mock-data";
import { getPublicIndexSnapshot } from "@/lib/public-index-data";
import { syncIndexPositionDirectory } from "@/lib/position-directory-sync";
import {
  getActiveRespondentCount,
  getActiveRespondentCountData,
} from "@/lib/respondent-directory";
import {
  getConfiguredDeliveryBasisCodes,
  getDeliveryBasketCodeForCommodityCode,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";
import { getSpikePublicVisibleTradeDate } from "@/lib/spike-publication-window";
import { getLatestSubmissionFallbacks } from "@/lib/public-submission-fallbacks";

export type PublicLatestItem = {
  commodityId: CommodityId;
  commodityCode: string;
  commodityNameUk: string;
  commodityNameEn: string;
  date: string;
  basis: string;
  valueUsdPerMt: number | null;
  changeAbs: number;
  changePct: number;
  respondents: number;
};

export type PublicHistoryItem = Omit<PublicLatestItem, "valueUsdPerMt"> & {
  status: "published";
  valueUsdPerMt: number;
};

const activeIndex = getActiveIndexConfig();
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

const mockCommodityIdByCode: Record<string, CommodityId> = Object.fromEntries(
  activeIndex.commodities.flatMap((commodity) => [
    [commodity.dbCode, commodity.id],
    [commodity.code, commodity.id],
  ]),
) as Record<string, CommodityId>;

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
      const basisConfig = getDeliveryBasisConfigForCommodityCode(
        commodity.code,
        activeIndex,
      );

      return {
        commodityId: commodity.id,
        commodityCode: commodity.code,
        commodityNameUk: commodity.name.uk,
        commodityNameEn: commodity.name.en,
        date: demoDates[index],
        basis: basisConfig.name,
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
  await syncIndexPositionDirectory(activeIndex);

  const [bases, baskets, dbCommodities] = await Promise.all([
    db.deliveryBasis.findMany({
      where: { code: { in: getConfiguredDeliveryBasisCodes(activeIndex) } },
    }),
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

  if (bases.length === 0 || baskets.length === 0) {
    if (allowMockFallback()) {
      return getMockLatestData();
    }

    throw new Error("Missing configured basis or basket.");
  }
  const activeRespondentCount = await getActiveRespondentCountData();
  const visibleTradeDate =
    activeIndex.id === "spike-ua" ? getSpikePublicVisibleTradeDate() : todayKyivDate();
  const visibleTradeDateAtMidnightUtc = new Date(`${visibleTradeDate}T00:00:00.000Z`);
  const submissionFallbackByCommodityId = await getLatestSubmissionFallbacks({
    basisByCommodityId,
    commodities: dbCommodities,
    visibleTradeDate: visibleTradeDateAtMidnightUtc,
  });

  const rows = await Promise.all(
    dbCommodities.map(async (commodity) => {
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

      const published = await db.publishedIndex.findFirst({
        orderBy: { tradeDate: "desc" },
        where: {
          commodityId: commodity.id,
          deliveryBasisId: basis.id,
          basketId: basket.id,
          status: "published",
          tradeDate: { lte: visibleTradeDateAtMidnightUtc },
        },
      });
      const submissionFallback = submissionFallbackByCommodityId.get(commodity.id);

      return {
        commodityId: mockCommodityIdByCode[commodity.code] ?? "corn",
        commodityCode: commodity.code,
        commodityNameUk: commodity.nameUk,
        commodityNameEn: commodity.nameEn,
        date:
          published?.tradeDate.toISOString().slice(0, 10) ??
          submissionFallback?.date ??
          visibleTradeDate,
        basis: basisConfig.name,
        valueUsdPerMt:
          published?.valueUsdPerMt.toNumber() ?? submissionFallback?.value ?? null,
        changeAbs: published?.changeAbsUsdPerMt?.toNumber() ?? 0,
        changePct: published?.changePct?.toNumber() ?? 0,
        respondents: published
          ? activeRespondentCount
          : (submissionFallback?.rawCount ?? activeRespondentCount),
      };
    }),
  );

  return rows.filter((row): row is PublicLatestItem => Boolean(row));
}

async function getDatabaseHistoryData(): Promise<PublicHistoryItem[]> {
  await syncIndexPositionDirectory(activeIndex);

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
  const basisIds = bases.map((basis) => basis.id);
  const basketIds = baskets.map((basket) => basket.id);

  if (basisIds.length === 0 || basketIds.length === 0) {
    if (allowMockFallback()) {
      return getMockHistoryData();
    }

    throw new Error("Missing configured basis or basket.");
  }
  const activeRespondentCount = await getActiveRespondentCountData();

  const rows = await db.publishedIndex.findMany({
    include: { commodity: true },
    orderBy: [{ tradeDate: "desc" }, { commodity: { sortOrder: "asc" } }],
    take: 365,
    where: {
      deliveryBasisId: { in: basisIds },
      basketId: { in: basketIds },
      status: "published",
    },
  });

  return rows
    .filter((row) => {
      const basisConfig = getDeliveryBasisConfigForCommodityCode(
        row.commodity.code,
        activeIndex,
      );
      const basketCode = getDeliveryBasketCodeForCommodityCode(
        row.commodity.code,
        activeIndex,
      );

      return (
        row.deliveryBasisId === basisByCode.get(basisConfig.code)?.id &&
        row.basketId === basketByCode.get(basketCode)?.id
      );
    })
    .map((row) => ({
      commodityId: mockCommodityIdByCode[row.commodity.code] ?? "corn",
      commodityCode: row.commodity.code,
      commodityNameUk: row.commodity.nameUk,
      commodityNameEn: row.commodity.nameEn,
      date: row.tradeDate.toISOString().slice(0, 10),
      basis: getDeliveryBasisConfigForCommodityCode(row.commodity.code, activeIndex)
        .name,
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

function todayKyivDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(new Date());
}
