import { describe, expect, it } from "vitest";
import { BASKET_SOURCES } from "@/lib/basket/products";
import { buildBasketPublishCandidates, ensureBasketStorage } from "@/lib/basket/storage";

describe("Basket storage helpers", () => {
  it("does not require database storage in fixture fallback mode", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(await ensureBasketStorage()).toBe(false);
    } finally {
      if (original) process.env.DATABASE_URL = original;
    }
  });

  it("marks verified Big Mac and FRED data for auto-publish only", () => {
    const candidates = buildBasketPublishCandidates({
      bigMac: [
        {
          baselineUsd: 5,
          confidence: "verified",
          date: "2026-01-01",
          market: "UA",
          product: "bigmac",
          source: BASKET_SOURCES.economistBigMac,
          status: "published",
          valueUsd: 4,
        },
      ],
      fred: [{ key: "usdBroad", observations: [{ date: "2026-01-01", value: 100 }] }],
    });

    expect(candidates.filter((item) => item.publishStatus === "auto_publish")).toHaveLength(2);
    expect(candidates.find((item) => item.productId === "latte")).toMatchObject({
      confidence: "monitored",
      publishStatus: "review_required",
    });
    expect(candidates.find((item) => item.productId === "iphone")).toMatchObject({
      confidence: "seed",
      publishStatus: "review_required",
    });
  });
});
