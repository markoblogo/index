import { describe, expect, it } from "vitest";
import { getIndexTenantDataScope } from "@/lib/tenant-data-scope";

describe("tenant data scope", () => {
  it("returns explicit tenant and product scope for index tenants", () => {
    expect(
      getIndexTenantDataScope({
        tenantId: "spike-ua",
        marketId: "spike-ua",
        indexProductId: "spike-ua",
        runtimeMode: "production",
      }),
    ).toEqual({ tenantId: "spike-ua", indexProductId: "spike-ua" });
  });

  it("rejects platform tenant for index data access", () => {
    expect(() =>
      getIndexTenantDataScope({ tenantId: "1d3x", runtimeMode: "production" }),
    ).toThrow("does not own index market data");
  });
});

