import { parseCsvRows } from "@/lib/basket-monitoring/adapters/csv";

export const FRED_SERIES = {
  brent: {
    id: "DCOILBRENTEU",
    label: "Brent crude oil spot price",
    sourceId: "fred-brent",
  },
  usdBroad: {
    id: "DTWEXBGS",
    label: "Nominal Broad U.S. Dollar Index",
    sourceId: "fred-usd-broad",
  },
  wti: {
    id: "DCOILWTICO",
    label: "WTI crude oil spot price",
    sourceId: "fred-wti",
  },
} as const;

export type FredSeriesKey = keyof typeof FRED_SERIES;

export type FredObservation = {
  date: string;
  seriesId: string;
  value: number;
  sourceId: string;
  confidence: "verified";
};

export function fredCsvUrl(seriesId: string) {
  return `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
}

export async function fetchFredCsv(seriesId: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(fredCsvUrl(seriesId), {
    headers: { "User-Agent": "1D3X-Basket/1.0 (+https://pop.1d3x.com)" },
  });

  if (!response.ok) throw new Error(`FRED ${seriesId} fetch failed: ${response.status}`);

  return response.text();
}

export function parseFredCsv(
  csv: string,
  seriesId: string,
  sourceId = seriesId.toLowerCase(),
): FredObservation[] {
  return parseCsvRows(csv)
    .map((row) => ({
      confidence: "verified" as const,
      date: row.observation_date,
      seriesId,
      sourceId,
      value: Number(row[seriesId]),
    }))
    .filter(
      (row) =>
        /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
        Number.isFinite(row.value),
    );
}

export async function getFredSeriesObservations(
  key: FredSeriesKey,
  fetcher: typeof fetch = fetch,
) {
  const series = FRED_SERIES[key];
  return parseFredCsv(await fetchFredCsv(series.id, fetcher), series.id, series.sourceId);
}

export async function getAllFredSeriesObservations(fetcher: typeof fetch = fetch) {
  const entries = await Promise.all(
    (Object.keys(FRED_SERIES) as FredSeriesKey[]).map(async (key) => ({
      key,
      observations: await getFredSeriesObservations(key, fetcher),
    })),
  );

  return entries;
}
