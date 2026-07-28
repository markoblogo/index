import { describe, expect, it } from "vitest";
import { INDEX_CONFIGS } from "@/lib/index-platform";
import { resolveCommodityConfig } from "@/lib/respondent-prices";

const spikeCommodities = INDEX_CONFIGS["spike-ua"].commodities;

describe("resolveCommodityConfig", () => {
  it("prefers exact rapeseed export codes over broad processing aliases", () => {
    expect(
      resolveCommodityConfig("RAPESEED_NON_GMO_EXPORT", spikeCommodities)?.dbCode,
    ).toBe("RAPESEED_NON_GMO_EXPORT");
    expect(
      resolveCommodityConfig("RAPESEED_NON_GMO_FCA_CHOP", spikeCommodities)?.dbCode,
    ).toBe("RAPESEED_NON_GMO_FCA_CHOP");
  });
});
