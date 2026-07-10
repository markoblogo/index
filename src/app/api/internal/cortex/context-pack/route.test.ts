import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

describe("internal Cortex context-pack build route", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fails closed when no internal secret is configured", async () => {
    const { POST } = await import("./route");

    const response = await POST(buildRequest({ query: "SSI report context" }, "any-token"));

    expect(response.status).toBe(401);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("builds an authorized bounded context pack from the server chunk manifest", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(fixtureChunkManifest()));
    const { POST } = await import("./route");

    const response = await POST(buildRequest({
      filters: { ownerProject: ["index"] },
      maxEvidence: 2,
      purpose: "market-report",
      query: "SSI report context",
    }, "cortex-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(readFile).mock.calls[0]?.[0]).toMatch(/\.cortex\/chunk-manifest\.json$/);
    expect(vi.mocked(readFile).mock.calls[0]?.[1]).toBe("utf8");
    expect(body.product).toBe("1D3X Cortex");
    expect(body.pack.purpose).toBe("market-report");
    expect(body.pack.evidence[0].title).toContain("index:docs/report.md");
    expect(body.search.searchedChunks).toBe(1);
  });

  it("can read the chunk manifest from an explicit server path", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    vi.stubEnv("CORTEX_CHUNK_MANIFEST_PATH", "runtime/cortex/chunks.json");
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(fixtureChunkManifest()));
    const { POST } = await import("./route");

    const response = await POST(buildRequest({
      purpose: "market-report",
      query: "SSI report context",
    }, "cortex-secret"));

    expect(response.status).toBe(200);
    expect(vi.mocked(readFile).mock.calls[0]?.[0]).toMatch(/runtime\/cortex\/chunks\.json$/);
  });

  it("can read the chunk manifest from a remote artifact URL", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    vi.stubEnv("CORTEX_CHUNK_MANIFEST_URL", "https://artifacts.example.com/cortex/chunks.json");
    vi.stubEnv("CORTEX_CHUNK_MANIFEST_BEARER_TOKEN", "artifact-token");
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(fixtureChunkManifest()));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(buildRequest({
      purpose: "market-report",
      query: "SSI report context",
    }, "cortex-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(readFile).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("https://artifacts.example.com/cortex/chunks.json", {
      cache: "no-store",
      headers: { authorization: "Bearer artifact-token" },
    });
    expect(body.pack.evidence[0].id).toBe("c1");
  });

  it("returns a service error when the server has no chunk manifest", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    vi.mocked(readFile).mockRejectedValueOnce(Object.assign(new Error("missing"), { code: "ENOENT" }));
    const { POST } = await import("./route");

    const response = await POST(buildRequest({
      purpose: "source-review",
      query: "SSI report context",
    }, "cortex-secret"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Cortex chunk manifest is not available on this server");
  });

  it("rejects invalid filters", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    const { POST } = await import("./route");

    const response = await POST(buildRequest({
      filters: { ownerProject: ["bad-owner"] },
      purpose: "source-review",
      query: "SSI report context",
    }, "cortex-secret"));

    expect(response.status).toBe(400);
    expect(readFile).not.toHaveBeenCalled();
  });
});

function buildRequest(body: unknown, token: string) {
  return new Request("https://example.com/api/internal/cortex/context-pack", {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
}

function fixtureChunkManifest() {
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
        text: "The SSI report context connects Index and Context evidence.",
        title: "report.md",
        tokenEstimate: 16,
        visibility: "internal",
      },
    ],
    generatedAt: "2026-07-07T00:00:00.000Z",
    product: "1D3X Cortex",
    schemaVersion: 1,
    sourceResults: [],
    sourceScope: "all",
    totals: {
      chunks: 1,
      skippedSources: 0,
      sources: 1,
      textBytes: 64,
    },
  };
}
