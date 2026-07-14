import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));

describe("internal Cortex assistant gateway", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fails closed without the internal secret", async () => {
    const { POST } = await import("./route");
    const response = await POST(buildRequest({
      language: "en",
      localContext: {},
      project: "mn7r",
      query: "EXE payment status",
      surface: "exe-assistant",
    }, "wrong-token"));

    expect(response.status).toBe(401);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("retrieves bounded Cortex memory and owns the OpenAI handoff", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    vi.stubEnv("OPENAI_API_KEY", "openai-secret");
    vi.stubEnv("CORTEX_ASSISTANT_MODEL", "gpt-test");
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(fixtureChunkManifest()));
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({
      output: [{ content: [{ text: "Answer with [mn7r-exe-runtime-context]." }] }],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(buildRequest({
      language: "en",
      localContext: { exeStatus: "open", suggestions: ["review payment"] },
      project: "mn7r",
      query: "EXE payment status",
      roleMode: "admin",
      surface: "exe-assistant",
    }, "cortex-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.product).toBe("1D3X Cortex");
    expect(body.answer).toContain("[mn7r-exe-runtime-context]");
    expect(body.audit).toMatchObject({
      contextPackId: expect.stringContaining("cortex-pack:"),
      evidenceCount: 2,
      knownGapCount: expect.any(Number),
      provider: "openai",
      requestId: expect.stringContaining("cortex-assistant:"),
    });
    expect(body.routing).toEqual({ handoff: "cortex-owned", model: "gpt-test", provider: "openai" });
    expect(body.contextPack.sourceIds).toContain("mn7r-exe-runtime-context");
    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer openai-secret" }),
    }));
  });

  it("rejects a non-MN7R surface", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    const { POST } = await import("./route");
    const response = await POST(buildRequest({
      language: "en",
      localContext: {},
      project: "cropto",
      query: "What needs attention?",
      roleMode: "admin",
      surface: "assistant",
    }, "cortex-secret"));

    expect(response.status).toBe(400);
    expect(readFile).not.toHaveBeenCalled();
  });
});

function buildRequest(body: unknown, token: string) {
  return new Request("https://example.com/api/internal/cortex/assistant", {
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
    chunks: [{
      chunkId: "c1",
      chunkIndex: 0,
      evidenceId: "e1",
      hash: "h1",
      ownerProject: "mn7r",
      relativePath: "docs/exe.md",
      rootId: "mn7r-monitor",
      sourceHash: "s1",
      sourceId: "mn7r-exe-manual",
      sourceKind: "repo-doc",
      text: "EXE officers review contract execution status and payment gaps.",
      title: "EXE manual",
      tokenEstimate: 12,
      visibility: "protected",
    }],
    generatedAt: "2026-07-14T10:00:00.000Z",
    product: "1D3X Cortex",
    schemaVersion: 1,
  };
}
