import {
  backfillCortexEditorialEvaluationCorpus,
} from "@/lib/cortex-editorial-corpus-backfill";
import type { CortexEditorialPromotionKind } from "@/lib/cortex-editorial-promotion";

async function main() {
  const kind = pickArg("--kind");
  const limit = pickArg("--limit");
  if (kind && kind !== "daily" && kind !== "weekly" && kind !== "monthly") {
    throw new Error("Use --kind=daily, --kind=weekly or --kind=monthly.");
  }
  if (limit && (!Number.isInteger(Number(limit)) || Number(limit) < 1)) {
    throw new Error("Use --limit as a positive integer (maximum 60 per kind).");
  }
  console.log(JSON.stringify(await backfillCortexEditorialEvaluationCorpus({
    kind: kind as CortexEditorialPromotionKind | undefined,
    limitPerKind: limit ? Number(limit) : undefined,
  }), null, 2));
}

function pickArg(key: string) {
  const paired = process.argv.find((value) => value.startsWith(`${key}=`));
  if (paired) return paired.slice(key.length + 1);
  const index = process.argv.indexOf(key);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
