import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CortexVisibility } from "@/lib/commodity-intelligence-layer";
import { searchCortexMemory, type CortexMemorySearchFilters } from "@/lib/cortex-memory-search";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";
import type { CortexScanRoot, CortexScannedSourceKind } from "@/lib/cortex-source-scanner";

type CliOptions = {
  chunkManifestPath: string;
  filters: CortexMemorySearchFilters;
  includeSecret: boolean;
  limit: number;
  outPath?: string;
  query: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chunkManifest = JSON.parse(await readFile(options.chunkManifestPath, "utf8")) as CortexChunkManifest;
  const response = searchCortexMemory({
    chunkManifest,
    filters: options.filters,
    limit: options.limit,
    query: options.query,
  });

  if (options.outPath) {
    await writeFile(options.outPath, `${JSON.stringify(response, null, 2)}\n`);
  }

  console.log(
    [
      `1D3X Cortex memory search`,
      `query: ${response.query}`,
      `searchedChunks: ${response.totals.searchedChunks}`,
      `matchedChunks: ${response.totals.matchedChunks}`,
      ...response.results.map((result, index) => [
        `${index + 1}. score=${result.score} ${result.chunk.ownerProject}:${result.chunk.relativePath}#${result.chunk.chunkIndex}`,
        `   kind=${result.chunk.sourceKind} visibility=${result.chunk.visibility}`,
        `   ${result.snippet}`,
      ].join("\n")),
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): CliOptions {
  const query = pickArgValue(argv, "--query") ?? argv.find((value) => !value.startsWith("--"));
  if (!query) {
    throw new Error("Missing query. Use --query=\"market context\" or pass a positional query.");
  }

  const includeSecret = argv.includes("--include-secret");
  const visibility = parseVisibilityList(pickArgValue(argv, "--visibility"));
  return {
    chunkManifestPath: path.resolve(pickArgValue(argv, "--chunks") ?? ".cortex/chunk-manifest.json"),
    filters: {
      ownerProject: parseOwnerList(pickArgValue(argv, "--owner")),
      sourceKind: parseSourceKindList(pickArgValue(argv, "--kind")),
      visibility: includeSecret
        ? (visibility.length > 0 ? visibility : ["public", "internal", "protected", "secret"])
        : (visibility.length > 0 ? visibility : undefined),
    },
    includeSecret,
    limit: Number(pickArgValue(argv, "--limit") ?? 8),
    outPath: pickArgValue(argv, "--out") ? path.resolve(pickArgValue(argv, "--out") as string) : undefined,
    query,
  };
}

function pickArgValue(argv: string[], key: string) {
  const pair = argv.find((value) => value.startsWith(`${key}=`));
  if (pair) return pair.slice(key.length + 1);
  const index = argv.indexOf(key);
  return index >= 0 ? argv[index + 1] : undefined;
}

function splitArg(value?: string) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function parseOwnerList(value?: string): CortexScanRoot["ownerProject"][] | undefined {
  const owners = splitArg(value);
  if (owners.length === 0) return undefined;
  return owners.map((owner) => {
    if (owner === "index" || owner === "mn7r" || owner === "cropto" || owner === "1d3x" || owner === "ecosystem") {
      return owner;
    }
    throw new Error(`Invalid --owner value: ${owner}`);
  });
}

function parseSourceKindList(value?: string): CortexScannedSourceKind[] | undefined {
  const kinds = splitArg(value);
  if (kinds.length === 0) return undefined;
  return kinds.map((kind) => {
    if (
      kind === "action-event" ||
      kind === "archive" ||
      kind === "code" ||
      kind === "development-plan" ||
      kind === "manual-book" ||
      kind === "repo-doc" ||
      kind === "site-content"
    ) {
      return kind;
    }
    throw new Error(`Invalid --kind value: ${kind}`);
  });
}

function parseVisibilityList(value?: string): CortexVisibility[] {
  return splitArg(value).map((visibility) => {
    if (visibility === "public" || visibility === "internal" || visibility === "protected" || visibility === "secret") {
      return visibility;
    }
    throw new Error(`Invalid --visibility value: ${visibility}`);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
