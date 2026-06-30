import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  ECONOMIST_BIGMAC_CSV_URL,
  fetchEconomistBigMacCsv,
  parseEconomistBigMacCsv,
  buildLatestBigMacObservations,
} from "@/lib/basket-monitoring/adapters/economist-bigmac";
import {
  FRED_SERIES,
  fetchFredCsv,
  parseFredCsv,
  type FredSeriesKey,
} from "@/lib/basket-monitoring/adapters/fred-series";
import {
  saveBasketRawSnapshot,
  upsertBasketExternalSeriesObservations,
  upsertBasketObservations,
} from "@/lib/basket/storage";
import { BASKET_SOURCES } from "@/lib/basket/products";

const outputPath = join(process.cwd(), ".tmp", "basket-ingest.json");

async function main() {
  const [bigMac, fred] = await Promise.all([ingestBigMac(), ingestFred()]);
  const payload = {
    generatedAt: new Date().toISOString(),
    observations: {
      bigMac: bigMac.observations,
      fred: fred.series,
    },
    rawSnapshots: {
      bigMac: bigMac.rawSnapshotId,
      fred: fred.series.map((item) => ({ key: item.key, rawSnapshotId: item.rawSnapshotId })),
    },
    sourceMode: {
      bigMac: "verified",
      fred: "verified",
      iphone: "seed-review-required",
      starbucks: "monitored-review-required",
    },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
  console.log(
    JSON.stringify({
      bigMac: bigMac.observations.length,
      fredSeries: fred.series.length,
      fredObservations: fred.series.reduce((sum, item) => sum + item.observations.length, 0),
    }),
  );
}

async function ingestBigMac() {
  try {
    const csv = await fetchEconomistBigMacCsv();
    const rawSnapshotId = await saveBasketRawSnapshot({
      content: csv,
      sourceId: BASKET_SOURCES.economistBigMac.id,
      sourceKind: BASKET_SOURCES.economistBigMac.kind,
      status: "success",
      url: ECONOMIST_BIGMAC_CSV_URL,
    });
    const observations = buildLatestBigMacObservations(parseEconomistBigMacCsv(csv));
    await upsertBasketObservations(observations, rawSnapshotId);
    return { observations, rawSnapshotId };
  } catch (error) {
    const rawSnapshotId = await saveBasketRawSnapshot({
      error: error instanceof Error ? error.message : String(error),
      sourceId: BASKET_SOURCES.economistBigMac.id,
      sourceKind: BASKET_SOURCES.economistBigMac.kind,
      status: "failed",
      url: ECONOMIST_BIGMAC_CSV_URL,
    });
    return { error: error instanceof Error ? error.message : String(error), observations: [], rawSnapshotId };
  }
}

async function ingestFred() {
  const keys = Object.keys(FRED_SERIES) as FredSeriesKey[];
  const series = await Promise.all(
    keys.map(async (key) => {
      const source = FRED_SERIES[key];
      try {
        const csv = await fetchFredCsv(source.id);
        const rawSnapshotId = await saveBasketRawSnapshot({
          content: csv,
          sourceId: source.sourceId,
          sourceKind: "external_market_series",
          status: "success",
          url: `https://fred.stlouisfed.org/series/${source.id}`,
        });
        const observations = parseFredCsv(csv, source.id, source.sourceId);
        await upsertBasketExternalSeriesObservations(observations, rawSnapshotId);
        return { key, observations, rawSnapshotId, sourceId: source.sourceId };
      } catch (error) {
        const rawSnapshotId = await saveBasketRawSnapshot({
          error: error instanceof Error ? error.message : String(error),
          sourceId: source.sourceId,
          sourceKind: "external_market_series",
          status: "failed",
          url: `https://fred.stlouisfed.org/series/${source.id}`,
        });
        return {
          error: error instanceof Error ? error.message : String(error),
          key,
          observations: [],
          rawSnapshotId,
          sourceId: source.sourceId,
        };
      }
    }),
  );

  return { series };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
