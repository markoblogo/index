import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCortexChunkManifest } from "@/lib/cortex-source-chunker";
import {
  buildCortexSourceLedger,
  buildCortexSourceManifest,
  type CortexScanRoot,
} from "@/lib/cortex-source-scanner";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("cortex source chunker", () => {
  it("chunks text sources from the ingestion queue and skips unsupported files", async () => {
    const rootPath = await createChunkFixtureRoot();
    const roots: CortexScanRoot[] = [
      {
        ownerProject: "index",
        rootId: "fixture-index",
        rootPath,
        visibility: "internal",
      },
    ];
    const manifest = await buildCortexSourceManifest({
      generatedAt: "2026-07-07T00:00:00.000Z",
      roots,
    });
    const ledger = buildCortexSourceLedger({ manifest, previousManifest: null });

    const chunkManifest = await buildCortexChunkManifest({
      generatedAt: "2026-07-07T00:01:00.000Z",
      ledger,
    });

    expect(chunkManifest.product).toBe("1D3X Cortex");
    expect(chunkManifest.sourceScope).toBe("queue");
    expect(chunkManifest.totals.sources).toBe(3);
    expect(chunkManifest.totals.chunks).toBeGreaterThanOrEqual(2);
    expect(chunkManifest.totals.skippedSources).toBe(1);
    expect(chunkManifest.chunks.map((chunk) => chunk.relativePath)).toContain("README.md");
    expect(chunkManifest.chunks.every((chunk) => chunk.text.length > 0)).toBe(true);
    expect(chunkManifest.sourceResults.find((result) => result.relativePath === "docs/manual.pdf")).toMatchObject({
      reason: "unsupported-extension:.pdf",
      status: "skipped",
    });
  });
});

async function createChunkFixtureRoot() {
  const rootPath = await mkdtemp(path.join(os.tmpdir(), "cortex-source-chunk-"));
  tempRoots.push(rootPath);

  await mkdir(path.join(rootPath, "docs"), { recursive: true });
  await writeFile(path.join(rootPath, "README.md"), "# Fixture\n\nMarket context ".repeat(120));
  await writeFile(path.join(rootPath, "docs/plan.md"), "# Plan\n\nChunk me.");
  await writeFile(path.join(rootPath, "docs/manual.pdf"), "PDF bytes");

  return rootPath;
}
