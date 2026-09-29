import { BASKET_PRODUCTS, BASKET_SOURCES } from "@/lib/basket/products";
import {
  calculateComposite,
  calculateCorrelation,
  enrichObservation,
  rebaseSeriesTo100,
} from "@/lib/basket/formulas";
import type {
  BasketChartSeries,
  BasketLatestResponse,
  BasketMarket,
  BasketObservation,
  BasketProductId,
} from "@/lib/basket/types";

const updatedAt = "2026-06-30T09:30:00.000Z";

const observations: BasketObservation[] = [
  {
    product: "bigmac",
    market: "GLOBAL",
    date: "2026-06-30",
    valueUsd: 6.12,
    baselineUsd: 5.21,
    source: BASKET_SOURCES.economistBigMac,
    confidence: "verified",
    status: "published",
  },
  {
    product: "latte",
    market: "GLOBAL",
    date: "2026-06-30",
    valueUsd: 5.45,
    baselineUsd: 4.86,
    source: BASKET_SOURCES.starbucksMonitor,
    confidence: "monitored",
    status: "monitored",
  },
  {
    product: "iphone",
    market: "GLOBAL",
    date: "2026-06-30",
    valueUsd: 1099,
    baselineUsd: 1011,
    source: BASKET_SOURCES.appleStore,
    confidence: "seed",
    status: "monitored",
  },
  {
    product: "bigmac",
    market: "US",
    date: "2026-06-30",
    valueUsd: 5.21,
    baselineUsd: 5.21,
    source: BASKET_SOURCES.economistBigMac,
    confidence: "verified",
    status: "published",
  },
  {
    product: "latte",
    market: "US",
    date: "2026-06-30",
    valueUsd: 4.86,
    baselineUsd: 4.86,
    source: BASKET_SOURCES.starbucksMonitor,
    confidence: "monitored",
    status: "monitored",
  },
  {
    product: "iphone",
    market: "US",
    date: "2026-06-30",
    valueUsd: 999,
    baselineUsd: 999,
    source: BASKET_SOURCES.appleStore,
    confidence: "verified",
    status: "published",
  },
  {
    product: "bigmac",
    market: "UA",
    date: "2026-06-30",
    valueUsd: 4.34,
    baselineUsd: 5.21,
    source: BASKET_SOURCES.economistBigMac,
    confidence: "verified",
    status: "published",
  },
  {
    product: "latte",
    market: "UA",
    date: "2026-06-30",
    valueUsd: null,
    baselineUsd: 4.86,
    source: BASKET_SOURCES.starbucksMonitor,
    confidence: "unavailable",
    status: "unavailable",
    note: "Ukraine Starbucks Latte source is not verified for MVP.",
  },
  {
    product: "iphone",
    market: "UA",
    date: "2026-06-30",
    valueUsd: 1180,
    baselineUsd: 999,
    source: BASKET_SOURCES.appleStore,
    confidence: "seed",
    status: "monitored",
  },
];

const productSparklines: Record<BasketProductId, number[]> = {
  bigmac: [97, 98, 96, 99, 101, 103, 102, 106, 108, 111, 113, 117],
  latte: [94, 96, 99, 98, 101, 104, 103, 106, 108, 110, 111, 112],
  iphone: [100, 101, 103, 105, 104, 106, 108, 109, 110, 111, 112, 113],
};

const yoy: Record<BasketProductId, number | null> = {
  bigmac: 17.4,
  latte: 12.1,
  iphone: 8.7,
};

const baseHistory = [
  { date: "2025-07-01", basket: 100, bigmac: 100, latte: 100, iphone: 100, usd: 100, brent: 100, gold: 100 },
  { date: "2025-08-01", basket: 104, bigmac: 103, latte: 101, iphone: 107, usd: 101, brent: 95, gold: 102 },
  { date: "2025-09-01", basket: 108, bigmac: 105, latte: 103, iphone: 116, usd: 102, brent: 91, gold: 105 },
  { date: "2025-10-01", basket: 106, bigmac: 102, latte: 105, iphone: 111, usd: 103, brent: 86, gold: 107 },
  { date: "2025-11-01", basket: 109, bigmac: 108, latte: 106, iphone: 114, usd: 101, brent: 82, gold: 110 },
  { date: "2025-12-01", basket: 111, bigmac: 110, latte: 108, iphone: 116, usd: 100, brent: 88, gold: 113 },
  { date: "2026-01-01", basket: 114, bigmac: 112, latte: 110, iphone: 121, usd: 102, brent: 92, gold: 116 },
  { date: "2026-02-01", basket: 116, bigmac: 115, latte: 111, iphone: 123, usd: 103, brent: 96, gold: 119 },
  { date: "2026-03-01", basket: 119, bigmac: 118, latte: 114, iphone: 126, usd: 104, brent: 93, gold: 123 },
  { date: "2026-04-01", basket: 121, bigmac: 120, latte: 116, iphone: 129, usd: 105, brent: 97, gold: 127 },
  { date: "2026-05-01", basket: 124, bigmac: 123, latte: 118, iphone: 132, usd: 104, brent: 99, gold: 130 },
  { date: "2026-06-01", basket: 127, bigmac: 126, latte: 121, iphone: 134, usd: 106, brent: 101, gold: 133 },
] as const;

const spikeUaHistory = [
  { date: "2025-07-01", corn: 100, wheat: 100, sunflower: 100 },
  { date: "2025-08-01", corn: 97, wheat: 99, sunflower: 104 },
  { date: "2025-09-01", corn: 92, wheat: 95, sunflower: 108 },
  { date: "2025-10-01", corn: 89, wheat: 93, sunflower: 106 },
  { date: "2025-11-01", corn: 91, wheat: 94, sunflower: 109 },
  { date: "2025-12-01", corn: 96, wheat: 98, sunflower: 112 },
  { date: "2026-01-01", corn: 103, wheat: 104, sunflower: 115 },
  { date: "2026-02-01", corn: 108, wheat: 107, sunflower: 117 },
  { date: "2026-03-01", corn: 111, wheat: 110, sunflower: 121 },
  { date: "2026-04-01", corn: 114, wheat: 113, sunflower: 124 },
  { date: "2026-05-01", corn: 118, wheat: 116, sunflower: 127 },
  { date: "2026-06-01", corn: 121, wheat: 119, sunflower: 131 },
] as const;

export function normalizeBasketMarket(value: string | undefined | null): BasketMarket {
  const upper = value?.toUpperCase();
  return upper === "US" || upper === "UA" || upper === "GLOBAL" ? upper : "GLOBAL";
}

export function getBasketLatest(market: BasketMarket = "GLOBAL"): BasketLatestResponse {
  const marketObservations = observations.filter((item) => item.market === market);
  const products = marketObservations.map((observation) =>
    enrichObservation(observation, {
      changeYoY: observation.status === "unavailable" ? null : yoy[observation.product],
      sparkline: productSparklines[observation.product],
    }),
  );
  const composite = calculateComposite(products);

  return {
    market,
    updatedAt,
    products,
    composite,
  };
}

export function getBasketSources() {
  return Object.values(BASKET_SOURCES);
}

export function getBasketHistory(market: BasketMarket = "GLOBAL"): BasketChartSeries[] {
  const productAvailability = getBasketLatest(market).products;
  const unavailable = new Set(
    productAvailability.filter((item) => item.status === "unavailable").map((item) => item.product),
  );
  const productSeries = [
    makeSeries("basket", "Basket Composite", "#ffc42e", "1D3X Basket composite", "basket"),
    makeSeries("bigmac", BASKET_PRODUCTS.bigmac.name, BASKET_PRODUCTS.bigmac.accent, BASKET_SOURCES.economistBigMac.label, "bigmac"),
    !unavailable.has("latte")
      ? makeSeries("latte", BASKET_PRODUCTS.latte.name, BASKET_PRODUCTS.latte.accent, BASKET_SOURCES.starbucksMonitor.label, "latte")
      : null,
    makeSeries("iphone", BASKET_PRODUCTS.iphone.name, BASKET_PRODUCTS.iphone.accent, BASKET_SOURCES.appleStore.label, "iphone"),
    makeSeries("usd", "USD Broad Index", "#4aa3ff", BASKET_SOURCES.fredUsd.label, "usd"),
    makeSeries("brent", "Brent Oil", "#ff7043", BASKET_SOURCES.commodityProxy.label, "brent"),
    makeSeries("gold", "Gold proxy", "#ffd166", BASKET_SOURCES.commodityProxy.label, "gold"),
  ].filter((item): item is BasketChartSeries => Boolean(item));

  if (market !== "UA") return productSeries;

  return [
    ...productSeries,
    makeSpikeSeries("spike-corn", "SPIKE Corn CPT Odesa", "#20d47b", "corn"),
    makeSpikeSeries("spike-wheat", "SPIKE Milling Wheat CPT Odesa", "#25d6d0", "wheat"),
    makeSpikeSeries("spike-sunflower", "SPIKE Sunflower Seed", "#ffb000", "sunflower"),
  ];
}

export function getBasketCompare(market: BasketMarket = "GLOBAL") {
  const series = getBasketHistory(market);
  const basket = series.find((item) => item.id === "basket");
  const correlations = series.map((item) => ({
    id: item.id,
    label: item.label,
    correlationToBasket:
      basket && item.id !== "basket"
        ? calculateCorrelation(
            basket.points.map((point) => point.value),
            item.points.map((point) => point.value),
          )
        : item.id === "basket"
          ? 1
          : null,
  }));

  return {
    market,
    mode: "rebasedTo100",
    series,
    correlations,
    generatedAt: new Date().toISOString(),
  };
}

export function getBasketMonthlyReport() {
  return {
    id: "basket-review-2026-06",
    title: "Global Consumer Basket Review",
    month: "June 2026",
    status: "seed",
    summary:
      "Big Mac and iPhone signals remain above the US baseline while Starbucks Latte coverage is monitored and source-dependent by market.",
    sourceGroup: "basket-global",
    cadence: "monthly",
  };
}

function makeSeries(
  id: string,
  label: string,
  color: string,
  source: string,
  key: keyof (typeof baseHistory)[number],
): BasketChartSeries {
  return {
    id,
    label,
    color,
    source,
    points: rebaseSeriesTo100(baseHistory.map((point) => ({ date: point.date, value: Number(point[key]) }))),
  };
}

function makeSpikeSeries(
  id: string,
  label: string,
  keyColor: string,
  key: keyof (typeof spikeUaHistory)[number],
): BasketChartSeries {
  return {
    id,
    label,
    color: keyColor,
    source: BASKET_SOURCES.spikePublic.label,
    points: rebaseSeriesTo100(spikeUaHistory.map((point) => ({ date: point.date, value: Number(point[key]) }))),
  };
}
