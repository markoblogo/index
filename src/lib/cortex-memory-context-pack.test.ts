import { describe, expect, it } from "vitest";
import { buildCortexMemoryContextPack } from "@/lib/cortex-memory-context-pack";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";

describe("cortex memory context pack", () => {
  it("builds a bounded pack from local memory search results", () => {
    const artifact = buildCortexMemoryContextPack({
      chunkManifest: fixtureChunkManifest(),
      filters: {
        ownerProject: ["index"],
      },
      purpose: "source-review",
      query: "market report context",
    });

    expect(artifact.product).toBe("1D3X Cortex");
    expect(artifact.pack.evidence).toHaveLength(1);
    expect(artifact.pack.evidence[0]?.summary).toContain("market report context");
    expect(artifact.modelContextText).toContain("Approved evidence");
    expect(artifact.search.searchedChunks).toBe(2);
  });

  it("excludes protected evidence unless explicitly allowed", () => {
    const defaultArtifact = buildCortexMemoryContextPack({
      chunkManifest: fixtureChunkManifest(),
      purpose: "execution-context",
      query: "execution checklist",
    });
    const allowedArtifact = buildCortexMemoryContextPack({
      allowProtected: true,
      chunkManifest: fixtureChunkManifest(),
      purpose: "execution-context",
      query: "execution checklist",
    });

    expect(defaultArtifact.pack.evidence).toHaveLength(0);
    expect(defaultArtifact.pack.excluded[0]?.visibility).toBe("protected");
    expect(allowedArtifact.pack.evidence).toHaveLength(1);
  });
});

function fixtureChunkManifest(): CortexChunkManifest {
  return {
    chunks: [
      {
        chunkId: "c1",
        chunkIndex: 0,
        evidenceId: "e1",
        hash: "h1",
        ownerProject: "index",
        relativePath: "docs/report.md",
        rootId: "index-platform",
        sourceHash: "s1",
        sourceId: "ecosystem-site-content",
        sourceKind: "site-content",
        text: "The market report context connects SSI, 1D3X and Context evidence.",
        title: "report.md",
        tokenEstimate: 16,
        visibility: "internal",
      },
      {
        chunkId: "c2",
        chunkIndex: 0,
        evidenceId: "e2",
        hash: "h2",
        ownerProject: "index",
        relativePath: "docs/execution.md",
        rootId: "index-platform",
        sourceHash: "s2",
        sourceId: "ecosystem-development-plans",
        sourceKind: "development-plan",
        text: "MN7R execution checklist should compare monitor signals with Index context.",
        title: "execution.md",
        tokenEstimate: 15,
        visibility: "protected",
      },
    ],
    generatedAt: "2026-07-07T00:00:00.000Z",
    product: "1D3X Cortex",
    schemaVersion: 1,
    sourceResults: [],
    sourceScope: "all",
    totals: {
      chunks: 2,
      skippedSources: 0,
      sources: 2,
      textBytes: 128,
    },
  };
}
