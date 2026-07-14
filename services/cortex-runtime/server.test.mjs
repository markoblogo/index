import { afterEach, describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCortexRuntimeServer, validateRuntimeManifest } from "./server.mjs";

const manifest = {
  chunks: [{ ownerProject: "index" }, { ownerProject: "mn7r" }, { ownerProject: "cropto" }],
  generatedAt: "2026-07-14T00:00:00.000Z",
  product: "1D3X Cortex",
  schemaVersion: 1,
  sourceScope: "all",
  totals: { chunks: 3, skippedSources: 0, sources: 3, textBytes: 30 },
};

describe("Cortex runtime service", () => {
  let server;
  let dataDir;

  afterEach(async () => {
    server?.close();
    if (dataDir) await rm(dataDir, { force: true, recursive: true });
  });

  it("validates coverage before accepting a manifest", () => {
    expect(validateRuntimeManifest(manifest, { minChunks: 3 })).toEqual([]);
    expect(validateRuntimeManifest(manifest, { minChunks: 4 }).some((error) => error.includes("minimum is 4"))).toBe(true);
    expect(validateRuntimeManifest({ ...manifest, totals: { ...manifest.totals, chunks: 4 } }, { minChunks: 3 }))
      .toContain("manifest chunk total does not match chunks array");
  });

  it("serves health, rejects unauthenticated reads and stores gzip uploads", async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), "cortex-runtime-"));
    server = createCortexRuntimeServer({ dataDir, minChunks: 3, token: "runtime-secret" });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ artifactReady: false, ok: true, product: "1D3X Cortex" });

    const unauthorized = await fetch(`${baseUrl}/manifest`);
    expect(unauthorized.status).toBe(401);

    const upload = await fetch(`${baseUrl}/manifest`, {
      body: gzipSync(Buffer.from(JSON.stringify(manifest))),
      headers: { authorization: "Bearer runtime-secret", "content-encoding": "gzip" },
      method: "PUT",
    });
    expect(upload.status).toBe(201);

    const read = await fetch(`${baseUrl}/manifest`, {
      headers: { authorization: "Bearer runtime-secret" },
    });
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ product: "1D3X Cortex", totals: manifest.totals });
  });
});
