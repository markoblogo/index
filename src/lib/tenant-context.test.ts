import { describe, expect, it, vi } from "vitest";

describe("tenant context", () => {
  it("resolves the platform tenant without treating 1D3X as an index product", async () => {
    vi.stubEnv("INDEX_TENANT", "1d3x");
    vi.stubEnv("NEXT_PUBLIC_INDEX_TENANT", "1d3x");

    const { getTenantContext } = await import("@1d3x/data");

    expect(getTenantContext()).toEqual({
      tenantId: "1d3x",
      runtimeMode: "development",
    });

    vi.unstubAllEnvs();
  });
});
