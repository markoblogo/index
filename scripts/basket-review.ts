import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ingestPath = join(process.cwd(), ".tmp", "basket-ingest.json");
const outputPath = join(process.cwd(), ".tmp", "basket-review.json");

async function main() {
  const payload = JSON.parse(await readFile(ingestPath, "utf8")) as {
    generatedAt: string;
    observations: {
      bigMac: Array<{ market: string; confidence: string; status: string }>;
      fred: Array<{ key: string; observations: unknown[] }>;
    };
  };
  const review = {
    generatedAt: new Date().toISOString(),
    ingestGeneratedAt: payload.generatedAt,
    autoPublish: {
      bigMac: payload.observations.bigMac.filter(
        (item) => item.confidence === "verified" && item.status === "published",
      ),
      fred: payload.observations.fred.map((item) => ({
        key: item.key,
        observations: item.observations.length,
        confidence: "verified",
      })),
    },
    reviewRequired: [
      { product: "latte", reason: "Starbucks remains monitored until source verification is durable." },
      { product: "iphone", reason: "iPhone remains seed/monitored until retail parser is durable." },
    ],
  };

  await writeFile(outputPath, `${JSON.stringify(review, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
