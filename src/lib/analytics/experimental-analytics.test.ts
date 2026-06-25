import { describe, expect, it } from "vitest";
import {
  buildDataQualitySummary,
  buildMarketPulseRows,
  buildSeasonalitySeries,
  buildSpreadLeaderboard,
  computeRangeStats,
  getConfidenceLevel,
  getLookbackChange,
  normalizeHistory,
  realizedVolatility,
  type IndexHistoryPoint,
} from "@/lib/analytics/experimental-analytics";

const instruments = [
  { id: "corn", label: "Кукурудза" },
  { id: "feed-wheat", label: "Фураж" },
];

function point(
  commodityId: string,
  date: string,
  value: number,
  respondents = 12,
): IndexHistoryPoint {
  return { commodityId, date, respondents, value };
}

function dateFrom(start: string, offset: number) {
  const date = new Date(`${start}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

describe("experimental analytics calculations", () => {
  it("normalizes duplicate commodity/date rows by average value", () => {
    const rows = normalizeHistory([
      point("corn", "2026-01-02", 120),
      point("corn", "2026-01-02", 124),
      point("corn", "2026-01-01", 100),
    ]);

    expect(rows).toEqual([
      point("corn", "2026-01-01", 100),
      point("corn", "2026-01-02", 122),
    ]);
  });

  it("uses closest available historical point for lookback changes", () => {
    const series = [
      point("corn", "2026-01-01", 100),
      point("corn", "2026-01-05", 110),
      point("corn", "2026-01-10", 130),
    ];

    expect(getLookbackChange(series, "2026-01-10", 7)).toEqual({
      abs: 30,
      pct: 30,
    });
  });

  it("computes range stats and percentile", () => {
    const stats = computeRangeStats(
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      60,
    );

    expect(stats).toMatchObject({
      current: 60,
      distanceFromMedian: 5,
      max: 100,
      median: 55,
      min: 10,
      p25: 32.5,
      p75: 77.5,
      percentile: 60,
    });
  });

  it("computes realized volatility from daily returns", () => {
    const volatility = realizedVolatility([
      point("corn", "2026-01-01", 100),
      point("corn", "2026-01-02", 103),
      point("corn", "2026-01-03", 99),
      point("corn", "2026-01-04", 104),
    ]);

    expect(volatility).toBeGreaterThan(50);
  });

  it("builds indexed seasonality where each year starts at 100", () => {
    const seasonality = buildSeasonalitySeries(
      [
        point("corn", "2025-01-01", 200),
        point("corn", "2025-01-02", 220),
        point("corn", "2026-01-01", 100),
        point("corn", "2026-01-02", 120),
      ],
      "indexed",
    );

    expect(seasonality.yearSeries[0].points[0].value).toBe(100);
    expect(seasonality.yearSeries[1].points[0].value).toBe(100);
    expect(seasonality.averageSeries[0].value).toBe(100);
  });

  it("ranks spreads with z-score and movement state", () => {
    const rows = buildSpreadLeaderboard(
      Array.from({ length: 40 }, (_, index) => {
        const date = dateFrom("2026-02-01", index);
        return [
          point("corn", date, 210 + index),
          point("feed-wheat", date, 200 + index * 0.5),
        ];
      }).flat(),
      [
        {
          a: "corn",
          b: "feed-wheat",
          id: "corn-feed",
          label: "Кукурудза / фураж",
        },
      ],
    );

    expect(rows[0]).toMatchObject({
      current: 29.5,
      label: "Кукурудза / фураж",
      status: "розширюється",
    });
    expect(rows[0].zScore).toBeGreaterThan(1);
  });

  it("builds market pulse and data quality confidence rows", () => {
    const history = Array.from({ length: 35 }, (_, index) =>
      point("corn", dateFrom("2026-03-01", index), 200 + index),
    );
    const pulseRows = buildMarketPulseRows(history, instruments);
    const quality = buildDataQualitySummary(history, instruments);

    expect(pulseRows[0]).toMatchObject({
      confidence: "high",
      positionId: "corn",
    });
    expect(quality.rows.find((row) => row.positionId === "feed-wheat")?.confidence).toBe(
      "unavailable",
    );
  });

  it("downgrades confidence when critical alerts or weak respondent coverage exist", () => {
    expect(
      getConfidenceLevel({
        alerts: [{ level: "critical", message: "bad" }],
        observationCount: 50,
        respondents: 12,
        valueExists: true,
      }),
    ).toBe("low");
    expect(
      getConfidenceLevel({
        alerts: [],
        observationCount: 50,
        respondents: 3,
        valueExists: true,
      }),
    ).toBe("low");
  });
});
