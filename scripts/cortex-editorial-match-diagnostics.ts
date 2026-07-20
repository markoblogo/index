import {
  runCortexEditorialMatchDiagnostics,
  runCortexEditorialUnknownReasonDebug,
} from "@/lib/cortex-editorial-match-diagnostics";
import type { CortexEditorialPromotionKind } from "@/lib/cortex-editorial-promotion";

async function main() {
  const unknownMode = pickArg("--debug-unknown") !== undefined;
  const kind = pickArg("--kind");
  const limit = parseIntArg("--limit", 60);
  const unknownLimit = parseIntArg("--unknown-limit", 20);
  if (kind && kind !== "daily" && kind !== "weekly" && kind !== "monthly") {
    throw new Error("Use --kind=daily, --kind=weekly or --kind=monthly.");
  }
  if (unknownMode) {
    console.log(
      JSON.stringify(await runCortexEditorialUnknownReasonDebug({
        kind: kind as CortexEditorialPromotionKind | undefined,
        limit,
        sampleLimit: unknownLimit,
      }), null, 2),
    );
    return;
  }
  console.log(JSON.stringify(await runCortexEditorialMatchDiagnostics({ kind: kind as CortexEditorialPromotionKind | undefined, limit }), null, 2));
}

function pickArg(key: string) {
  const paired = process.argv.find((value) => value.startsWith(`${key}=`));
  if (paired) return paired.slice(key.length + 1);
  const index = process.argv.indexOf(key);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseIntArg(key: string, defaultValue: number) {
  const value = pickArg(key);
  const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
