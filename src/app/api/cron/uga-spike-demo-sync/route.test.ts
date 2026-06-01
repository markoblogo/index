import { describe, expect, it, vi } from "vitest";

describe("UGA Spike demo sync route", () => {
  it("is removed from production runtime", async () => {
    vi.stubEnv("UGA_INDEX_RUNTIME_MODE", "production");
    const { GET } = await import("./route");
    const response = await GET(new Request("https://uga.1d3x.com/api/cron/uga-spike-demo-sync"));

    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({
      skippedReason: "uga_spike_demo_sync_removed_from_production_path",
    });
    vi.unstubAllEnvs();
  });
});

