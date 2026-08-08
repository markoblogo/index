export type PublicSubmissionFallback = {
  date: string;
  previousValue: number | null;
  rawCount: number;
  updatedAt: Date;
  value: number;
};

export function resolvePublicDisplayFallback({
  publishedIndexDate,
  submissionFallback,
  tenantId,
}: {
  publishedIndexDate: string | null;
  submissionFallback: PublicSubmissionFallback | null | undefined;
  tenantId: string;
}) {
  if (!submissionFallback) {
    return null;
  }

  if (tenantId === "spike-ua" && publishedIndexDate) {
    return null;
  }

  if (!publishedIndexDate || submissionFallback.date > publishedIndexDate) {
    return submissionFallback;
  }

  return null;
}
