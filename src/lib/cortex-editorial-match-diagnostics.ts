import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  evaluateCortexEditorialPromotion,
  type CortexEditorialPromotionKind,
  type CortexEditorialPromotionPolicy,
} from "@/lib/cortex-editorial-promotion";
import type { CortexEditorialShadowObservation, CortexEditorialShadowStatus } from "@/lib/cortex-editorial-shadow";

const KINDS: CortexEditorialPromotionKind[] = ["daily", "weekly", "monthly"];

export type CortexEditorialMatchDiagnostics = {
  coverageRate: number | null;
  generatedAt: string;
  id: string;
  kind: CortexEditorialPromotionKind;
  legacyOriginalOnlyReports: number;
  matchedPairs: number;
  product: "1D3X Cortex";
  promotionQualifiedPairs: number;
  reasonCounts: Array<{
    count: number;
    reason: "ambiguous_competing_posts" | "awaiting_editorial" | "low_lexical_overlap" | "low_overlap_single_candidate" | "unknown_reason";
  }>;
  reportsWithCandidatePair: number;
  scannedReports: number;
  statusCounts: Record<CortexEditorialShadowStatus, number>;
  tenantId: string;
  visibility: "protected";
};

export type CortexEditorialUnknownReasonSample = {
  candidate: CortexEditorialShadowObservation["candidate"];
  candidateCount: number;
  generatedAt: string;
  id: string;
  kind: CortexEditorialPromotionKind;
  matchingReason: string;
  matchScore: number | null;
  reportId: string;
  status: CortexEditorialShadowObservation["status"];
};

export type CortexEditorialMatchUnknownReasonDebug = {
  generatedAt: string;
  kind: CortexEditorialPromotionKind;
  samples: CortexEditorialUnknownReasonSample[];
  tenantId: string;
  totalScanned: number;
  totalUnknownReason: number;
  visibility: "protected";
};

export type CortexEditorialMatchDiagnosticsHistoryPoint = {
  coverageRate: number | null;
  generatedAt: string;
  kind: CortexEditorialPromotionKind;
  matchedPairs: number;
  reasons: Array<{ count: number; reason: CortexEditorialMatchDiagnostics["reasonCounts"][number]["reason"] }>;
  reportsWithCandidatePair: number;
  scannedReports: number;
};

type ShadowLedgerRow = { observationJson: CortexEditorialShadowObservation };

let storageReady: Promise<void> | null = null;

export function buildCortexEditorialMatchDiagnostics(input: {
  generatedAt?: string;
  kind: CortexEditorialPromotionKind;
  observations: CortexEditorialShadowObservation[];
  policy: CortexEditorialPromotionPolicy;
  tenantId: string;
}): CortexEditorialMatchDiagnostics {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const reportCandidates = new Map<string, Set<CortexEditorialShadowObservation["candidate"]>>();
  const matchedCandidates = new Map<string, Set<CortexEditorialShadowObservation["candidate"]>>();
  const statusCounts = { matched: 0, ambiguous: 0, awaiting_editorial: 0 };
  const reasonMap = new Map<CortexEditorialMatchDiagnostics["reasonCounts"][number]["reason"], number>();

  for (const observation of input.observations) {
    statusCounts[observation.status] += 1;
    const candidates = reportCandidates.get(observation.reportId) ?? new Set();
    candidates.add(observation.candidate);
    reportCandidates.set(observation.reportId, candidates);
    if (observation.status === "matched") {
      const matched = matchedCandidates.get(observation.reportId) ?? new Set();
      matched.add(observation.candidate);
      matchedCandidates.set(observation.reportId, matched);
    } else {
      const reason = classifyGap(observation);
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
    }
  }

  const reportsWithCandidatePair = [...reportCandidates.values()].filter((candidates) => candidates.has("original") && candidates.has("revised")).length;
  const matchedPairs = [...matchedCandidates.values()].filter((candidates) => candidates.has("original") && candidates.has("revised")).length;

  return {
    coverageRate: reportsWithCandidatePair === 0 ? null : round(matchedPairs / reportsWithCandidatePair),
    generatedAt,
    id: diagnosticsId(input.tenantId, input.kind, generatedAt),
    kind: input.kind,
    legacyOriginalOnlyReports: [...reportCandidates.values()].filter((candidates) => candidates.has("original") && !candidates.has("revised")).length,
    matchedPairs,
    product: "1D3X Cortex",
    promotionQualifiedPairs: input.policy.qualifiedPairs,
    reasonCounts: [...reasonMap.entries()]
      .map(([reason, count]) => ({ count, reason }))
      .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason)),
    reportsWithCandidatePair,
    scannedReports: reportCandidates.size,
    statusCounts,
    tenantId: input.tenantId,
    visibility: "protected",
  };
}

export async function runCortexEditorialMatchDiagnostics(input: {
  kind?: CortexEditorialPromotionKind;
  limit?: number;
  tenantId?: string;
} = {}) {
  const tenantId = input.tenantId ?? getActiveIndexConfig().id;
  const kinds = input.kind ? [input.kind] : KINDS;
  if (!hasDatabaseUrl()) {
    return {
      diagnostics: kinds.map((kind) => buildCortexEditorialMatchDiagnostics({ kind, observations: [], policy: emptyPolicy(kind), tenantId })),
      skippedReason: "database_not_configured",
    };
  }

  await ensureStorage();
  const diagnostics = await Promise.all(kinds.map(async (kind) => {
    const promotion = await evaluateCortexEditorialPromotion({ kind, limit: input.limit, tenantId });
    const rows = await db.$queryRawUnsafe<ShadowLedgerRow[]>(
      `SELECT "observationJson" FROM "CortexEditorialShadowLedger" WHERE "tenantId" = $1 AND "kind" = $2 ORDER BY "updatedAt" DESC LIMIT $3`,
      tenantId,
      kind,
      Math.max(1, Math.min(120, Math.trunc(input.limit ?? 60) * 2)),
    );
    const diagnostic = buildCortexEditorialMatchDiagnostics({
      kind,
      observations: rows.map((row) => row.observationJson),
      policy: promotion.policy,
      tenantId,
    });
    await persistDiagnostics(diagnostic);
    return diagnostic;
  }));

  return { diagnostics, skippedReason: null };
}

export async function runCortexEditorialUnknownReasonDebug(input: {
  kind?: CortexEditorialPromotionKind;
  limit?: number;
  sampleLimit?: number;
  tenantId?: string;
}): Promise<CortexEditorialMatchUnknownReasonDebug> {
  const tenantId = input?.tenantId ?? getActiveIndexConfig().id;
  const kind = input?.kind ?? "daily";
  const debugLimit = Math.max(1, Math.min(240, Math.trunc(input?.limit ?? 60)));
  const sampleLimit = Math.max(1, Math.min(200, Math.trunc(input?.sampleLimit ?? 20)));
  if (!hasDatabaseUrl()) {
    return {
      generatedAt: new Date().toISOString(),
      kind,
      samples: [],
      tenantId,
      totalScanned: 0,
      totalUnknownReason: 0,
      visibility: "protected",
    };
  }

  await ensureStorage();
  const rows = await db.$queryRawUnsafe<ShadowLedgerRow[]>(
    `SELECT "observationJson" FROM "CortexEditorialShadowLedger" WHERE "tenantId" = $1 AND "kind" = $2 ORDER BY "updatedAt" DESC LIMIT $3`,
    tenantId,
    kind,
    debugLimit,
  );
  const observations = rows.map((row) => row.observationJson);
  const unknownSamples = collectUnknownReasonSamples({ kind, observations, limit: sampleLimit });

  return {
    generatedAt: new Date().toISOString(),
    kind,
    samples: unknownSamples,
    tenantId,
    totalScanned: observations.length,
    totalUnknownReason: observations.filter((observation) => classifyGap(observation) === "unknown_reason").length,
    visibility: "protected",
  };
}

function collectUnknownReasonSamples(input: {
  kind: CortexEditorialPromotionKind;
  observations: CortexEditorialShadowObservation[];
  limit: number;
}): CortexEditorialUnknownReasonSample[] {
  return observations
    .filter((observation) => classifyGap(observation) === "unknown_reason")
    .slice(0, input.limit)
    .map((observation) => ({
      candidate: observation.candidate,
      candidateCount: observation.candidateCount,
      generatedAt: observation.generatedAt,
      id: observation.id,
      kind: input.kind,
      matchingReason: observation.matchingReason,
      matchScore: observation.matchScore,
      reportId: observation.reportId,
      status: observation.status,
    }));
}

export async function getCortexEditorialMatchDiagnosticsHistory(input: {
  kind?: CortexEditorialPromotionKind;
  limit?: number;
  tenantId?: string;
} = {}): Promise<CortexEditorialMatchDiagnosticsHistoryPoint[]> {
  const tenantId = input.tenantId ?? getActiveIndexConfig().id;
  const kind = input.kind ?? "daily";
  if (!hasDatabaseUrl()) return [];

  await ensureStorage();
  const rows = await db.$queryRawUnsafe<Array<{ recordJson: CortexEditorialMatchDiagnostics }>>(
    `SELECT "recordJson" FROM "CortexEditorialMatchDiagnosticsLedger" WHERE "tenantId" = $1 AND "kind" = $2 ORDER BY "updatedAt" DESC LIMIT $3`,
    tenantId,
    kind,
    Math.max(1, Math.min(30, Math.trunc(input.limit ?? 14))),
  );
  return rows.map((row) => ({
    coverageRate: row.recordJson.coverageRate,
    generatedAt: row.recordJson.generatedAt,
    kind: row.recordJson.kind,
    matchedPairs: row.recordJson.matchedPairs,
    reasons: row.recordJson.reasonCounts,
    reportsWithCandidatePair: row.recordJson.reportsWithCandidatePair,
    scannedReports: row.recordJson.scannedReports,
  }));
}

function classifyGap(observation: CortexEditorialShadowObservation) {
  if (observation.status === "awaiting_editorial") return "awaiting_editorial" as const;
  const matchingReason = observation.matchingReason.trim().toLowerCase();
  const matchScore = observation.matchScore;
  const candidateCount = observation.candidateCount;
  if (!matchingReason) {
    if (candidateCount === 1) return "low_overlap_single_candidate" as const;
    if (matchScore === null) return "unknown_reason" as const;
    if (matchScore < 0.16) return "low_lexical_overlap" as const;
    if (candidateCount > 1) return "ambiguous_competing_posts" as const;
    return "low_lexical_overlap" as const;
  }
  if (matchingReason.includes("too close")) return "ambiguous_competing_posts" as const;
  if (matchingReason.includes("no lexical")) return "low_lexical_overlap" as const;
  if (matchingReason.includes("below the automatic-match threshold")) return "low_lexical_overlap" as const;
  if (matchingReason.includes("single candidate")) return "low_overlap_single_candidate" as const;
  if (matchingReason.includes("low overlap")) return "low_lexical_overlap" as const;
  return "unknown_reason" as const;
}

function emptyPolicy(kind: CortexEditorialPromotionKind): CortexEditorialPromotionPolicy {
  return {
    averageOriginalScore: null,
    averageRevisedScore: null,
    factualSafetyFailures: 0,
    kind,
    minimumSamples: kind === "daily" ? 20 : 8,
    mode: "shadow",
    qualifiedPairs: 0,
    reason: "Shadow mode: no promotion evaluation is available yet.",
    revisedWinRate: null,
    revisedWins: 0,
  };
}

function diagnosticsId(tenantId: string, kind: CortexEditorialPromotionKind, generatedAt: string) {
  return `cortex-editorial-match-diagnostics:${tenantId}:${kind}:${generatedAt.slice(0, 10)}`;
}

function round(value: number) {
  return Number(value.toFixed(3));
}

async function persistDiagnostics(diagnostics: CortexEditorialMatchDiagnostics) {
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexEditorialMatchDiagnosticsLedger" ("id", "tenantId", "kind", "coverageRate", "recordHash", "recordJson", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW()) ON CONFLICT ("id") DO UPDATE SET "coverageRate" = EXCLUDED."coverageRate", "recordHash" = EXCLUDED."recordHash", "recordJson" = EXCLUDED."recordJson", "updatedAt" = NOW()`,
    diagnostics.id,
    diagnostics.tenantId,
    diagnostics.kind,
    diagnostics.coverageRate,
    createHash("sha256").update(JSON.stringify(diagnostics)).digest("hex"),
    JSON.stringify(diagnostics),
  );
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexEditorialMatchDiagnosticsLedger" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "kind" TEXT NOT NULL, "coverageRate" DOUBLE PRECISION, "recordHash" TEXT NOT NULL, "recordJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CortexEditorialMatchDiagnosticsLedger_pkey" PRIMARY KEY ("id"))`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexEditorialMatchDiagnosticsLedger_tenant_kind_updated_idx" ON "CortexEditorialMatchDiagnosticsLedger"("tenantId", "kind", "updatedAt" DESC)`);
  })();
  await storageReady;
}
