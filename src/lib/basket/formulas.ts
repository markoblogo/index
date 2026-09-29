import type { BasketCoverage, BasketLatestItem, BasketObservation, BasketSeriesPoint } from "@/lib/basket/types";

export function toUsdPrice(localPrice: number, usdFxRate: number) {
  if (usdFxRate <= 0) throw new Error("FX rate must be positive");
  return roundMoney(localPrice / usdFxRate);
}

export function calculateIndexVsBaseline(valueUsd: number | null, baselineUsd: number) {
  if (valueUsd === null || baselineUsd <= 0) return null;
  return roundPercent(((valueUsd - baselineUsd) / baselineUsd) * 100);
}

export function calculateComposite(items: BasketLatestItem[]) {
  const values = items
    .map((item) => item.indexVsBaseline)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const coverage = getCoverage(values.length, items.length);

  return {
    value: values.length > 0 ? roundPercent(values.reduce((sum, value) => sum + value, 0) / values.length) : null,
    coverage,
  };
}

export function getCoverage(available: number, total: number): BasketCoverage {
  return {
    available,
    total,
    label: `${available} / ${total} components`,
  };
}

export function enrichObservation(
  observation: BasketObservation,
  options: { changeYoY: number | null; sparkline: number[] },
): BasketLatestItem {
  return {
    ...observation,
    changeYoY: options.changeYoY,
    indexVsBaseline: calculateIndexVsBaseline(observation.valueUsd, observation.baselineUsd),
    sparkline: options.sparkline,
  };
}

export function rebaseSeriesTo100(points: Array<{ date: string; value: number }>) {
  const first = points.find((point) => Number.isFinite(point.value) && point.value > 0);

  if (!first) return [];

  return points.map((point) => ({
    date: point.date,
    value: roundPercent((point.value / first.value) * 100),
  }));
}

export function calculateCorrelation(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (length < 2) return null;

  const left = a.slice(-length);
  const right = b.slice(-length);
  const avgLeft = average(left);
  const avgRight = average(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - avgLeft) * (right[index] - avgRight), 0);
  const leftVariance = left.reduce((sum, value) => sum + (value - avgLeft) ** 2, 0);
  const rightVariance = right.reduce((sum, value) => sum + (value - avgRight) ** 2, 0);
  const denominator = Math.sqrt(leftVariance * rightVariance);

  return denominator === 0 ? null : Number((numerator / denominator).toFixed(2));
}

export function alignSeriesByDate(series: BasketSeriesPoint[]) {
  const grouped = new Map<string, Record<string, number>>();

  for (const point of series) {
    grouped.set(point.date, {
      ...(grouped.get(point.date) ?? {}),
      [point.seriesId]: point.value,
    });
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, values }));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundPercent(value: number) {
  return Number(value.toFixed(2));
}
