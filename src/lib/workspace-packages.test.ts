import { describe, expect, it } from "vitest";

import { hashPassword, hasConfiguredCronSecret } from "@1d3x/auth";
import { getTenantContext, tenantScopedWhere } from "@1d3x/data";
import { calculateIndexValue } from "@1d3x/index-engine";
import { getFxRates } from "@1d3x/integrations";
import { getMarketPack } from "@1d3x/market-packs";

describe("workspace package boundaries", () => {
  it("exposes shared auth helpers through @1d3x/auth", async () => {
    expect(hashPassword("secret")).toMatch(/^pbkdf2\$/);
    expect(hasConfiguredCronSecret(["configured"])).toBe(true);
  });

  it("exposes tenant scoped data helpers through @1d3x/data", () => {
    const context = getTenantContext();

    expect(context.tenantId).toBeDefined();
    expect(
      tenantScopedWhere({ tenantId: "spike-ua", runtimeMode: "production" }),
    ).toEqual({
      indexProductId: "spike-ua",
      tenantId: "spike-ua",
    });
  });

  it("exposes index engine helpers through @1d3x/index-engine", () => {
    const result = calculateIndexValue({
      date: "2026-06-01",
      commodityId: "corn",
      deliveryBasisId: "cpt-odesa",
      submissions: [
        { respondentId: "r1", price: 100 },
        { respondentId: "r2", price: 102 },
        { respondentId: "r3", price: 104 },
        { respondentId: "r4", price: 101 },
        { respondentId: "r5", price: 103 },
      ],
    });

    expect(result.status).toBe("publishable");
    expect(result.value).toBe(102);
  });

  it("exposes integrations through @1d3x/integrations", () => {
    expect(typeof getFxRates).toBe("function");
  });

  it("exposes market packs through @1d3x/market-packs", () => {
    expect(getMarketPack({ tenantId: "uga-ua", runtimeMode: "production" }))
      .toMatchObject({
        tenantId: "uga-ua",
      });
    expect(getMarketPack({ tenantId: "spike-ua", runtimeMode: "production" }))
      .toMatchObject({
        tenantId: "spike-ua",
      });
  });
});
