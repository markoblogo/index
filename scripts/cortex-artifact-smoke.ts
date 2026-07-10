import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  smokeTestCortexArtifactPipeline,
  type CortexArtifactSmokeRequirement,
} from "@/lib/cortex-artifact-smoke";
import type { CortexChunkManifest, CortexSourceChunk } from "@/lib/cortex-source-chunker";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(options.manifestPath, "utf8")) as CortexChunkManifest;
  const report = smokeTestCortexArtifactPipeline(manifest, options.requirement);

  console.log(
    [
      `1D3X Cortex artifact smoke: ${report.ok ? "ok" : "failed"}`,
      `manifest: ${options.manifestPath}`,
      `chunks: ${report.totals.chunks}`,
      `projects: ${formatCounts(report.coverage.byOwnerProject)}`,
      `visibility: ${formatCounts(report.coverage.byVisibility)}`,
      ...report.warnings.map((warning) => `warning: ${warning}`),
      ...report.errors.map((error) => `error: ${error}`),
    ].join("\n"),
  );

  if (!report.ok) {
    process.exit(1);
  }
}

type CliOptions = {
  manifestPath: string;
  requirement: CortexArtifactSmokeRequirement;
};

function parseArgs(argv: string[]): CliOptions {
  return {
    manifestPath: path.resolve(pickArgValue(argv, "--manifest") ?? ".cortex/chunk-manifest.runtime.json"),
    requirement: {
      minChunks: Number.parseInt(pickArgValue(argv, "--min-chunks") ?? "1", 10),
      requiredOwnerProjects: pickListArg(argv, "--require-project") as CortexSourceChunk["ownerProject"][],
      requiredSourceIds: pickListArg(argv, "--require-source-id"),
    },
  };
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
