import { db } from "@/lib/db";

type CommodityRef = {
  id: string;
};

type BasisRef = {
  id: string;
};

export type SubmissionFallback = {
  date: string;
  previousValue: number | null;
  rawCount: number;
  updatedAt: Date;
  value: number;
};

export async function getLatestSubmissionFallbacks({
  basisByCommodityId,
  commodities,
  visibleTradeDate,
}: {
  basisByCommodityId: Map<string, BasisRef>;
  commodities: CommodityRef[];
  visibleTradeDate: Date;
}) {
  const commodityIds = commodities.map((commodity) => commodity.id);
  const basisIds = [...new Set([...basisByCommodityId.values()].map((basis) => basis.id))];

  if (commodityIds.length === 0 || basisIds.length === 0) {
    return new Map<string, SubmissionFallback>();
  }

  const submissions = await db.priceSubmission.findMany({
    orderBy: [{ tradeDate: "desc" }, { updatedAt: "desc" }],
    take: 5000,
    where: {
      commodityId: { in: commodityIds },
      deliveryBasisId: { in: basisIds },
      priceUsdPerMt: { gt: 0 },
      source: { in: ["admin", "respondent"] },
      status: { in: ["draft", "submitted", "verified", "published"] },
      tradeDate: { lte: visibleTradeDate },
    },
  });
  const submissionsByCommodity = new Map<string, typeof submissions>();

  for (const submission of submissions) {
    const current = submissionsByCommodity.get(submission.commodityId) ?? [];
    current.push(submission);
    submissionsByCommodity.set(submission.commodityId, current);
  }

  const fallbackByCommodityId = new Map<string, SubmissionFallback>();

  for (const [commodityId, commoditySubmissions] of submissionsByCommodity) {
    const preferredBasisId = basisByCommodityId.get(commodityId)?.id;
    const latestTradeDate = commoditySubmissions[0]?.tradeDate;

    if (!latestTradeDate) {
      continue;
    }

    const latestTradeDateIso = latestTradeDate.toISOString().slice(0, 10);
    const selectedSubmissions = selectSubmissionsForDate(
      commoditySubmissions,
      latestTradeDateIso,
      preferredBasisId,
    );

    if (selectedSubmissions.length === 0) {
      continue;
    }

    const latestUpdatedAt =
      selectedSubmissions
        .map((submission) => submission.updatedAt)
        .sort((first, second) => second.getTime() - first.getTime())[0] ?? new Date();
    const value = averageSubmissions(selectedSubmissions);
    const previousValue = getPreviousSubmissionValue({
      commoditySubmissions,
      currentDate: latestTradeDateIso,
      preferredBasisId,
    });

    fallbackByCommodityId.set(commodityId, {
      date: latestTradeDateIso,
      previousValue,
      rawCount: selectedSubmissions.length,
      updatedAt: latestUpdatedAt,
      value,
    });
  }

  return fallbackByCommodityId;
}

function selectSubmissionsForDate<
  T extends {
    deliveryBasisId: string;
    respondentId: string;
    source: string;
    tradeDate: Date;
    updatedAt: Date;
  },
>(submissions: T[], date: string, preferredBasisId: string | undefined) {
  const sameDate = submissions.filter(
    (submission) => submission.tradeDate.toISOString().slice(0, 10) === date,
  );
  const preferredBasisSubmissions = sameDate.filter(
    (submission) => submission.deliveryBasisId === preferredBasisId,
  );
  const selectedScope =
    preferredBasisSubmissions.length > 0 ? preferredBasisSubmissions : sameDate;
  const selectedByRespondent = new Map<string, T>();

  for (const submission of selectedScope) {
    const current = selectedByRespondent.get(submission.respondentId);

    if (!current || shouldReplaceSubmission(current, submission)) {
      selectedByRespondent.set(submission.respondentId, submission);
    }
  }

  return [...selectedByRespondent.values()];
}

function getPreviousSubmissionValue<
  T extends {
    deliveryBasisId: string;
    priceUsdPerMt: { toNumber(): number };
    respondentId: string;
    source: string;
    tradeDate: Date;
    updatedAt: Date;
  },
>({
  commoditySubmissions,
  currentDate,
  preferredBasisId,
}: {
  commoditySubmissions: T[];
  currentDate: string;
  preferredBasisId: string | undefined;
}) {
  const previousDates = [
    ...new Set(
      commoditySubmissions
        .map((submission) => submission.tradeDate.toISOString().slice(0, 10))
        .filter((date) => date < currentDate),
    ),
  ].sort((first, second) => second.localeCompare(first));

  for (const previousDate of previousDates) {
    const selected = selectSubmissionsForDate(
      commoditySubmissions,
      previousDate,
      preferredBasisId,
    );

    if (selected.length > 0) {
      return averageSubmissions(selected);
    }
  }

  return null;
}

function averageSubmissions<T extends { priceUsdPerMt: { toNumber(): number } }>(
  submissions: T[],
) {
  return roundToOneDecimal(
    submissions.reduce((sum, submission) => sum + submission.priceUsdPerMt.toNumber(), 0) /
      submissions.length,
  );
}

function shouldReplaceSubmission<T extends { source: string; updatedAt: Date }>(
  current: T,
  candidate: T,
) {
  if (current.source !== candidate.source) {
    return candidate.source === "admin";
  }

  return candidate.updatedAt > current.updatedAt;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
