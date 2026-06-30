import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { publishBasketAutoCandidates } from "@/lib/basket/storage";

const reviewPath = join(process.cwd(), ".tmp", "basket-review.json");
const candidatesPath = join(process.cwd(), ".tmp", "basket-publish-candidates.json");
const outputPath = join(process.cwd(), ".tmp", "basket-published.json");

async function main() {
  const result = await publishBasketAutoCandidates();
  const review = JSON.parse(await readFile(reviewPath, "utf8")) as {
    autoPublish: unknown[];
    generatedAt: string;
    mode: string;
    reviewRequired: unknown[];
  };
  const candidates = JSON.parse(await readFile(candidatesPath, "utf8")) as unknown[];
  const published = {
    generatedAt: new Date().toISOString(),
    sourceReviewGeneratedAt: review.generatedAt,
    mode: result.published || result.held ? "database" : "json-artifact",
    published: result.published || result.held ? result : review.autoPublish,
    candidates: candidates.length,
    heldForReview: review.reviewRequired,
  };

  await writeFile(outputPath, `${JSON.stringify(published, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
