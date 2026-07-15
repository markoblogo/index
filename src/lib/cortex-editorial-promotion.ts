import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import type {
  CortexEditorialQualityCandidate,
  CortexEditorialQualityLedgerRecord,
} from "@/lib/cortex-editorial-quality-gate";
import type { CortexEditorialShadowObservation } from "@/lib/cortex-editorial-shadow";

export type CortexEditorialPromotionKind = "daily" | "weekly" | "monthly";
export type CortexEditorialPromotionMode = "shadow" | "recommended_candidate" | "promotion_eligible";

export type CortexEditorialCandidateScore = {
  density: number;
  factualSafety: number;
  humanAlignment: number;
  structure: number;
  total: number;
};

export type CortexEditorialPromotionEvaluation = {
  id: string;
  kind: CortexEditorialPromotionKind;
  original: CortexEditorialCandidateScore | null;
  reason: string;
  recommendedCandidate: "original" | "revised" | null;
  revised: CortexEditorialCandidateScore | null;
  revisedFactualSafe: boolean;
  reportId: string;
  status: "incomplete" | "blocked" | "scored";
};

export type CortexEditorialPromotionPolicy = {
  averageOriginalScore: number | null;
  averageRevisedScore: number | null;
  factualSafetyFailures: number;
  kind: CortexEditorialPromotionKind;
  minimumSamples: number;
  mode: CortexEditorialPromotionMode;
  qualifiedPairs: number;
  reason: string;
  revisedWinRate: number | null;
  revisedWins: number;
};

type QualityLedgerRow = { recordJson: CortexEditorialQualityLedgerRecord };
type ShadowLedgerRow = { observationJson: CortexEditorialShadowObservation };

let storageReady: Promise<void> | null = null;

export function buildCortexEditorialPromotionEvaluation(input: {
  kind: CortexEditorialPromotionKind;
  originalShadow?: CortexEditorialShadowObservation | null;
  qualityCandidate?: CortexEditorialQualityCandidate | null;
  reportId: string;
  revisedShadow?: CortexEditorialShadowObservation | null;
}): CortexEditorialPromotionEvaluation {
  const candidate = input.qualityCandidate;
  if (!candidate?.revised || !candidate.revisedAssessment || !input.originalShadow || !input.revisedShadow) {
    return incompleteEvaluation(input, "Original, revised and matched human-edited observations are required.");
  }
  const original = scoreCandidate(candidate.originalAssessment, input.originalShadow);
  const revised = scoreCandidate(candidate.revisedAssessment, input.revisedShadow);
  const revisedFactualSafe = isFactualSafe(candidate.revisedAssessment);
  const originalFactualSafe = isFactualSafe(candidate.originalAssessment);

  if (!original || !revised || !originalFactualSafe || !revisedFactualSafe) {
    return {
      id: promotionId(input.reportId),
      kind: input.kind,
      original,
      reason: "A candidate failed factual safety or lacks a matched human comparison.",
      recommendedCandidate: null,
      revised,
      revisedFactualSafe,
      reportId: input.reportId,
      status: "blocked",
    };
  }

  const revisedWins = revised.total > original.total + 0.025;
  return {
    id: promotionId(input.reportId),
    kind: input.kind,
    original,
    reason: revisedWins
      ? "Revised candidate leads original on the deterministic shadow score."
      : "Original candidate remains equal or stronger on the deterministic shadow score.",
    recommendedCandidate: revisedWins ? "revised" : "original",
    revised,
    revisedFactualSafe,
    reportId: input.reportId,
    status: "scored",
  };
}

export function buildCortexEditorialPromotionPolicy(input: {
  evaluations: CortexEditorialPromotionEvaluation[];
  kind: CortexEditorialPromotionKind;
}): CortexEditorialPromotionPolicy {
  const qualified = input.evaluations.filter((item) => item.status === "scored" && item.original && item.revised);
  const minimumSamples = input.kind === "daily" ? 20 : 8;
  const revisedWins = qualified.filter((item) => item.recommendedCandidate === "revised").length;
  const factualSafetyFailures = input.evaluations.filter(
    (item) => item.status === "blocked" && !item.revisedFactualSafe,
  ).length;
  const averageOriginalScore = average(qualified.map((item) => item.original!.total));
  const averageRevisedScore = average(qualified.map((item) => item.revised!.total));
  const revisedWinRate = qualified.length > 0 ? revisedWins / qualified.length : null;
  const scoreLift = averageOriginalScore !== null && averageRevisedScore !== null
    ? averageRevisedScore - averageOriginalScore
    : null;
  const stableWin = qualified.length >= minimumSamples &&
    factualSafetyFailures === 0 &&
    revisedWinRate !== null && revisedWinRate >= 0.65 &&
    scoreLift !== null && scoreLift >= 0.03;
  const mode: CortexEditorialPromotionMode = stableWin
    ? qualified.length >= minimumSamples * 2 ? "promotion_eligible" : "recommended_candidate"
    : "shadow";

  return {
    averageOriginalScore,
    averageRevisedScore,
    factualSafetyFailures,
    kind: input.kind,
    minimumSamples,
    mode,
    qualifiedPairs: qualified.length,
    reason: mode === "shadow"
      ? `Shadow mode: need ${minimumSamples} factual-safe scored pairs, >=65% revised wins and >=0.03 average score lift.`
      : mode === "recommended_candidate"
        ? "Revised is statistically ahead; emit recommendations only while a second confirmation corpus accumulates."
        : "Revised has two confirmation cohorts and is eligible for a separately approved delivery cutover.",
    revisedWinRate: revisedWinRate === null ? null : round(revisedWinRate),
    revisedWins,
  };
}

export async function evaluateCortexEditorialPromotion(input: {
  kind: CortexEditorialPromotionKind;
  limit?: number;
  tenantId?: string;
}) {
  const emptyPolicy = buildCortexEditorialPromotionPolicy({ evaluations: [], kind: input.kind });
  if (!hasDatabaseUrl()) return { evaluations: [] as CortexEditorialPromotionEvaluation[], policy: emptyPolicy, skippedReason: "database_not_configured" };

  await ensureStorage();
  const tenantId = input.tenantId ?? getActiveIndexConfig().id;
  const qualityRows = await db.$queryRawUnsafe<QualityLedgerRow[]>(
    `SELECT "recordJson" FROM "CortexEditorialQualityLedger" WHERE "tenantId" = $1 AND "kind" = $2 ORDER BY "updatedAt" DESC LIMIT $3`,
    tenantId,
    input.kind,
    Math.max(1, Math.min(120, Math.trunc(input.limit ?? 60))),
  );
  const qualityRecords = qualityRows.map((row) => row.recordJson).filter((record) => record?.reportId);
  if (qualityRecords.length === 0) return { evaluations: [] as CortexEditorialPromotionEvaluation[], policy: emptyPolicy, skippedReason: null };

  const reportIds = qualityRecords.map((record) => record.reportId);
  const shadowRows = await db.$queryRawUnsafe<ShadowLedgerRow[]>(
    `SELECT "observationJson" FROM "CortexEditorialShadowLedger" WHERE "tenantId" = $1 AND "kind" = $2 AND "reportId" = ANY($3)`,
    tenantId,
    input.kind,
    reportIds,
  );
  const shadows = new Map(shadowRows.map((row) => [`${row.observationJson.reportId}:${row.observationJson.candidate}`, row.observationJson]));
  const evaluations = qualityRecords.map((record) => {
    const candidate = record.qualityCandidates.uk ?? record.qualityCandidates.en;
    return buildCortexEditorialPromotionEvaluation({
      kind: input.kind,
      originalShadow: shadows.get(`${record.reportId}:original`) ?? null,
      qualityCandidate: candidate,
      reportId: record.reportId,
      revisedShadow: shadows.get(`${record.reportId}:revised`) ?? null,
    });
  });
  const policy = buildCortexEditorialPromotionPolicy({ evaluations, kind: input.kind });
  await Promise.all(evaluations.map((evaluation) => persistPromotionEvaluation({ evaluation, policy, tenantId })));
  return { evaluations, policy, skippedReason: null };
}

function scoreCandidate(
  assessment: CortexEditorialQualityCandidate["originalAssessment"],
  shadow: CortexEditorialShadowObservation,
): CortexEditorialCandidateScore | null {
  if (shadow.status !== "matched" || !shadow.metrics || shadow.matchScore === null) return null;
  const factualSafety = isFactualSafe(assessment) ? 1 : 0;
  const structure = clamp(1 - (assessment.metrics.duplicateLineCount * 0.2) - (assessment.metrics.emptyLineCount * 0.2));
  const density = clamp(1 - Math.abs(assessment.metrics.wordCount - shadow.metrics.editorialWordCount) / Math.max(shadow.metrics.editorialWordCount, 1));
  const humanAlignment = clamp(shadow.matchScore);
  return {
    density: round(density),
    factualSafety,
    humanAlignment: round(humanAlignment),
    structure: round(structure),
    total: round(factualSafety * 0.45 + humanAlignment * 0.3 + structure * 0.15 + density * 0.1),
  };
}

function isFactualSafe(assessment: CortexEditorialQualityCandidate["originalAssessment"]) {
  return assessment.factualValidation?.status === "passed";
}

function incompleteEvaluation(input: {
  kind: CortexEditorialPromotionKind;
  reportId: string;
}, reason: string): CortexEditorialPromotionEvaluation {
  return {
    id: promotionId(input.reportId),
    kind: input.kind,
    original: null,
    reason,
    recommendedCandidate: null,
    revised: null,
    revisedFactualSafe: false,
    reportId: input.reportId,
    status: "incomplete",
  };
}

function promotionId(reportId: string) {
  return `cortex-editorial-promotion:${reportId}`;
}

function average(values: number[]) {
  return values.length === 0 ? null : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round(value: number) {
  return Number(value.toFixed(3));
}

async function persistPromotionEvaluation(input: {
  evaluation: CortexEditorialPromotionEvaluation;
  policy: CortexEditorialPromotionPolicy;
  tenantId: string;
}) {
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexEditorialPromotionLedger" ("id", "tenantId", "reportId", "kind", "status", "recommendedCandidate", "recordHash", "recordJson", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW()) ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status", "recommendedCandidate" = EXCLUDED."recommendedCandidate", "recordHash" = EXCLUDED."recordHash", "recordJson" = EXCLUDED."recordJson", "updatedAt" = NOW()`,
    input.evaluation.id,
    input.tenantId,
    input.evaluation.reportId,
    input.evaluation.kind,
    input.evaluation.status,
    input.evaluation.recommendedCandidate,
    createHash("sha256").update(JSON.stringify({ evaluation: input.evaluation, policy: input.policy })).digest("hex"),
    JSON.stringify({ evaluation: input.evaluation, policy: input.policy }),
  );
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexEditorialPromotionLedger" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "reportId" TEXT NOT NULL, "kind" TEXT NOT NULL, "status" TEXT NOT NULL, "recommendedCandidate" TEXT, "recordHash" TEXT NOT NULL, "recordJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CortexEditorialPromotionLedger_pkey" PRIMARY KEY ("id"))`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexEditorialPromotionLedger_tenant_kind_idx" ON "CortexEditorialPromotionLedger"("tenantId", "kind", "updatedAt" DESC)`);
  })();
  await storageReady;
}
