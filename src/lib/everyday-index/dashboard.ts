import {
  CONSUMER_COUNTRIES,
  EVERYDAY_UPDATE_POLICY,
  SAFE_NEAREST_COUNTRY_BY_ISO2,
} from "@/lib/everyday-index/config";
import { getEverydaySourceRegistry } from "@/lib/everyday-index/adapters";
import type {
  ChartSeries,
  ConsumerCountry,
  ConsumerIndexKey,
  EverydayIndexDashboard,
  RankingBlock,
} from "@/lib/everyday-index/types";

export async function getEverydayIndexDashboard(args: {
  country?: string | null;
  geoCountry?: string | null;
}): Promise<EverydayIndexDashboard> {
  const detectedCountryIso2 = normalizeCountryCode(args.geoCountry);
  const selectedCountry = resolveConsumerCountry(args.country, detectedCountryIso2);
  const [burgerCard, rankings, chartSeries] = await Promise.all([
    buildBurgerCard(selectedCountry),
    buildRankings(),
    buildChartSeries(selectedCountry),
  ]);

  return {
    selectedCountry,
    countries: CONSUMER_COUNTRIES,
    detectedCountryIso2,
    chartMode: "rebased_to_100",
    cards: [
      burgerCard,
      buildUnavailableCard(
        "latte",
        "Latte Index",
        "Official Starbucks source adapters are scaffolded but not yet publishing.",
      ),
      buildUnavailableCard(
        "iphone_price",
        "iPhone Index",
        "Apple retail parsers are scaffolded but remain blocked until validated consumer-paid prices are extracted automatically.",
      ),
    ],
    chartSeries,
    rankings,
    methodology: [
      {
        title: "Product definition",
        body:
          "Everyday Index tracks consumer-paid retail pricing across burger, latte and iPhone reference products. This first release publishes only automatically verified values and leaves unsupported products empty rather than guessing.",
      },
      {
        title: "Source hierarchy",
        body:
          "Structured datasets first, official brand sources second, reseller sources only where explicitly configured. The current burger feed uses the Economist Big Mac dataset; latte and iPhone remain scaffolded until official parsers are verified.",
      },
      {
        title: "Price basis and FX",
        body:
          "Displayed values are consumer retail prices in local currency and USD where the source supports them. VAT-inclusive consumer prices are used as displayed; delivery markups, subsidies and trade-ins are excluded.",
      },
      {
        title: "US/New York rule",
        body:
          "The US reference must use New York, NY. Because the current Big Mac structured dataset does not provide a New York-specific US reference row, cross-country burger index values versus USA are intentionally withheld in this first slice.",
      },
      {
        title: "Update policy",
        body: EVERYDAY_UPDATE_POLICY,
      },
      {
        title: "Confidence and publishing",
        body:
          "Low-confidence extractions, currency mismatches, product-lock mismatches and suspicious price jumps are rejected or quarantined. The previous published value remains in place when new data does not clear validation.",
      },
    ],
    updatePolicy: EVERYDAY_UPDATE_POLICY,
    generatedAt: new Date().toISOString(),
  };
}

export function resolveConsumerCountry(
  requestedCountry: string | null | undefined,
  detectedCountryIso2: string | null,
) {
  const requested = normalizeCountryCode(requestedCountry);
  const requestedMatch = requested
    ? CONSUMER_COUNTRIES.find((country) => country.iso2 === requested)
    : null;

  if (requestedMatch) {
    return requestedMatch;
  }

  const detectedMatch = detectedCountryIso2
    ? CONSUMER_COUNTRIES.find((country) => country.iso2 === detectedCountryIso2)
    : null;

  if (detectedMatch) {
    return detectedMatch;
  }

  const nearestIso2 =
    (detectedCountryIso2 && SAFE_NEAREST_COUNTRY_BY_ISO2[detectedCountryIso2]) ?? "US";

  return (
    CONSUMER_COUNTRIES.find((country) => country.iso2 === nearestIso2) ??
    CONSUMER_COUNTRIES[0]
  );
}

export function rebaseSeriesTo100(values: Array<{ date: string; value: number }>) {
  const start = values[0]?.value;

  if (!start || start <= 0) {
    return [];
  }

  return values.map((point) => ({
    date: point.date,
    value: Number(((point.value / start) * 100).toFixed(2)),
  }));
}

async function buildBurgerCard(selectedCountry: ConsumerCountry) {
  if (selectedCountry.iso2 === "US") {
    return {
      key: "burger" as const,
      title: "Burger Index",
      localPriceLabel: "Unavailable",
      usdPriceLabel: "Unavailable",
      indexVsUsLabel: "Pending New York reference",
      sourceComparisonLabel: "Unavailable",
      lastVerifiedLabel: "Not published",
      status: "unsupported" as const,
      statusLabel: "Needs NYC-specific source",
      confidenceLabel: "No publishable reference",
      note:
        "The Economist structured dataset does not provide a New York, NY-specific retail reference row, so USA/New York burger comparisons remain intentionally unavailable in the scaffold.",
      sparkline: [],
      realData: false,
    };
  }

  return buildUnavailableCard(
    "burger",
    "Burger Index",
    "The Economist Big Mac adapter is scaffolded, but this initial dashboard slice does not publish persisted burger values yet.",
  );
}

async function buildChartSeries(selectedCountry: ConsumerCountry): Promise<ChartSeries[]> {
  return [
    {
      key: "burger",
      label: "Burger Index",
      status: "unavailable",
      values: [],
    },
    {
      key: "latte",
      label: "Latte Index",
      status: "unsupported",
      values: [],
    },
    {
      key: "iphone_price",
      label: "iPhone Price Index",
      status: "unsupported",
      values: [],
    },
    {
      key: "iphone_workdays",
      label: "iPhone Workdays Index",
      status: "unsupported",
      values: [],
    },
    {
      key: "brent_oil",
      label: "Brent Oil",
      status: "unsupported",
      values: [],
    },
    {
      key: "wti_oil",
      label: "WTI Oil",
      status: "unsupported",
      values: [],
    },
    {
      key: "gold",
      label: "Gold",
      status: "unsupported",
      values: [],
    },
  ];
}

async function buildRankings(): Promise<RankingBlock[]> {
  return [
    buildUnavailableRanking("burger", "Burger", "Burger rankings stay withheld until persisted verified burger publications are available."),
    buildUnavailableRanking("latte", "Latte", "Official public latte source automation is not live yet."),
    buildUnavailableRanking("iphone_price", "iPhone price", "Retail iPhone source automation is scaffolded but not publishing yet."),
    {
      key: "iphone_workdays",
      title: "iPhone workdays",
      available: false,
      note: "Wage and tax ingestion is not configured yet, so affordability rankings are withheld.",
    },
  ];
}

function buildUnavailableCard(
  key: ConsumerIndexKey,
  title: string,
  note: string,
) {
  return {
    key,
    title,
    localPriceLabel: "Unavailable",
    usdPriceLabel: "Unavailable",
    indexVsUsLabel: "Unavailable",
    sourceComparisonLabel: "Unavailable",
    lastVerifiedLabel: "Not published",
    status: "unsupported" as const,
    statusLabel: "Scaffolded only",
    confidenceLabel: "No verified source",
    note,
    sparkline: [],
    realData: false,
  };
}

function buildUnavailableRanking(
  key: ConsumerIndexKey,
  title: string,
  note: string,
): RankingBlock {
  return {
    key,
    title,
    available: false,
    note,
  };
}

function normalizeCountryCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  return normalized && normalized.length === 2 ? normalized : null;
}

export function getEverydayArchitectureSummary() {
  return {
    countries: CONSUMER_COUNTRIES.length,
    sourceRegistry: getEverydaySourceRegistry(),
  };
}
