import { BASKET_SOURCES } from "@/lib/basket/products";
import type { BasketMarket, BasketObservation } from "@/lib/basket/types";
import { parseCsvRows } from "@/lib/basket-monitoring/adapters/csv";

export const ECONOMIST_BIGMAC_CSV_URL =
  "https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv";

const marketIso: Record<Exclude<BasketMarket, "GLOBAL">, string> = {
  US: "USA",
  UA: "UKR",
};

export type BigMacCsvRow = {
  date: string;
  isoA3: string;
  country: string;
  currencyCode: string;
  localPrice: number;
  dollarExchange: number;
  dollarPrice: number;
  usdRaw: number | null;
  usdAdjusted: number | null;
};

export type BigMacPublishedObservation = BasketObservation & {
  country: string;
  currencyCode: string;
  localPrice: number;
  dollarExchange: number;
  usdRaw: number | null;
  usdAdjusted: number | null;
};

export async function fetchEconomistBigMacCsv(fetcher: typeof fetch = fetch) {
  const response = await fetcher(ECONOMIST_BIGMAC_CSV_URL, {
    headers: { "User-Agent": "1D3X-Basket/1.0 (+https://pop.1d3x.com)" },
  });

  if (!response.ok) {
    throw new Error(`Economist Big Mac fetch failed: ${response.status}`);
  }

  return response.text();
}

export function parseEconomistBigMacCsv(csv: string): BigMacCsvRow[] {
  return parseCsvRows(csv)
    .map((row) => ({
      country: row.name,
      currencyCode: row.currency_code,
      date: row.date,
      dollarExchange: toFiniteNumber(row.dollar_ex),
      dollarPrice: toFiniteNumber(row.dollar_price),
      isoA3: row.iso_a3,
      localPrice: toFiniteNumber(row.local_price),
      usdAdjusted: toNullableNumber(row.USD_adjusted),
      usdRaw: toNullableNumber(row.USD_raw),
    }))
    .filter(
      (row) =>
        isIsoDate(row.date) &&
        row.isoA3.length === 3 &&
        Number.isFinite(row.localPrice) &&
        Number.isFinite(row.dollarExchange) &&
        Number.isFinite(row.dollarPrice),
    );
}

export function buildLatestBigMacObservations(
  rows: BigMacCsvRow[],
): BigMacPublishedObservation[] {
  const latestDate = rows.reduce((latest, row) => (row.date > latest ? row.date : latest), "");
  const latestRows = rows.filter((row) => row.date === latestDate);
  const usRow = latestRows.find((row) => row.isoA3 === marketIso.US);

  if (!latestDate || !usRow) return [];

  const observations: BigMacPublishedObservation[] = [
    makeObservation("US", usRow, usRow.dollarPrice),
  ];

  const uaRow = latestRows.find((row) => row.isoA3 === marketIso.UA);
  if (uaRow) observations.push(makeObservation("UA", uaRow, usRow.dollarPrice));

  const globalDollarPrices = latestRows
    .map((row) => row.dollarPrice)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (globalDollarPrices.length > 0) {
    observations.unshift(
      makeObservation("GLOBAL", {
        ...usRow,
        country: "Latest dataset average",
        currencyCode: "USD",
        dollarExchange: 1,
        dollarPrice: roundMoney(average(globalDollarPrices)),
        localPrice: roundMoney(average(globalDollarPrices)),
        usdAdjusted: null,
        usdRaw: null,
      }, usRow.dollarPrice),
    );
  }

  return observations;
}

export async function getLatestBigMacObservations(fetcher: typeof fetch = fetch) {
  return buildLatestBigMacObservations(parseEconomistBigMacCsv(await fetchEconomistBigMacCsv(fetcher)));
}

function makeObservation(
  market: BasketMarket,
  row: BigMacCsvRow,
  baselineUsd: number,
): BigMacPublishedObservation {
  return {
    baselineUsd: roundMoney(baselineUsd),
    confidence: "verified",
    country: row.country,
    currencyCode: row.currencyCode,
    date: row.date,
    dollarExchange: row.dollarExchange,
    localPrice: row.localPrice,
    market,
    product: "bigmac",
    source: BASKET_SOURCES.economistBigMac,
    status: "published",
    usdAdjusted: row.usdAdjusted,
    usdRaw: row.usdRaw,
    valueUsd: roundMoney(row.dollarPrice),
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toFiniteNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toNullableNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
