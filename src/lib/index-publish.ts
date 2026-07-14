export function computePublishedChange(
  currentValue: number,
  previousValue: number | null,
  options: { displayRounding?: "one_decimal" | "whole" } = {},
) {
  if (previousValue === null || previousValue <= 0) {
    return { changeAbs: null, changePct: null };
  }

  const displayRounding = options.displayRounding ?? "one_decimal";
  const displayedCurrent = roundPublishedValue(currentValue, displayRounding);
  const displayedPrevious = roundPublishedValue(previousValue, displayRounding);
  const changeAbs = displayedCurrent - displayedPrevious;
  const changePct = roundToTwoDecimals((changeAbs / displayedPrevious) * 100);

  return { changeAbs, changePct };
}

function roundPublishedValue(value: number, rounding: "one_decimal" | "whole") {
  return rounding === "whole" ? Math.round(value) : roundToOneDecimal(value);
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
