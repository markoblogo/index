import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCortexSourceManifest,
  type CortexScanRoot,
} from "@/lib/cortex-source-scanner";

type CliOptions = {
  outPath: string;
  roots: CortexScanRoot[];
};

async function main() {
  const options = parseArgs(process.argv.slice(2), process.cwd());
  const manifest = await buildCortexSourceManifest({ roots: options.roots });
  await mkdir(path.dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    [
      `1D3X Cortex source manifest written: ${options.outPath}`,
      `files: ${manifest.totals.files}`,
      `bytes: ${manifest.totals.sizeBytes}`,
      `kinds: ${Object.entries(manifest.totals.byKind).map(([kind, count]) => `${kind}=${count}`).join(", ")}`,
    ].join("\n"),
  );
}

function parseArgs(argv: string[], cwd: string): CliOptions {
  const outPath = path.resolve(pickArgValue(argv, "--out") ?? ".cortex/source-manifest.json");
  const rootArgs = argv.filter((value) => value.startsWith("--root=")).map((value) => value.slice("--root=".length));
  const roots = rootArgs.length > 0
    ? rootArgs.map(parseRootArg)
    : [
        {
          ownerProject: "index" as const,
          rootId: "index-platform",
          rootPath: cwd,
          visibility: "internal" as const,
        },
      ];

  return {
    outPath,
    roots,
  };
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
