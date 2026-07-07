import { describe, expect, it } from "vitest";
import { buildCortexMemoryContextPack } from "@/lib/cortex-memory-context-pack";
import {
  buildCortexMn7rSnapshotChunkManifest,
  mergeCortexChunkManifests,
  type CortexMn7rSourceSnapshot,
} from "@/lib/cortex-mn7r-source-snapshot";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";

describe("cortex mn7r source snapshot", () => {
  it("converts protected MN7R raw source evidence into searchable chunks", () => {
    const manifest = buildCortexMn7rSnapshotChunkManifest({
      generatedAt: "2026-07-07T12:00:00.000Z",
      snapshot: fixtureSnapshot(),
    });

    expect(manifest.product).toBe("1D3X Cortex");
    expect(manifest.totals.chunks).toBe(2);
    expect(manifest.chunks[0]).toMatchObject({
      ownerProject: "mn7r",
      rootId: "mn7r-protected-source-snapshot",
      sourceId: "mn7r-broker-user-inputs",
      visibility: "protected",
    });
    expect(manifest.chunks.map((chunk) => chunk.text).join("\n")).toContain("Corn CPT Odesa");
    expect(manifest.chunks.map((chunk) => chunk.text).join("\n")).not.toContain("broker@example.com");
    expect(manifest.chunks.map((chunk) => chunk.text).join("\n")).not.toContain("Sensitive Seller");
  });

  it("keeps MN7R protected snapshot out of model context unless allowed", () => {
    const manifest = buildCortexMn7rSnapshotChunkManifest({
      snapshot: fixtureSnapshot(),
    });
    const defaultPack = buildCortexMemoryContextPack({
      chunkManifest: manifest,
      purpose: "monitor-index-comparison",
      query: "Corn CPT Odesa spread",
    });
    const allowedPack = buildCortexMemoryContextPack({
      allowProtected: true,
      chunkManifest: manifest,
      purpose: "monitor-index-comparison",
      query: "Corn CPT Odesa spread",
    });

    expect(defaultPack.pack.evidence).toHaveLength(0);
    expect(defaultPack.pack.excluded.map((item) => item.visibility)).toEqual(["protected", "protected"]);
    expect(allowedPack.pack.evidence).toHaveLength(2);
    expect(allowedPack.pack.sourceIds).toEqual([
      "mn7r-broker-user-inputs",
      "mn7r-index-correlation-signals",
    ]);
  });

  it("can merge MN7R snapshot chunks with the base Cortex memory manifest", () => {
    const mn7r = buildCortexMn7rSnapshotChunkManifest({
      generatedAt: "2026-07-07T12:00:00.000Z",
      snapshot: fixtureSnapshot(),
    });
    const merged = mergeCortexChunkManifests({
      base: fixtureBaseManifest(),
      generatedAt: "2026-07-07T12:05:00.000Z",
      mn7r,
    });

    expect(merged.generatedAt).toBe("2026-07-07T12:05:00.000Z");
    expect(merged.chunks.map((chunk) => chunk.sourceId)).toEqual([
      "ecosystem-site-content",
      "mn7r-broker-user-inputs",
      "mn7r-index-correlation-signals",
    ]);
    expect(merged.totals.chunks).toBe(3);
  });
});

function fixtureSnapshot(): CortexMn7rSourceSnapshot {
  return {
    evidence: [
      {
        extractedAt: "2026-07-07T10:00:00.000Z",
        id: "mn7r:broker-input:entry-1",
        metadata: {
          basis: "CPT",
          brokerCode: "BRK1",
          brokerEmail: "broker@example.com",
          commodity: "corn",
          destinationPort: "Odesa",
          price: 201.5,
          redactedFields: ["brokerEmail", "sellerName"],
          sellerName: "Sensitive Seller",
        },
        sourceId: "mn7r-broker-user-inputs",
        summary: "bid | Corn CPT Odesa | 201.5 USD | status=active",
        title: "MN7R BID #101 Corn CPT",
        urlOrPath: "mn7r:sea_brokerage_entries:entry-1",
        visibility: "protected",
      },
      {
        extractedAt: "2026-07-07T10:00:00.000Z",
        id: "mn7r:correlation:corn-cpt-odesa-usd",
        metadata: {
          avgBid: 200,
          avgOffer: 212,
          basis: "CPT",
          commodity: "corn",
          destinationPort: "Odesa",
          spread: 12,
        },
        sourceId: "mn7r-index-correlation-signals",
        summary: "samples=2 | avgBid=200 | avgOffer=212 | spread=12 | USD",
        title: "MN7R signal CORN CPT Odesa",
        urlOrPath: "mn7r:sea_brokerage_entries:correlation:corn-cpt-odesa-usd",
        visibility: "protected",
      },
    ],
    generatedAt: "2026-07-07T10:00:00.000Z",
    ownerProject: "mn7r",
    product: "1D3X Cortex",
    schemaVersion: 1,
    totals: {
      brokerInputEvents: 1,
      correlationSignals: 1,
      redactedFields: 2,
    },
  };
}

function fixtureBaseManifest(): CortexChunkManifest {
  return {
    chunks: [
      {
        chunkId: "cortex:chunk:index:base:0",
        chunkIndex: 0,
        evidenceId: "base-evidence",
        hash: "hash-base",
        ownerProject: "index",
        relativePath: "docs/context.md",
        rootId: "index-platform",
        sourceHash: "source-base",
        sourceId: "ecosystem-site-content",
        sourceKind: "site-content",
        text: "Index context",
        title: "context.md",
        tokenEstimate: 4,
        visibility: "internal",
      },
    ],
    generatedAt: "2026-07-07T11:00:00.000Z",
    product: "1D3X Cortex",
    schemaVersion: 1,
    sourceResults: [
      {
        chunkCount: 1,
        relativePath: "docs/context.md",
        rootId: "index-platform",
        status: "chunked",
      },
    ],
    sourceScope: "all",
    totals: {
      chunks: 1,
      skippedSources: 0,
      sources: 1,
      textBytes: 13,
    },
  };
}
