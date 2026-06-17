import {
  CONSUMER_COUNTRIES,
  EVERYDAY_UPDATE_POLICY,
  SAFE_NEAREST_COUNTRY_BY_ISO2,
} from "@/lib/everyday-index/config";
import { getEverydaySourceRegistry } from "@/lib/everyday-index/adapters";
import { getPersistedBurgerDataset } from "@/lib/everyday-index/burger-publish";
import { db, hasDatabaseUrl } from "@/lib/db";
import type {
  ChartSeries,
  ConsumerCountry,
  ConsumerIndexKey,
  EverydayIndexDashboard,
  RankingBlock,
} from "@/lib/everyday-index/types";

const EVERYDAY_PREVIEW_STATUS =
  `Manual preview publish. Intended policy: ${EVERYDAY_UPDATE_POLICY}`;

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
        title: "Planned publication policy",
        body:
          `The current preview is updated by manual import and verification runs. Intended steady-state policy: ${EVERYDAY_UPDATE_POLICY}`,
      },
      {
        title: "Confidence and publishing",
        body:
          "Low-confidence extractions, currency mismatches, product-lock mismatches and suspicious price jumps are rejected or quarantined. The previous published value remains in place when new data does not clear validation.",
      },
    ],
    updatePolicy: EVERYDAY_PREVIEW_STATUS,
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
  const persisted = await getPersistedBurgerCard(selectedCountry);

  if (persisted) {
    return persisted;
  }

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
        "No persisted Burger/Big Mac value is available for the United States. A New York, NY-specific retail reference is still required before any USA/New York comparison can be published.",
      sparkline: [],
      realData: false,
    };
  }

  return buildUnavailableCard(
    "burger",
    "Burger Index",
    "No persisted verified burger value is currently available for this country.",
  );
}

async function buildChartSeries(selectedCountry: ConsumerCountry): Promise<ChartSeries[]> {
  const burgerHistory = await getPersistedBurgerHistory(selectedCountry.iso3);

  return [
    {
      key: "burger",
      label: "Burger Index",
      status: burgerHistory.length > 1 ? "verified" : "unavailable",
      values: rebaseSeriesTo100(burgerHistory),
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
  const rankingRows = await getPersistedBurgerRankingRows();
  const mostExpensive = rankingRows[0];
  const leastExpensive = rankingRows[rankingRows.length - 1];

  return [
    {
      key: "burger",
      title: "Burger",
      available: Boolean(mostExpensive && leastExpensive),
      mostExpensive: mostExpensive
        ? {
            country: mostExpensive.country,
            valueLabel: formatMoney(mostExpensive.usdPrice, "USD"),
            note: `Published date ${formatDate(mostExpensive.date)}`,
          }
        : undefined,
      leastExpensive: leastExpensive
        ? {
            country: leastExpensive.country,
            valueLabel: formatMoney(leastExpensive.usdPrice, "USD"),
            note: `Published date ${formatDate(leastExpensive.date)}`,
          }
        : undefined,
      note: "Ranked by persisted verified USD-equivalent Burger/Big Mac values from the latest published burger date.",
    },
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

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function getEverydayArchitectureSummary() {
  return {
    countries: CONSUMER_COUNTRIES.length,
    sourceRegistry: getEverydaySourceRegistry(),
  };
}

async function getPersistedBurgerCard(selectedCountry: ConsumerCountry) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const dataset = await getPersistedBurgerDataset();

  if (!dataset) {
    return null;
  }

  const row = await db.consumerPublishedValue.findFirst({
    where: {
      country: { iso3: selectedCountry.iso3 },
      indexDefinitionId: dataset.definitionId,
      publishedDate: dataset.latestPublishedDate,
      sourceStatus: "verified",
    },
    include: {
      country: true,
      observation: true,
    },
  });

  if (!row || !row.localPrice) {
    return null;
  }

  const sourceDefinedUsdRaw = readSourceDefinedUsdRaw(
    row.metadataJson,
    row.observation?.metadataJson ?? null,
  );
  const history = await getPersistedBurgerHistory(selectedCountry.iso3);

  return {
    key: "burger" as const,
    title: "Burger Index",
    localPriceLabel: formatMoney(row.localPrice.toNumber(), row.country.currency),
    usdPriceLabel: row.usdPrice ? formatMoney(row.usdPrice.toNumber(), "USD") : "Unavailable",
    indexVsUsLabel: "Pending New York reference",
    sourceComparisonLabel:
      typeof sourceDefinedUsdRaw === "number"
        ? `${formatPercent(sourceDefinedUsdRaw)} vs source-defined US dataset row`
        : "Unavailable",
    lastVerifiedLabel: formatDate(row.publishedDate.toISOString()),
    status: "verified" as const,
    statusLabel: "Published value",
    confidenceLabel: "High confidence",
    note:
      "Persisted verified Burger/Big Mac publication from The Economist structured dataset. Source-defined US dataset comparisons do not represent the requested New York, NY retail reference.",
    sparkline: history.map((point) => point.value),
    realData: true,
  };
}

async function getPersistedBurgerHistory(countryIso3: string) {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const dataset = await getPersistedBurgerDataset();

  if (!dataset) {
    return [];
  }

  const rows = await db.consumerPublishedValue.findMany({
    where: {
      country: { iso3: countryIso3 },
      indexDefinitionId: dataset.definitionId,
      sourceStatus: "verified",
    },
    include: {
      country: true,
    },
    orderBy: { publishedDate: "desc" },
    take: 8,
  });

  return rows
    .reverse()
    .filter((row) => row.localPrice)
    .map((row) => ({
      date: row.publishedDate.toISOString().slice(0, 10),
      value: row.localPrice!.toNumber(),
    }));
}

async function getPersistedBurgerRankingRows() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const dataset = await getPersistedBurgerDataset();

  if (!dataset) {
    return [];
  }

  const rows = await db.consumerPublishedValue.findMany({
    where: {
      indexDefinitionId: dataset.definitionId,
      publishedDate: dataset.latestPublishedDate,
      sourceStatus: "verified",
    },
    include: {
      country: true,
    },
  });

  return rows
    .filter((row) => row.usdPrice && row.country.iso2 !== "US")
    .map((row) => ({
      country: row.country.name,
      date: row.publishedDate.toISOString(),
      usdPrice: row.usdPrice!.toNumber(),
    }))
    .sort((left, right) => right.usdPrice - left.usdPrice);
}

function readSourceDefinedUsdRaw(...values: Array<unknown>) {
  for (const value of values) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const candidate = (value as Record<string, unknown>).sourceDefinedUsdRaw ??
      (value as Record<string, unknown>).source_defined_usd_raw;

    if (typeof candidate === "number") {
      return candidate;
    }
  }

  return null;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}
