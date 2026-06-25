export type IndexHistoryPoint = {
  commodityId: string;
  commodityName?: string;
  date: string;
  respondents?: number;
  value: number;
};

export type IndexInstrument = {
  id: string;
  label: string;
};

export type AnalyticsLookbackChange = {
  abs: number | null;
  pct: number | null;
};

export type PercentileRangeStats = {
  current: number;
  distanceFromMedian: number;
  max: number;
  median: number;
  min: number;
  p25: number;
  p75: number;
  percentile: number;
};

export type SeasonalitySeries = {
  label: string;
  points: Array<{ dayOfYear: number; value: number }>;
  year: number;
};

export type SpreadDefinition = {
  a: string;
  b: string;
  id: string;
  label: string;
};

export type SpreadAnalytics = {
  change7d: number | null;
  change30d: number | null;
  current: number;
  label: string;
  percentile: number | null;
  status: "розширюється" | "звужується" | "стабільний";
  zScore: number | null;
};

export type DataQualityAlert = {
  level: "critical" | "warning";
  message: string;
  positionId?: string;
};

export type ConfidenceLevel = "high" | "medium" | "low" | "unavailable";

export type PulseRow = {
  change1d: AnalyticsLookbackChange;
  change7d: AnalyticsLookbackChange;
  change30d: AnalyticsLookbackChange;
  change90d: AnalyticsLookbackChange;
  confidence: ConfidenceLevel;
  latestDate: string;
  percentile: number | null;
  positionId: string;
  positionLabel: string;
  respondents: number | null;
  value: number;
  volatility30d: number | null;
};

export const DATA_QUALITY_THRESHOLDS = {
  criticalObservationCount: 5,
  dailyPctChangeWarning: 50,
  latestStaleDays: 7,
  monthlyPctChangeWarning: 200,
  realizedVolCritical: 300,
} as const;

const DAY_MS = 86_400_000;

export function normalizeHistory(points: IndexHistoryPoint[]) {
  const byKey = new Map<string, IndexHistoryPoint[]>();

  for (const point of points) {
    if (!Number.isFinite(point.value)) {
      continue;
    }

    const key = `${point.commodityId}:${point.date}`;
    byKey.set(key, [...(byKey.get(key) ?? []), point]);
  }

  return [...byKey.entries()]
    .map(([key, rows]) => {
      const [commodityId, date] = key.split(":");
      const value = average(rows.map((row) => row.value));
      const respondents = Math.max(...rows.map((row) => row.respondents ?? 0));

      return {
        commodityId,
        commodityName: rows[0]?.commodityName,
        date,
        respondents: respondents > 0 ? respondents : undefined,
        value: round(value, 2),
      } satisfies IndexHistoryPoint;
    })
    .sort((first, second) =>
      first.date === second.date
        ? first.commodityId.localeCompare(second.commodityId)
        : first.date.localeCompare(second.date),
    );
}

export function buildMarketPulseRows(
  points: IndexHistoryPoint[],
  instruments: IndexInstrument[],
) {
  const byCommodity = groupByCommodity(points);

  return instruments
    .flatMap((instrument): PulseRow[] => {
      const series = byCommodity.get(instrument.id) ?? [];
      const latest = series.at(-1);

      if (!latest) {
        return [];
      }

      const changes = {
        change1d: getLookbackChange(series, latest.date, 1),
        change7d: getLookbackChange(series, latest.date, 7),
        change30d: getLookbackChange(series, latest.date, 30),
        change90d: getLookbackChange(series, latest.date, 90),
      };
      const stats = computeRangeStats(series.map((point) => point.value), latest.value);
      const volatility30d = realizedVolatility(series.slice(-31));
      const alerts = buildPositionAlerts(series, latest.date);

      return [
        {
          ...changes,
          confidence: getConfidenceLevel({
            alerts,
            observationCount: series.length,
            respondents: latest.respondents ?? null,
            valueExists: true,
          }),
          latestDate: latest.date,
          percentile: stats?.percentile ?? null,
          positionId: instrument.id,
          positionLabel: instrument.label,
          respondents: latest.respondents ?? null,
          value: latest.value,
          volatility30d,
        },
      ];
    })
    .sort(
      (first, second) =>
        Math.abs(second.change7d.abs ?? 0) - Math.abs(first.change7d.abs ?? 0),
    );
}

export function getLookbackChange(
  series: IndexHistoryPoint[],
  latestDate: string,
  lookbackDays: number,
): AnalyticsLookbackChange {
  const latest = getClosestAtOrBefore(series, latestDate);
  const target = shiftDate(latestDate, -lookbackDays);
  const previous = getClosestAtOrBefore(series, target);

  if (!latest || !previous || previous.value === 0) {
    return { abs: null, pct: null };
  }

  const abs = round(latest.value - previous.value, 2);
  return { abs, pct: round((abs / previous.value) * 100, 2) };
}

export function computeRangeStats(
  values: number[],
  current: number,
): PercentileRangeStats | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);

  if (sorted.length < 10) {
    return null;
  }

  const median = quantile(sorted, 0.5);

  return {
    current,
    distanceFromMedian: round(current - median, 2),
    max: sorted.at(-1) ?? current,
    median,
    min: sorted[0] ?? current,
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    percentile: percentileRank(sorted, current),
  };
}

export function computeRangeForWindow(
  series: IndexHistoryPoint[],
  window: 90 | 180 | 365 | "all",
) {
  const latest = series.at(-1);

  if (!latest) {
    return null;
  }

  const scoped = window === "all" ? series : getWindow(series, latest.date, window);
  return computeRangeStats(
    scoped.map((point) => point.value),
    latest.value,
  );
}

export function realizedVolatility(series: IndexHistoryPoint[]) {
  if (series.length < 3) {
    return null;
  }

  const returns = series.slice(1).flatMap((point, index) => {
    const previous = series[index];
    return previous && previous.value > 0
      ? [(point.value - previous.value) / previous.value]
      : [];
  });

  if (returns.length < 2) {
    return null;
  }

  return round(standardDeviation(returns) * Math.sqrt(252) * 100, 2);
}

export function buildSeasonalitySeries(
  series: IndexHistoryPoint[],
  mode: "absolute" | "indexed",
) {
  const byYear = new Map<number, IndexHistoryPoint[]>();

  for (const point of series) {
    const year = Number(point.date.slice(0, 4));
    byYear.set(year, [...(byYear.get(year) ?? []), point]);
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);
  const yearSeries = years.map((year) => {
    const rows = byYear.get(year) ?? [];
    const base = rows[0]?.value || 1;

    return {
      label: String(year),
      points: rows.map((point) => ({
        dayOfYear: dayOfYear(point.date),
        value: mode === "indexed" ? round((point.value / base) * 100, 2) : point.value,
      })),
      year,
    } satisfies SeasonalitySeries;
  });
  const averageSeries = buildAverageSeasonality(yearSeries);

  return { averageSeries, yearSeries };
}

export function buildSpreadSeries(
  points: IndexHistoryPoint[],
  spread: SpreadDefinition,
) {
  const dates = [...new Set(points.map((point) => point.date))].sort();
  const byCommodity = groupByCommodity(points);
  const first = byCommodity.get(spread.a) ?? [];
  const second = byCommodity.get(spread.b) ?? [];

  return dates.flatMap((date) => {
    const a = getClosestAtOrBefore(first, date);
    const b = getClosestAtOrBefore(second, date);

    if (!a || !b) {
      return [];
    }

    return [{ date, value: round(a.value - b.value, 2) }];
  });
}

export function buildSpreadLeaderboard(
  points: IndexHistoryPoint[],
  spreads: SpreadDefinition[],
): SpreadAnalytics[] {
  return spreads
    .flatMap((spread): SpreadAnalytics[] => {
      const series = buildSpreadSeries(points, spread);
      const latest = series.at(-1);

      if (!latest) {
        return [];
      }

      const values = series.map((point) => point.value);
      const sd = standardDeviation(values);
      const mean = average(values);
      const change7d = getSpreadLookback(series, latest.date, 7);
      const change30d = getSpreadLookback(series, latest.date, 30);
      const percentile = values.length >= 20 ? percentileRank(values, latest.value) : null;

      return [
        {
          change7d,
          change30d,
          current: latest.value,
          label: spread.label,
          percentile,
          status:
            Math.abs(change7d ?? 0) < 1
              ? "стабільний"
              : (change7d ?? 0) > 0
                ? "розширюється"
                : "звужується",
          zScore: values.length >= 20 && sd > 0 ? round((latest.value - mean) / sd, 2) : null,
        },
      ];
    })
    .sort((first, second) => {
      const firstScore = Math.abs(first.zScore ?? first.change30d ?? 0);
      const secondScore = Math.abs(second.zScore ?? second.change30d ?? 0);
      return secondScore - firstScore;
    });
}

export function buildDataQualitySummary(
  points: IndexHistoryPoint[],
  instruments: IndexInstrument[],
) {
  const byCommodity = groupByCommodity(points);
  const latestDate = points.map((point) => point.date).sort().at(-1) ?? "";
  const rows = instruments.map((instrument) => {
    const series = byCommodity.get(instrument.id) ?? [];
    const latest = series.at(-1);
    const alerts = buildPositionAlerts(series, latestDate);

    return {
      alerts,
      confidence: getConfidenceLevel({
        alerts,
        observationCount: series.length,
        respondents: latest?.respondents ?? null,
        valueExists: Boolean(latest),
      }),
      latestDate: latest?.date ?? null,
      observationCount: series.length,
      positionId: instrument.id,
      positionLabel: instrument.label,
      respondents: latest?.respondents ?? null,
    };
  });

  return {
    alerts: rows.flatMap((row) => row.alerts),
    rows,
  };
}

export function buildPositionAlerts(
  series: IndexHistoryPoint[],
  latestDate: string,
): DataQualityAlert[] {
  const alerts: DataQualityAlert[] = [];

  if (series.length === 0) {
    return [{ level: "critical", message: "Відсутнє останнє значення" }];
  }

  const latest = series.at(-1)!;

  if (latest.value <= 0) {
    alerts.push({ level: "critical", message: "Нульова або відʼємна ціна" });
  }

  if (daysBetween(latest.date, latestDate) > DATA_QUALITY_THRESHOLDS.latestStaleDays) {
    alerts.push({ level: "warning", message: "Довгий розрив від останнього оновлення" });
  }

  if (series.length < DATA_QUALITY_THRESHOLDS.criticalObservationCount) {
    alerts.push({ level: "critical", message: "Мало спостережень для розрахунку" });
  }

  const seen = new Set<string>();
  for (const point of series) {
    if (seen.has(point.date)) {
      alerts.push({ level: "warning", message: "Дублікат дати в історії" });
      break;
    }
    seen.add(point.date);
  }

  const oneDay = getLookbackChange(series, latest.date, 1);
  if (Math.abs(oneDay.pct ?? 0) > DATA_QUALITY_THRESHOLDS.dailyPctChangeWarning) {
    alerts.push({ level: "critical", message: "Підозріло велика денна зміна" });
  }

  const thirtyDay = getLookbackChange(series, latest.date, 30);
  if (Math.abs(thirtyDay.pct ?? 0) > DATA_QUALITY_THRESHOLDS.monthlyPctChangeWarning) {
    alerts.push({ level: "warning", message: "Підозріло велика 30Д зміна" });
  }

  const vol = realizedVolatility(series.slice(-31));
  if ((vol ?? 0) > DATA_QUALITY_THRESHOLDS.realizedVolCritical) {
    alerts.push({ level: "critical", message: "Нереалістична волатильність" });
  }

  return alerts;
}

export function getConfidenceLevel({
  alerts,
  observationCount,
  respondents,
  valueExists,
}: {
  alerts: DataQualityAlert[];
  observationCount: number;
  respondents: number | null;
  valueExists: boolean;
}): ConfidenceLevel {
  if (!valueExists) {
    return "unavailable";
  }

  const hasCritical = alerts.some((alert) => alert.level === "critical");

  if (hasCritical || observationCount < 10 || (respondents !== null && respondents < 5)) {
    return "low";
  }

  if (observationCount >= 30 && (respondents === null || respondents >= 10) && alerts.length === 0) {
    return "high";
  }

  return "medium";
}

export function percentileRank(values: number[], current: number) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  return round((sorted.filter((value) => value <= current).length / sorted.length) * 100, 2);
}

export function quantile(sortedValues: number[], q: number) {
  if (sortedValues.length === 0) return 0;
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return round((sortedValues[base] ?? 0) + rest * ((sortedValues[base + 1] ?? sortedValues[base] ?? 0) - (sortedValues[base] ?? 0)), 2);
}

function buildAverageSeasonality(series: SeasonalitySeries[]) {
  const byDay = new Map<number, number[]>();
  for (const row of series) {
    for (const point of row.points) {
      byDay.set(point.dayOfYear, [...(byDay.get(point.dayOfYear) ?? []), point.value]);
    }
  }
  return [...byDay.entries()].sort((a,b)=>a[0]-b[0]).map(([dayOfYear, values]) => ({
    dayOfYear,
    value: round(average(values), 2),
  }));
}

function getSpreadLookback(series: Array<{ date: string; value: number }>, latestDate: string, days: number) {
  const latest = getClosestSpreadAtOrBefore(series, latestDate);
  const previous = getClosestSpreadAtOrBefore(series, shiftDate(latestDate, -days));
  return latest && previous ? round(latest.value - previous.value, 2) : null;
}

function getClosestSpreadAtOrBefore(series: Array<{ date: string; value: number }>, date: string) {
  return series.filter((point) => point.date <= date).at(-1) ?? null;
}

function getClosestAtOrBefore(series: IndexHistoryPoint[], date: string) {
  return series.filter((point) => point.date <= date).at(-1) ?? null;
}

function getWindow(series: IndexHistoryPoint[], latestDate: string, days: number) {
  const start = shiftDate(latestDate, -days);
  return series.filter((point) => point.date >= start && point.date <= latestDate);
}

function groupByCommodity(points: IndexHistoryPoint[]) {
  const normalized = normalizeHistory(points);
  const map = new Map<string, IndexHistoryPoint[]>();
  for (const point of normalized) {
    map.set(point.commodityId, [...(map.get(point.commodityId) ?? []), point]);
  }
  return map;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dayOfYear(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const start = Date.UTC(value.getUTCFullYear(), 0, 0);
  return Math.floor((value.getTime() - start) / DAY_MS);
}

function daysBetween(first: string, second: string) {
  return Math.abs((new Date(`${second}T00:00:00.000Z`).getTime() - new Date(`${first}T00:00:00.000Z`).getTime()) / DAY_MS);
}

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
