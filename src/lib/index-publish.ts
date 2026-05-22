export function computePublishedChange(
  currentValue: number,
  previousValue: number | null,
) {
  if (previousValue === null || previousValue <= 0) {
    return { changeAbs: null, changePct: null };
  }

  const changeAbs = roundToOneDecimal(currentValue - previousValue);
  const changePct = roundToTwoDecimals((changeAbs / previousValue) * 100);

  return { changeAbs, changePct };
}

export function computeBenchmarkBlend(
  calculatedValue: number,
  benchmarkValue: number | null,
  enabled: boolean,
) {
  if (!enabled || benchmarkValue === null) {
    return {
      benchmarkBlendEnabled: false,
      benchmarkValue: null,
      finalValue: roundToOneDecimal(calculatedValue),
      method: null,
    };
  }

  return {
    benchmarkBlendEnabled: true,
    benchmarkValue: roundToOneDecimal(benchmarkValue),
    finalValue: roundToOneDecimal((calculatedValue + benchmarkValue) / 2),
    method: "average_with_benchmark" as const,
  };
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
