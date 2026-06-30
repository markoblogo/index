import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  buildBasketPublishCandidates,
  getBasketPublishCandidates,
  saveBasketPublishCandidates,
} from "@/lib/basket/storage";
import type { BasketObservation } from "@/lib/basket/types";

const ingestPath = join(process.cwd(), ".tmp", "basket-ingest.json");
const outputPath = join(process.cwd(), ".tmp", "basket-review.json");
const candidatesPath = join(process.cwd(), ".tmp", "basket-publish-candidates.json");

async function main() {
  const payload = JSON.parse(await readFile(ingestPath, "utf8")) as {
    generatedAt: string;
    observations: {
      bigMac: BasketObservation[];
      fred: Array<{ key: string; observations: unknown[]; rawSnapshotId?: string | null; sourceId?: string }>;
    };
    rawSnapshots?: { bigMac?: string | null };
  };
  const candidates = buildBasketPublishCandidates({
    bigMac: payload.observations.bigMac,
    fred: payload.observations.fred,
    rawSnapshotId: payload.rawSnapshots?.bigMac ?? null,
  });
  const saved = await saveBasketPublishCandidates(candidates, payload.rawSnapshots?.bigMac ?? null);
  const dbCandidates = await getBasketPublishCandidates();
  const review = {
    generatedAt: new Date().toISOString(),
    ingestGeneratedAt: payload.generatedAt,
    mode: dbCandidates ? "database" : "json-artifact",
    autoPublish: candidates.filter((item) => item.publishStatus === "auto_publish"),
    reviewRequired: candidates.filter((item) => item.publishStatus === "review_required"),
    savedCandidates: saved.length,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(review, null, 2)}\n`);
  await writeFile(candidatesPath, `${JSON.stringify(dbCandidates ?? candidates, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${candidatesPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
