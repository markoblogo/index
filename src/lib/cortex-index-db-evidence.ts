import "server-only";

import { db } from "@/lib/db";
import type { CortexMarketReportInput } from "@/lib/commodity-intelligence-layer";

export type CortexIndexDbEvidence = {
  calculationEvidence: NonNullable<CortexMarketReportInput["calculationEvidence"]>;
  respondentInputs: NonNullable<CortexMarketReportInput["respondentInputs"]>;
};

type CortexIndexEvidenceClient = {
  indexCalculation: {
    findMany(args: unknown): Promise<IndexCalculationRow[]>;
  };
  priceSubmission: {
    findMany(args: unknown): Promise<PriceSubmissionRow[]>;
  };
};

type DecimalLike = {
  toNumber(): number;
};

type PriceSubmissionRow = {
  id: string;
  tradeDate: Date;
  source: "admin" | "respondent" | "spike";
  status: string;
  priceUsdPerMt: DecimalLike;
  submittedAt: Date | null;
  createdAt: Date;
  commodity: {
    code: string;
    nameEn: string;
  };
  deliveryBasis: {
    code: string;
    name: string;
  };
  respondent: {
    collectionMode: string;
    id: string;
  };
};

type IndexCalculationRow = {
  id: string;
  calculatedAt: Date;
  medianUsdPerMt: DecimalLike | null;
  publicValueUsdPerMt: DecimalLike | null;
  rawCount: number;
  status: string;
  usedCount: number;
  version: number;
  basket: {
    code: string;
  };
  commodity: {
    code: string;
    nameEn: string;
  };
  deliveryBasis: {
    code: string;
    name: string;
  };
  items: Array<{
    deviationPct: DecimalLike | null;
    exclusionReason: string | null;
    included: boolean;
    respondentId: string | null;
  }>;
  publishedIndex: {
    locked: boolean;
    valueUsdPerMt: DecimalLike;
  } | null;
};

export async function buildCortexIndexDbEvidence(input: {
  client?: CortexIndexEvidenceClient;
  limit?: number;
  periodEndDate: string;
  periodStartDate: string;
  tenantId?: string;
}): Promise<CortexIndexDbEvidence> {
  const client = input.client ?? db;
  const limit = normalizeLimit(input.limit);
  const period = buildDateRange(input.periodStartDate, input.periodEndDate);

  const [submissions, calculations] = await Promise.all([
    client.priceSubmission.findMany({
      include: {
        commodity: { select: { code: true, nameEn: true } },
        deliveryBasis: { select: { code: true, name: true } },
        respondent: { select: { collectionMode: true, id: true } },
      },
      orderBy: [{ tradeDate: "desc" }, { updatedAt: "desc" }],
      take: limit,
      where: {
        tradeDate: {
          gte: period.start,
          lte: period.end,
        },
        status: { in: ["submitted", "verified", "published"] },
      },
    }),
    client.indexCalculation.findMany({
      include: {
        basket: { select: { code: true } },
        commodity: { select: { code: true, nameEn: true } },
        deliveryBasis: { select: { code: true, name: true } },
        items: {
          select: {
            deviationPct: true,
            exclusionReason: true,
            included: true,
            respondentId: true,
          },
        },
        publishedIndex: { select: { locked: true, valueUsdPerMt: true } },
      },
      orderBy: [{ tradeDate: "desc" }, { calculatedAt: "desc" }],
      take: limit,
      where: {
        tradeDate: {
          gte: period.start,
          lte: period.end,
        },
      },
    }),
  ]);

  return {
    calculationEvidence: calculations.map((calculation) =>
      mapCalculationToEvidence(calculation, input.tenantId ?? "spike-ua"),
    ),
    respondentInputs: submissions.map((submission) =>
      mapSubmissionToEvidence(submission, input.tenantId ?? "spike-ua"),
    ),
  };
}

function mapSubmissionToEvidence(
  submission: PriceSubmissionRow,
  tenantId: string,
): NonNullable<CortexMarketReportInput["respondentInputs"]>[number] {
  return {
    basis: submission.deliveryBasis.code,
    commodityCode: submission.commodity.code,
    id: submission.id,
    respondentType: `${submission.source}:${submission.respondent.collectionMode}`,
    submittedAt: submission.submittedAt ?? submission.createdAt,
    summary: [
      `source=${submission.source}`,
      `status=${submission.status}`,
      `basis=${submission.deliveryBasis.name}`,
      `respondentRef=${redactRespondentId(submission.respondent.id)}`,
    ].join("; "),
    tenantId,
    valueUsdPerMt: submission.priceUsdPerMt.toNumber(),
  };
}

function mapCalculationToEvidence(
  calculation: IndexCalculationRow,
  tenantId: string,
): NonNullable<CortexMarketReportInput["calculationEvidence"]>[number] {
  const excluded = calculation.items.filter((item) => !item.included);
  const exclusionReasons = Array.from(new Set(
    excluded.map((item) => item.exclusionReason).filter((reason): reason is string => Boolean(reason)),
  ));

  return {
    basis: calculation.deliveryBasis.code,
    calculatedAt: calculation.calculatedAt,
    commodityCode: calculation.commodity.code,
    id: calculation.id,
    summary: [
      `status=${calculation.status}`,
      `version=${calculation.version}`,
      `basket=${calculation.basket.code}`,
      `rawCount=${calculation.rawCount}`,
      `usedCount=${calculation.usedCount}`,
      `excludedCount=${excluded.length}`,
      `median=${calculation.medianUsdPerMt?.toNumber() ?? "n/a"}`,
      `publishedLocked=${calculation.publishedIndex?.locked ?? false}`,
      exclusionReasons.length > 0 ? `exclusionReasons=${exclusionReasons.join(",")}` : null,
    ].filter(Boolean).join("; "),
    tenantId,
    valueUsdPerMt: calculation.publishedIndex?.valueUsdPerMt.toNumber()
      ?? calculation.publicValueUsdPerMt?.toNumber()
      ?? null,
  };
}

function buildDateRange(periodStartDate: string, periodEndDate: string) {
  return {
    end: dateToUtcDate(periodEndDate),
    start: dateToUtcDate(periodStartDate),
  };
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function normalizeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 200;
  return Math.max(1, Math.min(1_000, Math.trunc(value ?? 200)));
}

function redactRespondentId(respondentId: string) {
  if (respondentId === "MN7R_MONITOR") return "MN7R_MONITOR";
  let hash = 0;
  for (const char of respondentId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return `respondent:${hash.toString(16).padStart(8, "0")}`;
}
