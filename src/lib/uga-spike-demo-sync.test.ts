import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    auditLog: { create: vi.fn() },
  },
  hasDatabaseUrl: () => true,
}));

vi.mock("@/lib/index-platform", () => ({
  getActiveIndexConfig: () => ({ id: "uga-ua" }),
}));

describe("UGA Spike demo sync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches Spike public API data with an abort signal", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ data: [] }),
    );
    const { syncUgaDemoIndicesFromSpike } = await import("./uga-spike-demo-sync");

    await expect(syncUgaDemoIndicesFromSpike({
      mode: "latest",
      sourceBaseUrl: "https://spike.example.com",
    })).resolves.toMatchObject({
      copied: 0,
      skipped: 0,
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
