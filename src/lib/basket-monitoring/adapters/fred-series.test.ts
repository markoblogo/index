import { describe, expect, it } from "vitest";
import { parseFredCsv } from "@/lib/basket-monitoring/adapters/fred-series";

describe("FRED series adapter", () => {
  it("parses FRED CSV observations and skips missing values", () => {
    const rows = parseFredCsv(
      `observation_date,DTWEXBGS
2026-01-01,101.5
2026-01-02,.
2026-01-03,102.25`,
      "DTWEXBGS",
      "fred-usd-broad",
    );

    expect(rows).toEqual([
      {
        confidence: "verified",
        date: "2026-01-01",
        seriesId: "DTWEXBGS",
        sourceId: "fred-usd-broad",
        value: 101.5,
      },
      {
        confidence: "verified",
        date: "2026-01-03",
        seriesId: "DTWEXBGS",
        sourceId: "fred-usd-broad",
        value: 102.25,
      },
    ]);
  });
});
