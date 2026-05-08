import { unstable_cache } from "next/cache";

export type FxRateSource = "NBU" | "demo";

export type FxRates = {
  source: FxRateSource;
  rateDate: string;
  usdUah: number;
  eurUah: number;
  fetchedAt: string;
};

type NbuRateResponse = Array<{
  cc: string;
  exchangedate: string;
  rate: number;
}>;

const FALLBACK_FX_RATES = {
  eurUah: 45.2,
  rateDate: "2026-05-08",
  usdUah: 41.31,
} as const;

const NBU_EXCHANGE_URL =
  "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange";

export async function getFxRates(date?: string): Promise<FxRates> {
  return getCachedFxRates(normalizeRateDate(date));
}

const getCachedFxRates = unstable_cache(
  async (date: string) => fetchNbuFxRates(date),
  ["uga-index-nbu-fx-rates"],
  {
    revalidate: 60 * 60 * 6,
    tags: ["public-fx-rates"],
  },
);

async function fetchNbuFxRates(date: string): Promise<FxRates> {
  try {
    const [usd, eur] = await Promise.all([
      fetchNbuRate("USD", date),
      fetchNbuRate("EUR", date),
    ]);

    return {
      eurUah: eur.rate,
      fetchedAt: new Date().toISOString(),
      rateDate: normalizeNbuDate(usd.exchangedate) ?? date,
      source: "NBU",
      usdUah: usd.rate,
    };
  } catch {
    return getDemoFxRates(date);
  }
}

async function fetchNbuRate(currencyCode: "USD" | "EUR", date: string) {
  const url = new URL(NBU_EXCHANGE_URL);
  url.searchParams.set("valcode", currencyCode);
  url.searchParams.set("json", "");
  url.searchParams.set("date", date.replaceAll("-", ""));

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    next: {
      revalidate: 60 * 60 * 6,
    },
    signal: AbortSignal.timeout(3500),
  });

  if (!response.ok) {
    throw new Error(`NBU FX request failed: ${response.status}`);
  }

  const data = (await response.json()) as NbuRateResponse;
  const rate = data[0];

  if (!rate?.rate || rate.rate <= 0) {
    throw new Error(`NBU FX response missing ${currencyCode}`);
  }

  return rate;
}

function getDemoFxRates(date: string): FxRates {
  return {
    ...FALLBACK_FX_RATES,
    fetchedAt: new Date().toISOString(),
    rateDate: date || FALLBACK_FX_RATES.rateDate,
    source: "demo",
  };
}

function normalizeRateDate(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return new Date().toISOString().slice(0, 10);
}

function normalizeNbuDate(date: string) {
  const [day, month, year] = date.split(".");

  if (!day || !month || !year) {
    return null;
  }

  return `${year}-${month}-${day}`;
}
