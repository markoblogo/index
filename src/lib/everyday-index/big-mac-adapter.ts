import { createHash } from "node:crypto";
import { EVERYDAY_SOURCE_DEFINITIONS } from "@/lib/everyday-index/config";
import { validateConsumerObservation } from "@/lib/everyday-index/validation";
import type {
  ConsumerSourceDefinition,
  EverydaySourceAdapter,
  ParsedObservation,
} from "@/lib/everyday-index/types";

const BIG_MAC_SOURCE = EVERYDAY_SOURCE_DEFINITIONS.find(
  (source) => source.key === "big-mac-economist",
)!;

type BigMacRow = {
  date: string;
  iso3: string;
  currency: string;
  country: string;
  localPrice: number;
  usdPrice: number;
  usdRawIndex?: number | null;
};

export const economistBigMacAdapter: EverydaySourceAdapter = {
  key: "big-mac-economist",
  async fetchSnapshot(source) {
    const response = await fetch(source.sourceUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Big Mac dataset: ${response.status}`);
    }

    const body = await response.text();

    return {
      sourceId: source.id,
      fetchedAt: new Date().toISOString(),
      contentType: response.headers.get("content-type") ?? "text/csv",
      hash: createHash("sha256").update(body).digest("hex"),
      url: source.sourceUrl,
      body,
    };
  },
  async parse(snapshot, source) {
    const rows = parseBigMacCsv(snapshot.body);
    const row = rows
      .filter((item) => item.iso3 === source.countryIso3)
      .sort((left, right) => right.date.localeCompare(left.date))[0];

    if (!row) {
      const unavailableObservation: ParsedObservation = {
        sourceId: source.id,
        productKey: "burger",
        countryIso3: source.countryIso3,
        observedAt: snapshot.fetchedAt,
        parserVersion: "economist-big-mac-csv-v1",
        confidence: "none",
        status: "unavailable",
        metadata: {
          reason: "country_missing",
        },
      };

      return unavailableObservation;
    }

    const observation: ParsedObservation = {
      sourceId: source.id,
      productKey: "burger",
      countryIso3: row.iso3,
      observedAt: row.date,
      price: row.localPrice,
      usdPrice: row.usdPrice,
      currency: row.currency,
      productVariant: "Big Mac",
      parserVersion: "economist-big-mac-csv-v1",
      confidence: "high",
      status: "verified",
      metadata: {
        source_dataset: "The Economist Big Mac dataset",
        source_country_name: row.country,
        source_defined_usd_raw:
          typeof row.usdRawIndex === "number" ? row.usdRawIndex : null,
      },
    };

    return observation;
  },
  validate(observation, source, previousPublishedPrice) {
    return validateConsumerObservation({
      observation,
      source,
      productLock: {
        key: "burger",
        label: "Burger Index",
        variant: "Big Mac",
        rules: [],
      },
      previousPublishedPrice,
    });
  },
};

export async function getBigMacDataset() {
  const snapshot = await economistBigMacAdapter.fetchSnapshot(BIG_MAC_SOURCE);

  return {
    snapshot,
    rows: parseBigMacCsv(snapshot.body),
  };
}

export async function getLatestBigMacObservation(
  countryIso3: string,
): Promise<ParsedObservation> {
  const source: ConsumerSourceDefinition = {
    ...BIG_MAC_SOURCE,
    countryIso3,
  };
  const snapshot = await economistBigMacAdapter.fetchSnapshot(source);

  return economistBigMacAdapter.parse(snapshot, source);
}

export async function getBigMacHistory(countryIso3: string) {
  const { rows } = await getBigMacDataset();

  return rows
    .filter((row) => row.iso3 === countryIso3)
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function computeSnapshotHash(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}

export function parseBigMacCsv(csv: string): BigMacRow[] {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  const dateIndex = headers.indexOf("date");
  const isoIndex = headers.indexOf("iso_a3");
  const currencyIndex = headers.indexOf("currency_code");
  const nameIndex = headers.indexOf("name");
  const localPriceIndex = headers.indexOf("local_price");
  const usdPriceIndex = headers.indexOf("dollar_price");
  const usdRawIndexColumn = headers.indexOf("USD_raw");

  return lines
    .map((line) => line.split(","))
    .map((parts) => ({
      date: parts[dateIndex],
      iso3: parts[isoIndex],
      currency: parts[currencyIndex],
      country: parts[nameIndex],
      localPrice: Number(parts[localPriceIndex]),
      usdPrice: Number(parts[usdPriceIndex]),
      usdRawIndex:
        usdRawIndexColumn >= 0 && parts[usdRawIndexColumn]?.length > 0
          ? Number(parts[usdRawIndexColumn])
          : null,
    }))
    .filter((row) => row.date && row.iso3 && Number.isFinite(row.localPrice));
}
