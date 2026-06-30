import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const reviewPath = join(process.cwd(), ".tmp", "basket-review.json");
const outputPath = join(process.cwd(), ".tmp", "basket-published.json");

async function main() {
  const review = JSON.parse(await readFile(reviewPath, "utf8")) as {
    autoPublish: {
      bigMac: unknown[];
      fred: unknown[];
    };
    generatedAt: string;
    reviewRequired: unknown[];
  };
  const published = {
    generatedAt: new Date().toISOString(),
    sourceReviewGeneratedAt: review.generatedAt,
    published: {
      bigMac: review.autoPublish.bigMac,
      fred: review.autoPublish.fred,
    },
    heldForReview: review.reviewRequired,
    mode: "json-artifact",
  };

  await writeFile(outputPath, `${JSON.stringify(published, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
