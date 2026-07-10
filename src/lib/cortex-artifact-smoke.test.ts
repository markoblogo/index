import { describe, expect, it } from "vitest";
import { smokeTestCortexArtifactPipeline } from "@/lib/cortex-artifact-smoke";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";

describe("cortex artifact smoke", () => {
  it("passes when the runtime manifest has required ecosystem coverage", () => {
    const report = smokeTestCortexArtifactPipeline(fixtureManifest(), {
      minChunks: 3,
      requiredOwnerProjects: ["index", "mn7r", "cropto"],
      requiredSourceIds: ["ecosystem-site-content", "mn7r-broker-user-inputs"],
    });

    expect(report.ok).toBe(true);
    expect(report.coverage.byOwnerProject).toMatchObject({
      cropto: 1,
      index: 1,
      mn7r: 1,
    });
  });

  it("fails closed on missing required projects and malformed totals", () => {
    const manifest = fixtureManifest();
    manifest.totals.chunks = 10;
    manifest.chunks = manifest.chunks.filter((chunk) => chunk.ownerProject !== "mn7r");

    const report = smokeTestCortexArtifactPipeline(manifest, {
      requiredOwnerProjects: ["mn7r"],
    });

    expect(report.ok).toBe(false);
    expect(report.errors).toContain("missing ownerProject: mn7r");
    expect(report.errors).toContain("totals.chunks mismatch: 10 != 2");
  });
});

function fixtureManifest(): CortexChunkManifest {
  return {
    chunks: [
      {
        chunkId: "index-1",
        chunkIndex: 0,
        evidenceId: "index-evidence",
        hash: "index-hash",
        ownerProject: "index",
        relativePath: "docs/context.md",
        rootId: "index-platform",
        sourceHash: "index-source-hash",
        sourceId: "ecosystem-site-content",
        sourceKind: "site-content",
        text: "Index site context.",
        title: "context.md",
        tokenEstimate: 5,
        visibility: "internal",
      },
      {
        chunkId: "mn7r-1",
        chunkIndex: 0,
        evidenceId: "mn7r-evidence",
        hash: "mn7r-hash",
        ownerProject: "mn7r",
        relativePath: "mn7r-source-snapshot.json",
        rootId: "mn7r-protected-source-snapshot",
        sourceHash: "mn7r-source-hash",
        sourceId: "mn7r-broker-user-inputs",
        sourceKind: "raw-data",
        text: "MN7R protected broker input.",
        title: "MN7R source",
        tokenEstimate: 7,
        visibility: "protected",
      },
      {
        chunkId: "cropto-1",
        chunkIndex: 0,
        evidenceId: "cropto-evidence",
        hash: "cropto-hash",
        ownerProject: "cropto",
        relativePath: "docs/context.md",
        rootId: "cropto-platform",
        sourceHash: "cropto-source-hash",
        sourceId: "cropto-repo-docs",
        sourceKind: "repo-doc",
        text: "Cr0pto context.",
        title: "context.md",
        tokenEstimate: 4,
        visibility: "internal",
      },
    ],
    generatedAt: "2026-07-11T00:00:00.000Z",
    product: "1D3X Cortex",
    schemaVersion: 1,
    sourceResults: [],
    sourceScope: "all",
    totals: {
      chunks: 3,
      skippedSources: 0,
      sources: 3,
      textBytes: 64,
    },
  };
}
