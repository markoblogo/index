import { afterEach, describe, expect, it, vi } from "vitest";

const loadCortexRuntimeChunkManifest = vi.fn();

vi.mock("@/lib/cortex-runtime-chunk-manifest", () => ({
  loadCortexRuntimeChunkManifest,
}));

describe("internal Cortex runtime health", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("fails closed without an internal token", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/internal/cortex/health", {
      headers: { authorization: "Bearer wrong-token" },
    }));

    expect(response.status).toBe(401);
    expect(loadCortexRuntimeChunkManifest).not.toHaveBeenCalled();
  });

  it("reports ready without exposing runtime secrets", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    vi.stubEnv("OPENAI_API_KEY", "openai-secret");
    loadCortexRuntimeChunkManifest.mockResolvedValueOnce({
      ok: true,
      value: {
        generatedAt: "2026-07-14T00:00:00.000Z",
        product: "1D3X Cortex",
        schemaVersion: 1,
        sourceScope: "all",
        sourceResults: [],
        chunks: [],
        totals: { chunks: 12, skippedSources: 2, sources: 8, textBytes: 2400 },
      },
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/internal/cortex/health", {
      headers: { authorization: "Bearer cortex-secret" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      assistantProvider: "configured",
      mode: "observe-learn",
      ok: true,
      product: "1D3X Cortex",
      service: "cortex-runtime",
      manifest: { sourceScope: "all", totals: { chunks: 12 } },
    });
    expect(JSON.stringify(body)).not.toContain("openai-secret");
    expect(JSON.stringify(body)).not.toContain("cortex-secret");
  });

  it("returns unavailable when the manifest is missing", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    vi.stubEnv("OPENAI_API_KEY", "openai-secret");
    loadCortexRuntimeChunkManifest.mockResolvedValueOnce({
      error: "Cortex chunk manifest is not available on this server",
      ok: false,
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/internal/cortex/health", {
      headers: { authorization: "Bearer cortex-secret" },
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      assistantProvider: "configured",
      manifest: { status: "unavailable" },
      ok: false,
    });
  });
});
