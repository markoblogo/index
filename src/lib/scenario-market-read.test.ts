import { describe, expect, it } from "vitest";
import { buildScenarioMarketReadSnapshot } from "./scenario-market-read";

describe("buildScenarioMarketReadSnapshot", () => {
  it("uses only complete comparable historical years for a seasonal range and forecast", () => {
    const snapshot = buildScenarioMarketReadSnapshot([
      { commodityId: "corn", date: "2024-07-10", value: 190 },
      { commodityId: "corn", date: "2024-08-09", value: 200 },
      { commodityId: "corn", date: "2025-07-09", value: 200 },
      { commodityId: "corn", date: "2025-08-09", value: 220 },
      { commodityId: "corn", date: "2026-07-10", value: 212 },
    ]);

    expect(snapshot.seriesByCommodityId.corn).toMatchObject({
      lookbackYears: 2,
      seasonalRange: { lower: 190, upper: 200 },
    });
    expect(snapshot.seriesByCommodityId.corn.forecast).toHaveLength(30);
  });

  it("uses one complete prior year as a labelled seasonal reference without fabricating a range", () => {
    const snapshot = buildScenarioMarketReadSnapshot([
      { commodityId: "corn", date: "2024-07-10", value: 190 },
      { commodityId: "corn", date: "2024-08-09", value: 200 },
      { commodityId: "corn", date: "2025-07-10", value: 200 },
      { commodityId: "corn", date: "2026-07-10", value: 212 },
    ]);

    expect(snapshot.seriesByCommodityId.corn).toMatchObject({
      lookbackYears: 1,
      seasonalRange: null,
    });
    expect(snapshot.seriesByCommodityId.corn.forecast).toHaveLength(30);
  });
});
