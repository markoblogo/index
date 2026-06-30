import { describe, expect, it } from "vitest";
import {
  calculateComposite,
  calculateCorrelation,
  calculateIndexVsBaseline,
  rebaseSeriesTo100,
  toUsdPrice,
} from "@/lib/basket/formulas";
import { getBasketCompare, getBasketLatest, normalizeBasketMarket } from "@/lib/basket/data";

describe("Basket formulas", () => {
  it("converts local prices to USD", () => {
    expect(toUsdPrice(430, 41)).toBe(10.49);
  });

  it("calculates index vs US baseline", () => {
    expect(calculateIndexVsBaseline(6.12, 5.21)).toBe(17.47);
    expect(calculateIndexVsBaseline(null, 5.21)).toBeNull();
  });

  it("rebases series to 100", () => {
    expect(
      rebaseSeriesTo100([
        { date: "2026-01-01", value: 20 },
        { date: "2026-02-01", value: 24 },
      ]),
    ).toEqual([
      { date: "2026-01-01", value: 100 },
      { date: "2026-02-01", value: 120 },
    ]);
  });

  it("excludes unavailable components from composite coverage", () => {
    const latest = getBasketLatest("UA");

    expect(latest.composite.coverage).toEqual({
      available: 2,
      total: 3,
      label: "2 / 3 components",
    });
    expect(latest.products.find((item) => item.product === "latte")?.status).toBe("unavailable");
  });

  it("calculates correlation", () => {
    expect(calculateCorrelation([1, 2, 3], [2, 4, 6])).toBe(1);
    expect(calculateCorrelation([1, 1, 1], [2, 4, 6])).toBeNull();
  });

  it("normalizes unknown markets to global", () => {
    expect(normalizeBasketMarket("ua")).toBe("UA");
    expect(normalizeBasketMarket("missing")).toBe("GLOBAL");
  });

  it("returns API-ready source, confidence and coverage data", () => {
    const latest = getBasketLatest("GLOBAL");
    const first = latest.products[0];

    expect(first.source.kind).toBe("price_dataset");
    expect(first.confidence).toBe("verified");
    expect(latest.composite.coverage.label).toBe("3 / 3 components");
  });

  it("adds SPIKE overlays only for Ukraine comparisons", () => {
    expect(getBasketCompare("GLOBAL").series.some((series) => series.id.startsWith("spike-"))).toBe(false);
    expect(getBasketCompare("UA").series.some((series) => series.id === "spike-corn")).toBe(true);
  });
});

describe("Basket composite helper", () => {
  it("returns null when no components are available", () => {
    expect(calculateComposite([])).toEqual({
      value: null,
      coverage: {
        available: 0,
        total: 0,
        label: "0 / 0 components",
      },
    });
  });
});
