export type IndexCalculationStatus =
  | "publishable"
  | "insufficient_data"
  | "no_data";

export type PriceSubmission = {
  respondentId: string;
  price?: unknown;
};

export type ExcludedPrice = {
  respondentId: string;
  price: number;
  deviationPct: number;
};

export type CalculateIndexInput = {
  date: string;
  commodityId: string;
  deliveryBasisId: string;
  submissions: PriceSubmission[];
  basketWeight?: number;
};

export type IndexCalculationResult = {
  date: string;
  commodityId: string;
  deliveryBasisId: string;
  basketWeight: number;
  status: IndexCalculationStatus;
  median: number | null;
  value: number | null;
  rawValue: number | null;
  weightedRawValue: number | null;
  rawCount: number;
  usedCount: number;
  excluded: ExcludedPrice[];
};

type ValidSubmission = {
  respondentId: string;
  price: number;
};

const OUTLIER_THRESHOLD = 0.02;
const MINIMUM_PUBLISHABLE_COUNT = 5;
const DEFAULT_BASKET_WEIGHT = 1;

export function calculateIndexValue({
  date,
  commodityId,
  deliveryBasisId,
  submissions,
  basketWeight = DEFAULT_BASKET_WEIGHT,
}: CalculateIndexInput): IndexCalculationResult {
  const validSubmissions = submissions.filter(isValidSubmission);
  const rawCount = validSubmissions.length;

  if (rawCount === 0) {
    return {
      date,
      commodityId,
      deliveryBasisId,
      basketWeight,
      status: "no_data",
      median: null,
      value: null,
      rawValue: null,
      weightedRawValue: null,
      rawCount,
      usedCount: 0,
      excluded: [],
    };
  }

  const median = calculateMedian(validSubmissions.map(({ price }) => price));
  const shouldApplyOutlierFilter =
    validSubmissions.length >= MINIMUM_PUBLISHABLE_COUNT;
  const included: ValidSubmission[] = [];
  const excluded: ExcludedPrice[] = [];

  for (const submission of validSubmissions) {
    const deviationRatio = Math.abs(submission.price - median) / median;

    if (shouldApplyOutlierFilter && deviationRatio > OUTLIER_THRESHOLD) {
      excluded.push({
        respondentId: submission.respondentId,
        price: submission.price,
        deviationPct: deviationRatio * 100,
      });
      continue;
    }

    included.push(submission);
  }

  const rawValue =
    included.length > 0
      ? calculateAverage(included.map(({ price }) => price))
      : null;
  const weightedRawValue = rawValue === null ? null : rawValue * basketWeight;
  const value = weightedRawValue === null ? null : roundToOneDecimal(weightedRawValue);

  return {
    date,
    commodityId,
    deliveryBasisId,
    basketWeight,
    status:
      included.length >= MINIMUM_PUBLISHABLE_COUNT
        ? "publishable"
        : "insufficient_data",
    median,
    value,
    rawValue,
    weightedRawValue,
    rawCount,
    usedCount: included.length,
    excluded,
  };
}

function isValidSubmission(
  submission: PriceSubmission,
): submission is ValidSubmission {
  return (
    typeof submission.price === "number" &&
    Number.isFinite(submission.price) &&
    submission.price > 0
  );
}

function calculateMedian(values: number[]) {
  const sortedValues = [...values].sort((first, second) => first - second);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[midpoint];
  }

  return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
}

function calculateAverage(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
