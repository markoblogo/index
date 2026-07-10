import { COMMODITY_INTELLIGENCE_PRODUCT_NAME } from "@/lib/commodity-intelligence-layer";
import type { CortexChunkManifest, CortexSourceChunk } from "@/lib/cortex-source-chunker";

export type CortexArtifactSmokeRequirement = {
  minChunks?: number;
  requiredOwnerProjects?: CortexSourceChunk["ownerProject"][];
  requiredSourceIds?: string[];
};

export type CortexArtifactSmokeReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  coverage: {
    byOwnerProject: Record<string, number>;
    bySourceId: Record<string, number>;
    byVisibility: Record<string, number>;
  };
  totals: CortexChunkManifest["totals"];
};

export function smokeTestCortexArtifactPipeline(
  manifest: CortexChunkManifest,
  requirement: CortexArtifactSmokeRequirement = {},
): CortexArtifactSmokeReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const minChunks = requirement.minChunks ?? 1;
  const byOwnerProject = countBy(manifest.chunks, (chunk) => chunk.ownerProject);
  const bySourceId = countBy(manifest.chunks, (chunk) => chunk.sourceId);
  const byVisibility = countBy(manifest.chunks, (chunk) => chunk.visibility);

  if (manifest.product !== COMMODITY_INTELLIGENCE_PRODUCT_NAME) {
    errors.push(`unexpected product: ${manifest.product}`);
  }
  if (manifest.schemaVersion !== 1) {
    errors.push(`unsupported schemaVersion: ${manifest.schemaVersion}`);
  }
  if (manifest.totals.chunks !== manifest.chunks.length) {
    errors.push(`totals.chunks mismatch: ${manifest.totals.chunks} != ${manifest.chunks.length}`);
  }
  if (manifest.chunks.length < minChunks) {
    errors.push(`too few chunks: ${manifest.chunks.length} < ${minChunks}`);
  }

  for (const ownerProject of requirement.requiredOwnerProjects ?? []) {
    if (!byOwnerProject[ownerProject]) {
      errors.push(`missing ownerProject: ${ownerProject}`);
    }
  }
  for (const sourceId of requirement.requiredSourceIds ?? []) {
    if (!bySourceId[sourceId]) {
      errors.push(`missing sourceId: ${sourceId}`);
    }
  }

  const emptyTextChunks = manifest.chunks.filter((chunk) => !chunk.text.trim()).length;
  if (emptyTextChunks > 0) {
    errors.push(`empty text chunks: ${emptyTextChunks}`);
  }
  const secretChunks = byVisibility.secret ?? 0;
  if (secretChunks > 0) {
    warnings.push(`secret chunks present: ${secretChunks}`);
  }

  return {
    coverage: {
      byOwnerProject,
      bySourceId,
      byVisibility,
    },
    errors,
    ok: errors.length === 0,
    totals: manifest.totals,
    warnings,
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
