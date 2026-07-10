import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCroptoSourceLedger,
  type CortexCroptoSourceManifest,
} from "@/lib/cortex-cropto-source-manifest";
import {
  mergeCortexChunkManifests,
} from "@/lib/cortex-mn7r-source-snapshot";
import { buildCortexChunkManifest, type CortexChunkManifest } from "@/lib/cortex-source-chunker";
import type { CortexSourceManifest } from "@/lib/cortex-source-scanner";

type CliOptions = {
  basePath?: string;
  manifestPath: string;
  outPath: string;
  previousPath?: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(options.manifestPath, "utf8")) as CortexCroptoSourceManifest;
  const previousManifest = options.previousPath
    ? JSON.parse(await readFile(options.previousPath, "utf8")) as CortexSourceManifest | CortexCroptoSourceManifest
    : null;
  const ledger = buildCroptoSourceLedger({ manifest, previousManifest });
  const croptoChunks = await buildCortexChunkManifest({
    ledger,
    sourceScope: "all",
  });
  const baseManifest = options.basePath
    ? JSON.parse(await readFile(options.basePath, "utf8")) as CortexChunkManifest
    : null;
  const output = mergeCortexChunkManifests({
    base: baseManifest,
    mn7r: croptoChunks,
  });

  await mkdir(path.dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(
    [
      `1D3X Cortex Cr0pto chunks written: ${options.outPath}`,
      `base: ${options.basePath ?? "none"}`,
      `croptoSources: ${manifest.sources.length}`,
      `croptoChunks: ${croptoChunks.totals.chunks}`,
      `mergedChunks: ${output.totals.chunks}`,
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): CliOptions {
  const manifestPath = pickArgValue(argv, "--manifest");
  if (!manifestPath) {
    throw new Error("Missing --manifest=.cortex/cropto-source-manifest.json");
  }
  const basePath = pickArgValue(argv, "--base");
  const previousPath = pickArgValue(argv, "--previous");
  return {
    basePath: basePath ? path.resolve(basePath) : undefined,
    manifestPath: path.resolve(manifestPath),
    outPath: path.resolve(pickArgValue(argv, "--out") ?? ".cortex/chunk-manifest.with-cropto.json"),
    previousPath: previousPath ? path.resolve(previousPath) : undefined,
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
