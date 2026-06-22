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
import { syncIndexPositionDirectory } from "@/lib/position-directory-sync";
import { buildRealSparkline } from "@/lib/sparkline";
import {
  getConfiguredDeliveryBasisCodes,
  getDeliveryBasketCodeForCommodityCode,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";
import { getSpikePublicVisibleTradeDate } from "@/lib/spike-publication-window";
import { getLatestSubmissionFallbacks } from "@/lib/public-submission-fallbacks";

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
  const latestVisiblePublished = new Map(
    visiblePublishedEntries.reduce(
      (map, entry) => {
        const current = map.get(entry.commodityId);
        if (!current || entry.date > current.date) {
          map.set(entry.commodityId, entry);
        }
        return map;
      },
      new Map<string, (typeof visiblePublishedEntries)[number]>(),
    ),
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
      [...latestPublished.values()]
        .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt))[0]
        ?.publishedAt ??
      indexUpdatedAt,
  };
}

async function getDatabasePublicIndexSnapshot(): Promise<PublicIndexSnapshot> {
  await syncIndexPositionDirectory(activeIndex);

  const activeRespondentCount = await getActiveRespondentCountData();
  const today = todayKyivDate();
  const candidateVisibleTradeDate =
    activeIndex.id === "spike-ua" ? getSpikePublicVisibleTradeDate() : today;
  const candidateVisibleTradeDateAtMidnightUtc = dateToUtcDate(candidateVisibleTradeDate);
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
  const basketIds = [
    ...new Set([...basketByCommodityId.values()].map((basket) => basket.id)),
  ];
  const latestVisiblePublished =
    activeIndex.id === "spike-ua"
      ? await db.publishedIndex.findFirst({
          orderBy: { tradeDate: "desc" },
          where: {
            basketId: { in: basketIds },
            deliveryBasisId: { in: basisIds },
            status: "published",
            tradeDate: { lte: candidateVisibleTradeDateAtMidnightUtc },
          },
        })
      : null;
  const visibleTradeDate =
    activeIndex.id === "spike-ua"
      ? (latestVisiblePublished?.tradeDate.toISOString().slice(0, 10) ??
        candidateVisibleTradeDate)
      : candidateVisibleTradeDate;
  const visibleTradeDateAtMidnightUtc = dateToUtcDate(visibleTradeDate);
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
          tradeDate: { lte: visibleTradeDateAtMidnightUtc },
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
          tradeDate: { lte: visibleTradeDateAtMidnightUtc },
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
  const publishedByCommodityId = new Map(
    published
      .filter((index): index is NonNullable<typeof index> => Boolean(index))
      .map((index) => [index.commodityId, index]),
  );
  const submissionFallbackByCommodityId = await getLatestSubmissionFallbacks({
    basisByCommodityId,
    commodities: dbCommodities,
    maxTradeDate: visibleTradeDateAtMidnightUtc,
  });
  const latestSubmissionFallbackByCommodityId = await getLatestSubmissionFallbacks({
    basisByCommodityId,
    commodities: dbCommodities,
  });
  const latestPublishedDate =
    [...publishedByCommodityId.values()]
      .map((index) => index.tradeDate.toISOString().slice(0, 10))
      .sort()
      .at(-1) ?? visibleTradeDate;
  const [aiCommentsUk, aiCommentsEn] =
    activeIndex.id === "spike-ua"
      ? await loadLatestAiComments()
      : [{}, {}];
  const publicCommodities = dbCommodities.map((commodity) => {
    const mockCommodity = mockCommodityByCode.get(commodity.code) ?? commodities[0];
    const publishedIndex = publishedByCommodityId.get(commodity.id);
    const submissionFallback =
      submissionFallbackByCommodityId.get(commodity.id) ??
      (publishedIndex ? null : latestSubmissionFallbackByCommodityId.get(commodity.id));
    const displayFallback =
      submissionFallback &&
      (!publishedIndex ||
        submissionFallback.date > publishedIndex.tradeDate.toISOString().slice(0, 10))
        ? submissionFallback
        : null;
    const history = recentPublishedByCommodityId.get(commodity.id) ?? [];
    const storedAiComment = {
      en: aiCommentsEn[commodity.code] ?? aiCommentsEn[mockCommodity.code] ?? "",
      uk: aiCommentsUk[commodity.code] ?? aiCommentsUk[mockCommodity.code] ?? "",
    };

    if (!publishedIndex || displayFallback) {
      const latest = displayFallback?.value ?? null;
      const previous =
        displayFallback?.previousValue ?? publishedIndex?.valueUsdPerMt.toNumber() ?? null;
      const change =
        latest === null
          ? { changeAbs: 0, changePct: 0 }
          : computeChange(latest, previous);
      const latestDate =
        displayFallback?.date ??
        publishedIndex?.tradeDate.toISOString().slice(0, 10) ??
        latestPublishedDate;
      const aiComment = buildCardAiComment({
        dayChange: change.changeAbs,
        history,
        latest,
        latestDate,
        stored: storedAiComment,
      });

      return {
        ...mockCommodity,
        code: commodity.code,
        name: { uk: commodity.nameUk, en: commodity.nameEn },
        latest,
        absoluteChange: change.changeAbs,
        percentChange: change.changePct,
        sparkline: buildRealSparkline(history, latest),
        aiComment,
      };
    }

    const latest = publishedIndex.valueUsdPerMt.toNumber();
    const latestDate = publishedIndex.tradeDate.toISOString().slice(0, 10);
    const aiComment = buildCardAiComment({
      dayChange: publishedIndex.changeAbsUsdPerMt?.toNumber() ?? 0,
      history,
      latest,
      latestDate,
      stored: storedAiComment,
    });

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
    const submissionFallback =
      submissionFallbackByCommodityId.get(commodity.id) ??
      (publishedIndex ? null : latestSubmissionFallbackByCommodityId.get(commodity.id));
    const displayFallback =
      submissionFallback &&
      (!publishedIndex ||
        submissionFallback.date > publishedIndex.tradeDate.toISOString().slice(0, 10))
        ? submissionFallback
        : null;
    const basisConfig = getDeliveryBasisConfigForCommodityCode(
      commodity.code,
      activeIndex,
    );

    if (!publishedIndex || displayFallback) {
      const quote = latestQuotes.find(
        (item) => item.commodityId === mockCommodity.id,
      )!;
      const previous =
        displayFallback?.previousValue ?? publishedIndex?.valueUsdPerMt.toNumber() ?? null;
      const change =
        displayFallback?.value === undefined
          ? { changeAbs: 0, changePct: 0 }
          : computeChange(displayFallback.value, previous);
      return {
        ...quote,
        basis: basisConfig.name,
        date: displayFallback?.date ?? latestPublishedDate,
        price: displayFallback?.value ?? null,
        absoluteChange: change.changeAbs,
        percentChange: change.changePct,
        respondents: displayFallback?.rawCount ?? activeRespondentCount,
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
        .map((index) => index.publishedAt)
        .sort((first, second) => second.getTime() - first.getTime())[0]
        ?.toISOString() ?? indexUpdatedAt,
  };
}

async function loadLatestAiComments() {
  const { getLatestAiCardComments } = await import("@/lib/ai-market-brief-public");
  return Promise.all([
    getLatestAiCardComments("uk"),
    getLatestAiCardComments("en"),
  ]);
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

function buildCardAiComment({
  dayChange,
  history,
  latest,
  latestDate,
  stored,
}: {
  dayChange: number;
  history: Array<{ date: string; value: number }>;
  latest: number | null;
  latestDate: string;
  stored: Record<"en" | "uk", string>;
}) {
  if (latest === null) {
    return stored;
  }

  const weeklyChange = computeChangeFromPreviousFriday(history, latest, latestDate);

  if (weeklyChange === null) {
    return stored;
  }

  return {
    en: `Today the index changed by ${formatUsdPerT(dayChange, "en")} versus the previous day. The weekly change versus last Friday was ${formatUsdPerT(weeklyChange, "en")}.`,
    uk: `Сьогодні індекс змінився на ${formatUsdPerT(dayChange, "uk")} відносно минулого дня. Тижнева зміна відносно минулої п'ятниці склала ${formatUsdPerT(weeklyChange, "uk")}.`,
  };
}

function computeChangeFromPreviousFriday(
  history: Array<{ date: string; value: number }>,
  latest: number,
  latestDate: string,
) {
  const previousFriday = getPreviousFridayDate(latestDate);
  const reference = history
    .filter((point) => point.date <= previousFriday)
    .sort((first, second) => first.date.localeCompare(second.date))
    .at(-1);

  return reference ? roundOne(latest - reference.value) : null;
}

function getPreviousFridayDate(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay();
  const daysSinceFriday = (day + 2) % 7;
  value.setUTCDate(value.getUTCDate() - (daysSinceFriday === 0 ? 7 : daysSinceFriday));
  return value.toISOString().slice(0, 10);
}

function formatUsdPerT(value: number, locale: "en" | "uk") {
  const rounded = roundOne(value);
  const amount = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  const unit = locale === "uk" ? "$/т" : "$/t";
  return `${rounded > 0 ? "+" : ""}${amount}${unit}`;
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

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
