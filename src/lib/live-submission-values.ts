export type LiveSubmissionInput = {
  commodityId: string;
  deliveryBasisId: string;
  price: number;
  respondentId: string;
  source: "admin" | "respondent" | "spike";
  status: string;
  updatedAt: Date;
};

export type LiveSubmissionValue = {
  latestUpdatedAt: Date;
  respondentCount: number;
  value: number;
};

export function buildLiveSubmissionValues({
  basisByCommodityId,
  submissions,
}: {
  basisByCommodityId: Map<string, string>;
  submissions: LiveSubmissionInput[];
}) {
  const selectedByCommodityAndRespondent = new Map<string, LiveSubmissionInput>();

  for (const submission of submissions) {
    const basisId = basisByCommodityId.get(submission.commodityId);

    if (
      !basisId ||
      submission.deliveryBasisId !== basisId ||
      submission.status === "draft" ||
      submission.source === "spike" ||
      !Number.isFinite(submission.price) ||
      submission.price <= 0
    ) {
      continue;
    }

    const key = `${submission.commodityId}:${submission.respondentId}`;
    const current = selectedByCommodityAndRespondent.get(key);

    if (!current || shouldReplaceSubmission(current, submission)) {
      selectedByCommodityAndRespondent.set(key, submission);
    }
  }

  const byCommodity = new Map<string, LiveSubmissionInput[]>();

  for (const submission of selectedByCommodityAndRespondent.values()) {
    const current = byCommodity.get(submission.commodityId) ?? [];
    current.push(submission);
    byCommodity.set(submission.commodityId, current);
  }

  return new Map(
    [...byCommodity.entries()].map(([commodityId, commoditySubmissions]) => {
      const value = roundToOneDecimal(
        commoditySubmissions.reduce((sum, submission) => sum + submission.price, 0) /
          commoditySubmissions.length,
      );
      const latestUpdatedAt = commoditySubmissions
        .map((submission) => submission.updatedAt)
        .sort((first, second) => second.getTime() - first.getTime())[0];

      return [
        commodityId,
        {
          latestUpdatedAt,
          respondentCount: commoditySubmissions.length,
          value,
        },
      ] as const;
    }),
  );
}

function shouldReplaceSubmission(
  current: LiveSubmissionInput,
  candidate: LiveSubmissionInput,
) {
  if (current.source !== candidate.source) {
    return candidate.source === "admin";
  }

  return candidate.updatedAt > current.updatedAt;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
