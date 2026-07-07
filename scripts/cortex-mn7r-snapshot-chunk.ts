import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";
import {
  buildCortexMn7rSnapshotChunkManifest,
  mergeCortexChunkManifests,
  type CortexMn7rSourceSnapshot,
} from "@/lib/cortex-mn7r-source-snapshot";

type CliOptions = {
  basePath?: string;
  outPath: string;
  snapshotPath: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const snapshot = JSON.parse(await readFile(options.snapshotPath, "utf8")) as CortexMn7rSourceSnapshot;
  const mn7rManifest = buildCortexMn7rSnapshotChunkManifest({ snapshot });
  const baseManifest = options.basePath
    ? JSON.parse(await readFile(options.basePath, "utf8")) as CortexChunkManifest
    : null;
  const output = mergeCortexChunkManifests({
    base: baseManifest,
    mn7r: mn7rManifest,
  });

  await mkdir(path.dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(
    [
      `1D3X Cortex MN7R snapshot chunks written: ${options.outPath}`,
      `base: ${options.basePath ?? "none"}`,
      `mn7rEvidence: ${snapshot.evidence.length}`,
      `chunks: ${output.totals.chunks}`,
      `protectedChunks: ${output.chunks.filter((chunk) => chunk.visibility === "protected").length}`,
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): CliOptions {
  const snapshotPath = pickArgValue(argv, "--snapshot");
  if (!snapshotPath) {
    throw new Error("Missing --snapshot=.cortex/mn7r-source-snapshot.json");
  }
  const basePath = pickArgValue(argv, "--base");
  return {
    basePath: basePath ? path.resolve(basePath) : undefined,
    outPath: path.resolve(pickArgValue(argv, "--out") ?? ".cortex/chunk-manifest.with-mn7r.json"),
    snapshotPath: path.resolve(snapshotPath),
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
