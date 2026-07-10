import { COMMODITY_INTELLIGENCE_PRODUCT_NAME } from "@/lib/commodity-intelligence-layer";
import {
  buildCortexSourceLedger,
  type CortexSourceLedger,
  type CortexSourceManifest,
  type CortexSourceManifestEntry,
} from "@/lib/cortex-source-scanner";

export type CortexCroptoSourceManifest = {
  generatedAt: string;
  product: "1D3X Cortex";
  root: {
    ownerProject: "cropto";
    rootId: "cropto";
    rootPath: string;
    visibility: "public" | "internal" | "protected" | "secret";
  };
  schemaVersion: 1;
  sources: CortexSourceManifestEntry[];
  totals?: Record<string, unknown>;
};

export function normalizeCroptoSourceManifest(input: CortexCroptoSourceManifest): CortexSourceManifest {
  const sources = input.sources.map((source) => ({
    ...source,
    ownerProject: "cropto" as const,
    rootId: source.rootId || "cropto",
  }));
  return {
    generatedAt: input.generatedAt,
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    roots: [{
      ownerProject: "cropto",
      rootId: input.root.rootId || "cropto",
      rootPath: input.root.rootPath,
      visibility: input.root.visibility,
    }],
    schemaVersion: 1,
    sources,
    totals: {
      byKind: {
        "action-event": 0,
        archive: 0,
        code: 0,
        "development-plan": 0,
        "manual-book": 0,
        "repo-doc": 0,
        "site-content": 0,
      },
      byProject: {
        "1d3x": 0,
        cropto: sources.length,
        ecosystem: 0,
        index: 0,
        mn7r: 0,
      },
      files: sources.length,
      sizeBytes: sources.reduce((sum, source) => sum + source.sizeBytes, 0),
    },
  };
}

export function buildCroptoSourceLedger(input: {
  manifest: CortexCroptoSourceManifest;
  previousManifest?: CortexSourceManifest | CortexCroptoSourceManifest | null;
}): CortexSourceLedger {
  return buildCortexSourceLedger({
    manifest: normalizeCroptoSourceManifest(input.manifest),
    previousManifest: normalizePreviousManifest(input.previousManifest),
  });
}

function normalizePreviousManifest(
  manifest?: CortexSourceManifest | CortexCroptoSourceManifest | null,
) {
  if (!manifest) return null;
  if ("roots" in manifest) return manifest;
  return normalizeCroptoSourceManifest(manifest);
}
