import { describe, expect, it } from "vitest";
import {
  parseCortexArtifactPublishArgs,
  validateCortexArtifactForPublish,
} from "./cortex-artifact-publish.mjs";

const manifest = {
  chunks: [
    { ownerProject: "index" },
    { ownerProject: "mn7r" },
    { ownerProject: "cropto" },
  ],
  product: "1D3X Cortex",
  schemaVersion: 1,
  totals: { chunks: 3 },
};

describe("cortex-artifact-publish", () => {
  it("validates required project coverage and chunk minimum", () => {
    expect(validateCortexArtifactForPublish(manifest, { minChunks: 3 })).toEqual([]);
    expect(validateCortexArtifactForPublish(manifest, { minChunks: 4 }).some((error) => error.includes("minimum is 4"))).toBe(true);
  });

  it("rejects an artifact without a required project", () => {
    expect(validateCortexArtifactForPublish({ ...manifest, chunks: [{ ownerProject: "index" }] }, { minChunks: 1 }))
      .toContain("required project is missing: mn7r");
  });

  it("parses the manifest path without accepting an upload token argument", () => {
    expect(parseCortexArtifactPublishArgs(["--manifest", ".cortex/runtime.json"])).toEqual({
      manifestPath: ".cortex/runtime.json",
    });
  });
});
