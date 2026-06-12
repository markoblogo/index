import { describe, expect, it } from "vitest";
import { getEverydaySourceRegistry } from "@/lib/everyday-index/adapters";
import { resolveConsumerCountry, rebaseSeriesTo100 } from "@/lib/everyday-index/dashboard";
import { validateConsumerObservation } from "@/lib/everyday-index/validation";

describe("resolveConsumerCountry", () => {
  it("uses an explicitly requested supported country", () => {
    expect(resolveConsumerCountry("jp", null).iso2).toBe("JP");
  });

  it("falls back to a safe nearest covered country when possible", () => {
    expect(resolveConsumerCountry(null, "IE").iso2).toBe("GB");
  });

  it("falls back to USA when location is unknown", () => {
    expect(resolveConsumerCountry(null, null).iso2).toBe("US");
  });
});

describe("rebaseSeriesTo100", () => {
  it("rebases each point to the first point", () => {
    expect(
      rebaseSeriesTo100([
        { date: "2026-01-01", value: 5 },
        { date: "2026-02-01", value: 7.5 },
      ]),
    ).toEqual([
      { date: "2026-01-01", value: 100 },
      { date: "2026-02-01", value: 150 },
    ]);
  });
});

describe("validateConsumerObservation", () => {
  it("quarantines suspicious burger jumps above 30 percent", () => {
    const result = validateConsumerObservation({
      observation: {
        sourceId: "burger-economist-global",
        productKey: "burger",
        observedAt: "2026-06-12",
        price: 13,
        currency: "EUR",
        parserVersion: "test",
        confidence: "high",
        status: "verified",
      },
      source: {
        id: "burger-economist-global",
        key: "big-mac-economist",
        sourceUrl: "https://example.com",
        sourceType: "csv",
        parserKey: "test",
        expectedCurrency: "EUR",
        priority: 1,
        enabled: true,
        productKey: "burger",
      },
      productLock: {
        key: "burger",
        label: "Burger Index",
        variant: "Big Mac",
        rules: [],
      },
      previousPublishedPrice: 9,
    });

    expect(result.status).toBe("quarantined");
  });
});

describe("unsupported scaffold sources", () => {
  it("keeps latte, iPhone, workdays, WTI, Brent and Gold disabled or unsupported", () => {
    const registry = getEverydaySourceRegistry();

    expect(
      registry.filter((source) =>
        [
          "latte",
          "iphone_price",
          "iphone_workdays",
          "wti_oil",
          "brent_oil",
          "gold",
        ].includes(source.productKey),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productKey: "latte", enabled: false }),
        expect.objectContaining({ productKey: "iphone_price", enabled: false }),
        expect.objectContaining({ productKey: "iphone_workdays", enabled: false }),
        expect.objectContaining({ productKey: "wti_oil", enabled: false }),
        expect.objectContaining({ productKey: "brent_oil", enabled: false }),
        expect.objectContaining({ productKey: "gold", enabled: false }),
      ]),
    );
  });
});
