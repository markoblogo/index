import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCortexSourceLedger,
  buildCortexSourceManifest,
  buildLocalEcosystemScanRoots,
  type CortexScanRoot,
  type CortexSourceManifest,
} from "@/lib/cortex-source-scanner";

type CliOptions = {
  ledgerPath: string;
  manifestPath: string;
  previousManifestPath?: string;
  roots: CortexScanRoot[];
};

async function main() {
  const options = await parseArgs(process.argv.slice(2), process.cwd());
  const previousManifest = options.previousManifestPath
    ? await readPreviousManifest(options.previousManifestPath)
    : await readPreviousManifest(options.manifestPath);
  const manifest = await buildCortexSourceManifest({ roots: options.roots });
  const ledger = buildCortexSourceLedger({ manifest, previousManifest });

  await mkdir(path.dirname(options.manifestPath), { recursive: true });
  await mkdir(path.dirname(options.ledgerPath), { recursive: true });
  await writeFile(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(options.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

  console.log(
    [
      `1D3X Cortex source ingest written: ${options.ledgerPath}`,
      `manifest: ${options.manifestPath}`,
      `files: ${manifest.totals.files}`,
      `changes: added=${ledger.changeTotals.added}, changed=${ledger.changeTotals.changed}, removed=${ledger.changeTotals.removed}, unchanged=${ledger.changeTotals.unchanged}`,
      `chunkingQueue: ${ledger.chunkingQueue.length}`,
    ].join("\n"),
  );
}

async function parseArgs(argv: string[], cwd: string): Promise<CliOptions> {
  const manifestPath = path.resolve(pickArgValue(argv, "--manifest") ?? ".cortex/ecosystem-source-manifest.json");
  const ledgerPath = path.resolve(pickArgValue(argv, "--ledger") ?? ".cortex/source-ledger.json");
  const previousManifestPath = pickArgValue(argv, "--previous");
  const rootArgs = argv.filter((value) => value.startsWith("--root=")).map((value) => value.slice("--root=".length));
  const preset = pickArgValue(argv, "--preset") ?? "ecosystem-local";

  if (preset !== "ecosystem-local") {
    throw new Error(`Invalid --preset: ${preset}. Supported preset: ecosystem-local`);
  }

  const roots = rootArgs.length > 0
    ? rootArgs.map(parseRootArg)
    : await buildLocalEcosystemScanRoots({
        croptoRoot: process.env.CORTEX_CROPTO_ROOT,
        indexRoot: process.env.CORTEX_INDEX_ROOT ?? cwd,
        mn7rRoot: process.env.CORTEX_MN7R_ROOT,
      });

  return {
    ledgerPath,
    manifestPath,
    previousManifestPath: previousManifestPath ? path.resolve(previousManifestPath) : undefined,
    roots,
  };
}

async function readPreviousManifest(manifestPath: string): Promise<CortexSourceManifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as CortexSourceManifest;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function parseRootArg(value: string): CortexScanRoot {
  const [ownerProject, rootId, rootPath, visibility = "internal"] = value.split(":");
  if (!ownerProject || !rootId || !rootPath) {
    throw new Error("Invalid --root. Use --root=ownerProject:rootId:/absolute/path[:visibility]");
  }
  if (!isOwnerProject(ownerProject)) {
    throw new Error(`Invalid ownerProject: ${ownerProject}`);
  }
  if (!isVisibility(visibility)) {
    throw new Error(`Invalid visibility: ${visibility}`);
  }

  return {
    ownerProject,
    rootId,
    rootPath,
    visibility,
  };
}

function pickArgValue(argv: string[], key: string) {
  const pair = argv.find((value) => value.startsWith(`${key}=`));
  if (pair) return pair.slice(key.length + 1);
  const index = argv.indexOf(key);
  return index >= 0 ? argv[index + 1] : undefined;
}

function isOwnerProject(value: string): value is CortexScanRoot["ownerProject"] {
  return value === "index" || value === "mn7r" || value === "cropto" || value === "1d3x" || value === "ecosystem";
}

function isVisibility(value: string): value is CortexScanRoot["visibility"] {
  return value === "public" || value === "internal" || value === "protected" || value === "secret";
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
