import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCroptoSourceLedger,
  type CortexCroptoSourceManifest,
} from "@/lib/cortex-cropto-source-manifest";
import {
  buildCortexMn7rSnapshotChunkManifest,
  mergeCortexChunkManifests,
  type CortexMn7rSourceSnapshot,
} from "@/lib/cortex-mn7r-source-snapshot";
import { smokeTestCortexArtifactPipeline } from "@/lib/cortex-artifact-smoke";
import { buildCortexChunkManifest, type CortexChunkManifest } from "@/lib/cortex-source-chunker";
import {
  buildCortexSourceLedger,
  buildCortexSourceManifest,
  buildLocalEcosystemScanRoots,
  type CortexScanRoot,
  type CortexSourceManifest,
} from "@/lib/cortex-source-scanner";

type CliOptions = {
  baseChunkPath: string;
  croptoManifestPath: string;
  indexRoot: string;
  ledgerPath: string;
  manifestPath: string;
  minChunks: number;
  mn7rRoot?: string;
  mn7rSnapshotPath: string;
  outPath: string;
  previousManifestPath?: string;
  requiredProjects: CortexScanRoot["ownerProject"][];
};

async function main() {
  const options = parseArgs(process.argv.slice(2), process.cwd());
  const roots = await buildLocalEcosystemScanRoots({
    croptoRoot: process.env.CORTEX_CROPTO_ROOT,
    indexRoot: options.indexRoot,
    mn7rRoot: options.mn7rRoot ?? process.env.CORTEX_MN7R_ROOT,
  });
  const previousManifest = await readOptionalJson<CortexSourceManifest>(
    options.previousManifestPath ?? options.manifestPath,
  );
  const manifest = await buildCortexSourceManifest({ roots });
  const ledger = buildCortexSourceLedger({ manifest, previousManifest });
  const baseChunks = await buildCortexChunkManifest({
    ledger,
    sourceScope: "all",
  });
  let runtimeManifest: CortexChunkManifest = baseChunks;
  const optionalInputs: string[] = [];

  const mn7rSnapshot = await readOptionalJson<CortexMn7rSourceSnapshot>(options.mn7rSnapshotPath);
  if (mn7rSnapshot) {
    runtimeManifest = mergeCortexChunkManifests({
      base: runtimeManifest,
      mn7r: buildCortexMn7rSnapshotChunkManifest({ snapshot: mn7rSnapshot }),
    });
    optionalInputs.push(`mn7rSnapshot=${options.mn7rSnapshotPath}`);
  }

  const croptoManifest = await readOptionalJson<CortexCroptoSourceManifest>(options.croptoManifestPath);
  if (croptoManifest) {
    const croptoLedger = buildCroptoSourceLedger({ manifest: croptoManifest });
    runtimeManifest = mergeCortexChunkManifests({
      base: runtimeManifest,
      mn7r: await buildCortexChunkManifest({
        ledger: croptoLedger,
        sourceScope: "all",
      }),
    });
    optionalInputs.push(`croptoManifest=${options.croptoManifestPath}`);
  }

  await writeJson(options.manifestPath, manifest);
  await writeJson(options.ledgerPath, ledger);
  await writeJson(options.baseChunkPath, baseChunks);
  await writeJson(options.outPath, runtimeManifest);

  const requiredOwnerProjects = options.requiredProjects.length > 0
    ? options.requiredProjects
    : roots.map((root) => root.ownerProject);
  const smoke = smokeTestCortexArtifactPipeline(runtimeManifest, {
    minChunks: options.minChunks,
    requiredOwnerProjects,
  });

  console.log(
    [
      `1D3X Cortex artifact build: ${smoke.ok ? "ok" : "failed"}`,
      `manifest: ${options.manifestPath}`,
      `ledger: ${options.ledgerPath}`,
      `baseChunks: ${options.baseChunkPath}`,
      `runtime: ${options.outPath}`,
      `roots: ${roots.map((root) => `${root.ownerProject}:${root.rootId}`).join(", ")}`,
      `optionalInputs: ${optionalInputs.length > 0 ? optionalInputs.join(", ") : "none"}`,
      `chunks: ${runtimeManifest.totals.chunks}`,
      `projects: ${formatCounts(smoke.coverage.byOwnerProject)}`,
      `visibility: ${formatCounts(smoke.coverage.byVisibility)}`,
      ...smoke.warnings.map((warning) => `warning: ${warning}`),
      ...smoke.errors.map((error) => `error: ${error}`),
    ].join("\n"),
  );

  if (!smoke.ok) {
    process.exit(1);
  }
}

function parseArgs(argv: string[], cwd: string): CliOptions {
  return {
    baseChunkPath: path.resolve(pickArgValue(argv, "--base-chunks") ?? ".cortex/chunk-manifest.base.json"),
    croptoManifestPath: path.resolve(pickArgValue(argv, "--cropto-manifest") ?? ".cortex/cropto-source-manifest.json"),
    indexRoot: path.resolve(pickArgValue(argv, "--index-root") ?? process.env.CORTEX_INDEX_ROOT ?? cwd),
    ledgerPath: path.resolve(pickArgValue(argv, "--ledger") ?? ".cortex/source-ledger.json"),
    manifestPath: path.resolve(pickArgValue(argv, "--manifest") ?? ".cortex/ecosystem-source-manifest.json"),
    minChunks: Number.parseInt(pickArgValue(argv, "--min-chunks") ?? "1", 10),
    mn7rRoot: pickArgValue(argv, "--mn7r-root"),
    mn7rSnapshotPath: path.resolve(pickArgValue(argv, "--mn7r-snapshot") ?? ".cortex/mn7r-source-snapshot.json"),
    outPath: path.resolve(pickArgValue(argv, "--out") ?? ".cortex/chunk-manifest.runtime.json"),
    previousManifestPath: pickArgValue(argv, "--previous")
      ? path.resolve(pickArgValue(argv, "--previous") as string)
      : undefined,
    requiredProjects: pickListArg(argv, "--require-project") as CortexScanRoot["ownerProject"][],
  };
}

async function readOptionalJson<T>(filePath: string): Promise<T | null> {
  if (!await pathExists(filePath)) return null;
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function pickArgValue(argv: string[], key: string) {
  const pair = argv.find((value) => value.startsWith(`${key}=`));
  if (pair) return pair.slice(key.length + 1);
  const index = argv.indexOf(key);
  return index >= 0 ? argv[index + 1] : undefined;
}

function pickListArg(argv: string[], key: string) {
  return argv
    .filter((value) => value.startsWith(`${key}=`))
    .flatMap((value) => value.slice(key.length + 1).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function formatCounts(counts: Record<string, number>) {
  const pairs = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  return pairs.length > 0 ? pairs.map(([key, value]) => `${key}=${value}`).join(", ") : "none";
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
