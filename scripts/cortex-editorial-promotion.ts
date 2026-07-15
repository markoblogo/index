import { evaluateCortexEditorialPromotion } from "@/lib/cortex-editorial-promotion";

async function main() {
  const kind = pickArg("--kind");
  if (kind !== "daily" && kind !== "weekly" && kind !== "monthly") {
    throw new Error("Use --kind=daily, --kind=weekly or --kind=monthly.");
  }
  console.log(JSON.stringify(await evaluateCortexEditorialPromotion({ kind }), null, 2));
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
