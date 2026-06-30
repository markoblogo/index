import { describe, expect, it } from "vitest";
import {
  buildLatestBigMacObservations,
  parseEconomistBigMacCsv,
} from "@/lib/basket-monitoring/adapters/economist-bigmac";

const fixture = `date,iso_a3,currency_code,name,local_price,dollar_ex,dollar_price,USD_raw,EUR_raw,GBP_raw,JPY_raw,CNY_raw,GDP_bigmac,adj_price,USD_adjusted,EUR_adjusted,GBP_adjusted,JPY_adjusted,CNY_adjusted
2026-01-01,USA,USD,United States,5.21,1,5.21,0,0,0,0,0,70000,5.21,0,0,0,0,0
2026-01-01,UKR,UAH,Ukraine,165,38,4.34210526315789,-0.16658,-0.2,-0.1,-0.1,-0.1,9000,4.3,-0.12,-0.2,-0.1,-0.1,-0.1
2026-01-01,FRA,EUR,France,5.4,0.9,6,0.15163,0.1,0.2,0.3,0.4,45000,5.8,0.08,0.1,0.2,0.3,0.4
2025-01-01,USA,USD,United States,4.99,1,4.99,0,0,0,0,0,68000,4.99,0,0,0,0,0`;

describe("Economist Big Mac adapter", () => {
  it("parses official Big Mac CSV columns", () => {
    const rows = parseEconomistBigMacCsv(fixture);

    expect(rows).toHaveLength(4);
    expect(rows[1]).toMatchObject({
      country: "Ukraine",
      currencyCode: "UAH",
      date: "2026-01-01",
      dollarPrice: 4.34210526315789,
      isoA3: "UKR",
      localPrice: 165,
    });
  });

  it("publishes latest US, UA and global observations using US baseline", () => {
    const observations = buildLatestBigMacObservations(parseEconomistBigMacCsv(fixture));

    expect(observations.map((item) => item.market)).toEqual(["GLOBAL", "US", "UA"]);
    expect(observations.every((item) => item.confidence === "verified")).toBe(true);
    expect(observations.every((item) => item.status === "published")).toBe(true);
    expect(observations.find((item) => item.market === "UA")).toMatchObject({
      baselineUsd: 5.21,
      currencyCode: "UAH",
      valueUsd: 4.34,
    });
    expect(observations.find((item) => item.market === "GLOBAL")?.valueUsd).toBe(5.18);
  });
});
