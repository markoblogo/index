import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { spikeVerifiedPriceArchive } from "@/data/spike-verified-price-archive";
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
  status: "published" | "verified_archive";
  valueUsdPerMt: number;
};

const activeIndex = getActiveIndexConfig();
const PUBLIC_HISTORY_DAY_LIMIT = 10;
const PUBLIC_INDEX_DATA_CACHE_SECONDS = 12 * 60 * 60;
const publicIndexCacheTags = ["public-index-data"];
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

function formatPublicChangeAbs(value: number) {
  return activeIndex.id === "spike-ua" ? Math.round(value) : roundOne(value);
}

export async function getPublicLatestData() {
  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production public latest data.");
    }

    return getMockLatestData();
  }

  try {
    return await getCachedDatabaseLatestData();
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock public latest data.", error);
      return getMockLatestData();
    }

    console.error("Failed to load database public latest data.", error);
    throw error;
  }
}

export async function getPublicHistoryData(options: {
  dayLimit?: number;
  scope?: "public" | "analytics";
} = {}) {
  const dayLimit =
    options.scope === "analytics" ? undefined : options.dayLimit ?? PUBLIC_HISTORY_DAY_LIMIT;

  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production public history data.");
    }

    return selectRecentPublicHistoryDays(getMockHistoryData(), dayLimit);
  }

  try {
    return dayLimit
      ? await getCachedDatabasePublicHistoryData(dayLimit)
      : await getCachedDatabaseAnalyticsHistoryData();
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock public history data.", error);
      return selectRecentPublicHistoryDays(getMockHistoryData(), dayLimit);
    }

    console.error("Failed to load database public history data.", error);
    throw error;
  }
}

const getCachedDatabaseLatestData = unstable_cache(
  async () => getDatabaseLatestData(),
  ["public-latest-data", activeIndex.id],
  {
    revalidate: PUBLIC_INDEX_DATA_CACHE_SECONDS,
    tags: publicIndexCacheTags,
  },
);

const getCachedDatabaseHistoryData = unstable_cache(
  async (dayLimit: number) => getDatabaseHistoryData({ dayLimit }),
  ["public-history-data", activeIndex.id],
  {
    revalidate: PUBLIC_INDEX_DATA_CACHE_SECONDS,
    tags: publicIndexCacheTags,
  },
);

const getCachedDatabaseAnalyticsHistoryData = unstable_cache(
  async () => getDatabaseHistoryData({ scope: "analytics" }),
  ["public-analytics-history-data", activeIndex.id],
  {
    revalidate: PUBLIC_INDEX_DATA_CACHE_SECONDS,
    tags: publicIndexCacheTags,
  },
);

const getCachedDatabasePublicHistoryData = getCachedDatabaseHistoryData;

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
      const changeAbs = formatPublicChangeAbs(value - previousValue);
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
      const previousPublished = published
        ? await db.publishedIndex.findFirst({
            orderBy: { tradeDate: "desc" },
            where: {
              commodityId: commodity.id,
              deliveryBasisId: basis.id,
              basketId: basket.id,
              status: "published",
              tradeDate: { lt: published.tradeDate },
            },
          })
        : null;
      const publishedChange = published
        ? computeChange(
            published.valueUsdPerMt.toNumber(),
            previousPublished?.valueUsdPerMt.toNumber() ?? null,
          )
        : null;

      if (!published) {
        return null;
      }

      return {
        commodityId: mockCommodityIdByCode[commodity.code] ?? "corn",
        commodityCode: commodity.code,
        commodityNameUk: commodity.nameUk,
        commodityNameEn: commodity.nameEn,
        date:
          published.tradeDate.toISOString().slice(0, 10),
        basis: basisConfig.name,
        valueUsdPerMt: published.valueUsdPerMt.toNumber(),
        changeAbs: formatPublicChangeAbs(
          publishedChange?.changeAbs ?? 0,
        ),
        changePct: publishedChange?.changePct ?? 0,
        respondents: activeRespondentCount,
      };
    }),
  );

  return rows.filter((row): row is PublicLatestItem => Boolean(row));
}

async function getDatabaseHistoryData(options: {
  dayLimit?: number;
  scope?: "analytics";
} = {}): Promise<PublicHistoryItem[]> {
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
    take: options.dayLimit
      ? Math.max(options.dayLimit * activeIndex.commodities.length * 2, 120)
      : activeIndex.id === "spike-ua" ? 5000 : 365,
    where: {
      deliveryBasisId: { in: basisIds },
      basketId: { in: basketIds },
      status: "published",
    },
  });

  const publishedRows: PublicHistoryItem[] = rows
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
      changeAbs: formatPublicChangeAbs(row.changeAbsUsdPerMt?.toNumber() ?? 0),
      changePct: row.changePct?.toNumber() ?? 0,
      respondents: activeRespondentCount,
      status: "published",
    }));

  const history = activeIndex.id === "spike-ua"
    ? mergeSpikeVerifiedArchiveHistory(publishedRows, activeRespondentCount)
    : publishedRows;

  return selectRecentPublicHistoryDays(history, options.dayLimit);
}

function selectRecentPublicHistoryDays<T extends { date: string }>(
  rows: T[],
  dayLimit: number | undefined,
) {
  if (!dayLimit) {
    return rows;
  }

  const dates = [...new Set(rows.map((row) => row.date))]
    .sort((first, second) => second.localeCompare(first))
    .slice(0, dayLimit);
  const dateSet = new Set(dates);

  return rows.filter((row) => dateSet.has(row.date));
}

function mergeSpikeVerifiedArchiveHistory(
  publishedRows: PublicHistoryItem[],
  activeRespondentCount: number,
): PublicHistoryItem[] {
  const existingKeys = new Set(
    publishedRows.map((row) => `${row.date}:${row.commodityId}`),
  );
  const archiveRows = spikeVerifiedPriceArchive
    .filter((row) => !existingKeys.has(`${row.date}:${row.commodityId}`))
    .flatMap((row): PublicHistoryItem[] => {
      const commodity = commodities.find((item) => item.id === row.commodityId);

      if (!commodity) {
        return [];
      }

      const basis = getDeliveryBasisConfigForCommodityCode(
        commodity.code,
        activeIndex,
      ).name;

      return [
        {
          basis,
          changeAbs: 0,
          changePct: 0,
          commodityCode: commodity.code,
          commodityId: commodity.id,
          commodityNameEn: commodity.name.en,
          commodityNameUk: commodity.name.uk,
          date: row.date,
          respondents: activeRespondentCount,
          status: "verified_archive",
          valueUsdPerMt: row.valueUsdPerMt,
        },
      ];
    });

  return recomputeHistoryChanges([...archiveRows, ...publishedRows]);
}

function recomputeHistoryChanges(rows: PublicHistoryItem[]) {
  const previousByCommodityId = new Map<CommodityId, PublicHistoryItem>();

  return rows
    .sort((first, second) =>
      first.date === second.date
        ? first.commodityId.localeCompare(second.commodityId)
        : first.date.localeCompare(second.date),
    )
    .map((row) => {
      const previous = previousByCommodityId.get(row.commodityId);
      const change = computeChange(row.valueUsdPerMt, previous?.valueUsdPerMt ?? null);
      const next = {
        ...row,
        changeAbs: formatPublicChangeAbs(change.changeAbs),
        changePct: change.changePct,
      };

      previousByCommodityId.set(row.commodityId, next);
      return next;
    });
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function computeChange(latest: number, previous: number | null) {
  if (previous === null || previous === 0) {
    return { changeAbs: 0, changePct: 0 };
  }

  const changeAbs = roundOne(latest - previous);

  return {
    changeAbs,
    changePct: roundTwo((changeAbs / previous) * 100),
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
