import { db } from "@/lib/db";

type CommodityRef = {
  id: string;
};

type BasisRef = {
  id: string;
};

export type SubmissionFallback = {
  date: string;
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
      status: { in: ["submitted", "verified", "published"] },
      tradeDate: { lte: visibleTradeDate },
    },
  });
  const submissionsByCommodity = new Map<string, typeof submissions>();

  for (const submission of submissions) {
    if (submission.deliveryBasisId !== basisByCommodityId.get(submission.commodityId)?.id) {
      continue;
    }

    const current = submissionsByCommodity.get(submission.commodityId) ?? [];
    current.push(submission);
    submissionsByCommodity.set(submission.commodityId, current);
  }

  const fallbackByCommodityId = new Map<string, SubmissionFallback>();

  for (const [commodityId, commoditySubmissions] of submissionsByCommodity) {
    const latestTradeDate = commoditySubmissions[0]?.tradeDate;

    if (!latestTradeDate) {
      continue;
    }

    const latestTradeDateIso = latestTradeDate.toISOString().slice(0, 10);
    const selectedByRespondent = new Map<string, (typeof commoditySubmissions)[number]>();

    for (const submission of commoditySubmissions) {
      if (submission.tradeDate.toISOString().slice(0, 10) !== latestTradeDateIso) {
        continue;
      }

      const current = selectedByRespondent.get(submission.respondentId);

      if (!current || shouldReplaceSubmission(current, submission)) {
        selectedByRespondent.set(submission.respondentId, submission);
      }
    }

    const selectedSubmissions = [...selectedByRespondent.values()];

    if (selectedSubmissions.length === 0) {
      continue;
    }

    const latestUpdatedAt =
      selectedSubmissions
        .map((submission) => submission.updatedAt)
        .sort((first, second) => second.getTime() - first.getTime())[0] ?? new Date();

    fallbackByCommodityId.set(commodityId, {
      date: latestTradeDateIso,
      rawCount: selectedSubmissions.length,
      updatedAt: latestUpdatedAt,
      value: roundToOneDecimal(
        selectedSubmissions.reduce(
          (sum, submission) => sum + submission.priceUsdPerMt.toNumber(),
          0,
        ) / selectedSubmissions.length,
      ),
    });
  }

  return fallbackByCommodityId;
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
