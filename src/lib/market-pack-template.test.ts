import { describe, expect, it } from "vitest";

import {
  MARKET_PACK_TEMPLATE_REQUIRED_ENV,
  createSyntheticFutureMarketPackTemplate,
  validateMarketPackTemplate,
} from "@/lib/market-pack-template";

describe("market pack template", () => {
  it("defines a valid synthetic future market pack", () => {
    const template = createSyntheticFutureMarketPackTemplate();

    expect(validateMarketPackTemplate(template)).toEqual([]);
    expect(template.tenantId).not.toBe("uga-ua");
    expect(template.tenantId).not.toBe("spike-ua");
    expect(template.deployment.requiredEnv).toEqual(
      expect.arrayContaining([...MARKET_PACK_TEMPLATE_REQUIRED_ENV]),
    );
  });

  it("rejects missing mandatory deployment and seed fields", () => {
    const template = {
      ...createSyntheticFutureMarketPackTemplate(),
      brand: {
        ...createSyntheticFutureMarketPackTemplate().brand,
        name: "",
        locales: [],
      },
      deployment: {
        requiredEnv: ["DATABASE_URL"],
        optionalEnv: [],
      },
      commodities: [],
    };

    expect(validateMarketPackTemplate(template)).toEqual(
      expect.arrayContaining([
        "brand.name is required",
        "brand.locales is required",
        "commodities is required",
        "deployment.requiredEnv missing CRON_SECRET",
      ]),
    );
  });
});
