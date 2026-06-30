import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getLatestBigMacObservations } from "@/lib/basket-monitoring/adapters/economist-bigmac";
import { getAllFredSeriesObservations } from "@/lib/basket-monitoring/adapters/fred-series";

const outputPath = join(process.cwd(), ".tmp", "basket-ingest.json");

async function main() {
  const [bigMac, fred] = await Promise.all([
    getLatestBigMacObservations(),
    getAllFredSeriesObservations(),
  ]);
  const payload = {
    generatedAt: new Date().toISOString(),
    observations: {
      bigMac,
      fred,
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
      bigMac: bigMac.length,
      fredSeries: fred.length,
      fredObservations: fred.reduce((sum, item) => sum + item.observations.length, 0),
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
