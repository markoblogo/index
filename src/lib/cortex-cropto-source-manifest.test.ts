import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCroptoSourceLedger,
  normalizeCroptoSourceManifest,
  type CortexCroptoSourceManifest,
} from "@/lib/cortex-cropto-source-manifest";
import { buildCortexMemoryContextPack } from "@/lib/cortex-memory-context-pack";
import { buildCortexChunkManifest } from "@/lib/cortex-source-chunker";

describe("cortex cropto source manifest", () => {
  it("normalizes Cr0pto manifest into standard Cortex source manifest shape", () => {
    const normalized = normalizeCroptoSourceManifest(fixtureManifest());

    expect(normalized.product).toBe("1D3X Cortex");
    expect(normalized.roots).toEqual([{
      ownerProject: "cropto",
      rootId: "cropto",
      rootPath: "/repo/cropto",
      visibility: "internal",
    }]);
    expect(normalized.totals.byProject.cropto).toBe(2);
    expect(normalized.totals.byKind["repo-doc"]).toBe(0);
    expect(normalized.totals.files).toBe(2);
  });

  it("builds chunkable Cropto ledger for context-pack retrieval", async () => {
    const rootPath = await fixtureRepo();
    const ledger = buildCroptoSourceLedger({ manifest: fixtureManifest({ rootPath }) });
    const chunks = await buildCortexChunkManifest({
      ledger,
      sourceScope: "all",
    });
    const pack = buildCortexMemoryContextPack({
      chunkManifest: chunks,
      filters: { ownerProject: ["cropto"] },
      purpose: "source-review",
      query: "indexed trading settlement public scenario",
    });

    expect(ledger.chunkingQueue).toHaveLength(2);
    expect(chunks.chunks.map((chunk) => chunk.ownerProject)).toEqual(["cropto", "cropto"]);
    expect(pack.pack.evidence.map((item) => item.sourceId)).toContain("cropto-public-surfaces");
    expect(pack.pack.evidence.map((item) => item.sourceId)).toContain("ecosystem-site-content");
  });

  it("detects changed Cropto sources against previous manifest", () => {
    const current = fixtureManifest();
    const previous = fixtureManifest({
      firstHash: "old-hash",
    });
    const ledger = buildCroptoSourceLedger({
      manifest: current,
      previousManifest: previous,
    });

    expect(ledger.changeTotals.changed).toBe(1);
    expect(ledger.changeTotals.unchanged).toBe(1);
    expect(ledger.chunkingQueue.map((source) => source.relativePath)).toEqual(["README.md"]);
  });
});

async function fixtureRepo() {
  const rootPath = path.join(os.tmpdir(), `cortex-cropto-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(path.join(rootPath, "client/src"), { recursive: true });
  await writeFile(path.join(rootPath, "README.md"), "Cropto indexed trading settlement public scenario.");
  await writeFile(path.join(rootPath, "client/src/App.tsx"), "export const app = 'indexed trading settlement interface';");
  return rootPath;
}

function fixtureManifest(overrides: { firstHash?: string; rootPath?: string } = {}): CortexCroptoSourceManifest {
  return {
    generatedAt: "2026-07-10T10:00:00.000Z",
    product: "1D3X Cortex",
    root: {
      ownerProject: "cropto",
      rootId: "cropto",
      rootPath: overrides.rootPath ?? "/repo/cropto",
      visibility: "internal",
    },
    schemaVersion: 1,
    sources: [
      {
        evidenceId: "cortex:cropto:readme",
        extractedAt: "2026-07-10T10:00:00.000Z",
        hash: overrides.firstHash ?? "hash-readme",
        ownerProject: "cropto",
        relativePath: "README.md",
        rootId: "cropto",
        sizeBytes: 80,
        sourceId: "cropto-public-surfaces",
        sourceKind: "repo-doc",
        title: "README.md",
        urlOrPath: "cropto:README.md",
        visibility: "public",
      },
      {
        evidenceId: "cortex:cropto:app",
        extractedAt: "2026-07-10T10:00:00.000Z",
        hash: "hash-app",
        ownerProject: "cropto",
        relativePath: "client/src/App.tsx",
        rootId: "cropto",
        sizeBytes: 120,
        sourceId: "ecosystem-site-content",
        sourceKind: "site-content",
        title: "App.tsx",
        urlOrPath: "cropto:client/src/App.tsx",
        visibility: "internal",
      },
    ],
    totals: {
      files: 2,
    },
  };
}
