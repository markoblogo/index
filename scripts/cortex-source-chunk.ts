import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCortexChunkManifest } from "@/lib/cortex-source-chunker";
import type { CortexSourceLedger } from "@/lib/cortex-source-scanner";

type CliOptions = {
  ledgerPath: string;
  outPath: string;
  sourceScope: "all" | "queue";
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ledger = JSON.parse(await readFile(options.ledgerPath, "utf8")) as CortexSourceLedger;
  const chunkManifest = await buildCortexChunkManifest({
    ledger,
    sourceScope: options.sourceScope,
  });

  await mkdir(path.dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, `${JSON.stringify(chunkManifest, null, 2)}\n`);

  console.log(
    [
      `1D3X Cortex chunk manifest written: ${options.outPath}`,
      `scope: ${chunkManifest.sourceScope}`,
      `sources: ${chunkManifest.totals.sources}`,
      `chunks: ${chunkManifest.totals.chunks}`,
      `skippedSources: ${chunkManifest.totals.skippedSources}`,
      `textBytes: ${chunkManifest.totals.textBytes}`,
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): CliOptions {
  return {
    ledgerPath: path.resolve(pickArgValue(argv, "--ledger") ?? ".cortex/source-ledger.json"),
    outPath: path.resolve(pickArgValue(argv, "--out") ?? ".cortex/chunk-manifest.json"),
    sourceScope: argv.includes("--all") ? "all" : "queue",
  };
}

function pickArgValue(argv: string[], key: string) {
  const pair = argv.find((value) => value.startsWith(`${key}=`));
  if (pair) return pair.slice(key.length + 1);
  const index = argv.indexOf(key);
  return index >= 0 ? argv[index + 1] : undefined;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
