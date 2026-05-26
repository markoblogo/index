export type SparklinePoint = {
  date: string;
  value: number;
};

export function buildRealSparkline(
  history: SparklinePoint[],
  fallbackValue: number | null,
  livePoint?: SparklinePoint,
) {
  const byDate = new Map<string, number>();

  for (const point of history) {
    if (Number.isFinite(point.value)) {
      byDate.set(point.date, roundToOneDecimal(point.value));
    }
  }

  if (livePoint && Number.isFinite(livePoint.value)) {
    byDate.set(livePoint.date, roundToOneDecimal(livePoint.value));
  }

  const values = [...byDate.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .map(([, value]) => value);

  if (values.length >= 2) {
    return values.slice(-14);
  }

  const flatValue = values[0] ?? fallbackValue ?? 0;

  return [flatValue, flatValue];
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
