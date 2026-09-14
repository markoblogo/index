import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, fetchReadthrough } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  fetchReadthrough: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  allowMockFallback: () => false,
  db: { $queryRaw: queryRaw },
  hasDatabaseUrl: () => true,
}));

vi.mock("@/lib/uga-spike-readthrough", () => ({
  fetchUgaSpikeReadthrough: fetchReadthrough,
  getUgaSpikeReadthroughSource: () => "https://spike.1d3x.com",
  isUgaSpikeReadthroughEnabled: () => true,
}));

import { GET } from "./route";

describe("UGA read-through health", () => {
  beforeEach(() => {
    queryRaw.mockReset();
    fetchReadthrough.mockReset();
  });

  it("reports a healthy SPIKE source without touching the stale UGA database", async () => {
    fetchReadthrough.mockResolvedValue({ data: [{ commodityCode: "CORN" }] });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      mode: "spike_readthrough",
      upstream: "ok",
      databaseRequired: false,
    });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("fails closed when SPIKE cannot supply public data", async () => {
    fetchReadthrough.mockRejectedValue(new Error("upstream unavailable"));

    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      mode: "spike_readthrough",
      upstream: "unavailable",
    });
  });
});
