export const SCENARIO_FORECAST_DAYS = 30;
export const SCENARIO_HISTORY_DAYS = 30;
export const SCENARIO_LOOKBACK_YEARS = 3;
export const SCENARIO_MIN_COMPLETE_YEARS = 2;

export type ScenarioMarketReadInputPoint = {
  commodityId: string;
  date: string;
  value: number;
};

export type ScenarioMarketReadSeries = {
  actual: Array<{ date: string; value: number }>;
  forecast: Array<{ date: string; value: number }>;
  lookbackYears: number;
  seasonalRange: { lower: number; upper: number } | null;
};

export type ScenarioMarketReadSnapshot = {
  generatedAt: string;
  lookbackYears: number;
  seriesByCommodityId: Record<string, ScenarioMarketReadSeries>;
};

export function buildScenarioMarketReadSnapshot(
  points: ScenarioMarketReadInputPoint[],
): ScenarioMarketReadSnapshot {
  const seriesByCommodityId = Object.fromEntries(
    [...new Set(points.map((point) => point.commodityId))].map((commodityId) => {
      const series = points
        .filter((point) => point.commodityId === commodityId)
        .sort((first, second) => first.date.localeCompare(second.date));
      const latest = series.at(-1);

      if (!latest) {
        return [commodityId, { actual: [], forecast: [], lookbackYears: 0, seasonalRange: null }];
      }

      const latestDate = parseDate(latest.date);
      const priorYears = [...new Set(series.map((point) => parseDate(point.date).getUTCFullYear()))]
        .filter((year) => year < latestDate.getUTCFullYear())
        .sort((first, second) => second - first)
        .slice(0, SCENARIO_LOOKBACK_YEARS);
      const completePriorYears = priorYears.filter((year) => {
        const anchor = findPointForYearAndOffset(series, latestDate, year, 0);
        const forward = findPointForYearAndOffset(
          series,
          latestDate,
          year,
          SCENARIO_FORECAST_DAYS,
        );

        return Boolean(anchor && forward && anchor.value !== 0);
      });

      return [
        commodityId,
        {
          actual: series.slice(-SCENARIO_HISTORY_DAYS),
          forecast: buildSeasonalForecast(series, latest, completePriorYears),
          lookbackYears: completePriorYears.length,
          seasonalRange: buildSeasonalRange(series, latestDate, completePriorYears),
        },
      ];
    }),
  ) as Record<string, ScenarioMarketReadSeries>;

  return {
    generatedAt: new Date().toISOString(),
    lookbackYears: SCENARIO_LOOKBACK_YEARS,
    seriesByCommodityId,
  };
}

function buildSeasonalForecast(
  series: ScenarioMarketReadInputPoint[],
  latest: ScenarioMarketReadInputPoint,
  priorYears: number[],
) {
  if (priorYears.length === 0) {
    return [];
  }

  const latestDate = parseDate(latest.date);

  return Array.from({ length: SCENARIO_FORECAST_DAYS }, (_, index) => {
    const offset = index + 1;
    const moves = priorYears.flatMap((year) => {
      const anchor = findPointForYearAndOffset(series, latestDate, year, 0);
      const forward = findPointForYearAndOffset(series, latestDate, year, offset);

      return anchor && forward && anchor.value !== 0
        ? [(forward.value - anchor.value) / anchor.value]
        : [];
    });
    const averageMove = moves.length
      ? moves.reduce((sum, move) => sum + move, 0) / moves.length
      : 0;
    const date = new Date(latestDate);
    date.setUTCDate(date.getUTCDate() + offset);

    return {
      date: date.toISOString().slice(0, 10),
      value: roundOne(latest.value * (1 + averageMove)),
    };
  });
}

function buildSeasonalRange(
  series: ScenarioMarketReadInputPoint[],
  latestDate: Date,
  priorYears: number[],
) {
  const values = priorYears.flatMap((year) => {
    const point = findPointForYearAndOffset(series, latestDate, year, 0);
    return point ? [point.value] : [];
  });

  return values.length >= SCENARIO_MIN_COMPLETE_YEARS
    ? { lower: Math.min(...values), upper: Math.max(...values) }
    : null;
}

function findPointForYearAndOffset(
  series: ScenarioMarketReadInputPoint[],
  latestDate: Date,
  year: number,
  offset: number,
) {
  const target = new Date(Date.UTC(
    year,
    latestDate.getUTCMonth(),
    latestDate.getUTCDate() + offset,
  ));
  const targetTime = target.getTime();

  return series
    .filter((point) => parseDate(point.date).getUTCFullYear() === year)
    .map((point) => ({ point, distance: Math.abs(parseDate(point.date).getTime() - targetTime) }))
    .filter((candidate) => candidate.distance <= 4 * 24 * 60 * 60 * 1000)
    .sort((first, second) => first.distance - second.distance)[0]?.point;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
