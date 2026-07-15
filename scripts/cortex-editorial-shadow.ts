import { syncCortexEditorialShadowObservations } from "@/lib/cortex-editorial-shadow";

async function main() {
  const kind = pickArg("--kind");
  const date = pickArg("--date");
  if (kind !== "daily" && kind !== "weekly") throw new Error("Use --kind=daily or --kind=weekly.");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Use --date=YYYY-MM-DD for the report period end.");
  console.log(JSON.stringify(await syncCortexEditorialShadowObservations({ kind, periodEndDate: date }), null, 2));
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
