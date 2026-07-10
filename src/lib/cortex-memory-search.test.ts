import { describe, expect, it } from "vitest";
import { searchCortexMemory } from "@/lib/cortex-memory-search";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";

describe("cortex memory search", () => {
  it("ranks chunks and returns snippets with filters", () => {
    const response = searchCortexMemory({
      chunkManifest: fixtureChunkManifest(),
      filters: {
        ownerProject: ["index"],
      },
      query: "market report context",
    });

    expect(response.product).toBe("1D3X Cortex");
    expect(response.totals.searchedChunks).toBe(2);
    expect(response.results[0]?.chunk.relativePath).toBe("docs/report.md");
    expect(response.results[0]?.snippet).toContain("market report context");
  });

  it("excludes secret chunks by default", () => {
    const response = searchCortexMemory({
      chunkManifest: fixtureChunkManifest(),
      query: "private token",
    });

    expect(response.results).toHaveLength(0);
  });

  it("treats empty filter arrays as unset filters", () => {
    const response = searchCortexMemory({
      chunkManifest: fixtureChunkManifest(),
      filters: {
        ownerProject: [],
        sourceKind: [],
        visibility: [],
      },
      query: "Context",
    });

    expect(response.totals.searchedChunks).toBe(2);
    expect(response.results.length).toBeGreaterThan(0);
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
        relativePath: "src/app/page.tsx",
        rootId: "index-platform",
        sourceHash: "s2",
        sourceId: "ecosystem-code-snapshots",
        sourceKind: "code",
        text: "export const label = 'Context';",
        title: "page.tsx",
        tokenEstimate: 8,
        visibility: "internal",
      },
      {
        chunkId: "c3",
        chunkIndex: 0,
        evidenceId: "e3",
        hash: "h3",
        ownerProject: "mn7r",
        relativePath: "private.md",
        rootId: "mn7r-monitor",
        sourceHash: "s3",
        sourceId: "mn7r-public-docs",
        sourceKind: "repo-doc",
        text: "private token handling",
        title: "private.md",
        tokenEstimate: 4,
        visibility: "secret",
      },
    ],
    generatedAt: "2026-07-07T00:00:00.000Z",
    product: "1D3X Cortex",
    schemaVersion: 1,
    sourceResults: [],
    sourceScope: "all",
    totals: {
      chunks: 3,
      skippedSources: 0,
      sources: 3,
      textBytes: 128,
    },
  };
}
