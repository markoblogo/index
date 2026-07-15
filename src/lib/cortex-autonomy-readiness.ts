import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  evaluateCortexEditorialPromotion,
  type CortexEditorialPromotionKind,
  type CortexEditorialPromotionMode,
  type CortexEditorialPromotionPolicy,
} from "@/lib/cortex-editorial-promotion";

const TRACKS: CortexEditorialPromotionKind[] = ["daily", "weekly", "monthly"];
const MODE_RANK: Record<CortexEditorialPromotionMode, number> = {
  shadow: 0,
  recommended_candidate: 1,
  promotion_eligible: 2,
};

export type CortexAutonomyReadinessTrack = {
  corpusSize: number;
  factualSafetyFailures: number;
  kind: CortexEditorialPromotionKind;
  minimumSamples: number;
  mode: CortexEditorialPromotionMode;
  reason: string;
  revisedWinRate: number | null;
  revisedWins: number;
  rollbackReason: string | null;
  scoreLift: number | null;
};

export type CortexAutonomyReadinessSnapshot = {
  generatedAt: string;
  highestTrackMode: CortexEditorialPromotionMode;
  id: string;
  product: "1D3X Cortex";
  rollbackCount: number;
  tenantId: string;
  tracks: CortexAutonomyReadinessTrack[];
  visibility: "protected";
};

type ReadinessLedgerRow = { snapshotJson: CortexAutonomyReadinessSnapshot };

let storageReady: Promise<void> | null = null;

export function buildCortexAutonomyReadinessSnapshot(input: {
  generatedAt?: string;
  policies: CortexEditorialPromotionPolicy[];
  previous?: CortexAutonomyReadinessSnapshot | null;
  tenantId: string;
}): CortexAutonomyReadinessSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const previousTracks = new Map(input.previous?.tracks.map((track) => [track.kind, track]) ?? []);
  const tracks = TRACKS.map((kind) => {
    const policy = input.policies.find((item) => item.kind === kind) ?? emptyPolicy(kind);
    const previous = previousTracks.get(kind);
    const rollbackReason = policy.mode === "shadow" && previous && previous.mode !== "shadow"
      ? `Rollback from ${previous.mode}: ${policy.reason}`
      : null;

    return {
      corpusSize: policy.qualifiedPairs,
      factualSafetyFailures: policy.factualSafetyFailures,
      kind,
      minimumSamples: policy.minimumSamples,
      mode: policy.mode,
      reason: policy.reason,
      revisedWinRate: policy.revisedWinRate,
      revisedWins: policy.revisedWins,
      rollbackReason,
      scoreLift: scoreLift(policy),
    };
  });
  const highestTrackMode = tracks.reduce<CortexEditorialPromotionMode>(
    (highest, track) => MODE_RANK[track.mode] > MODE_RANK[highest] ? track.mode : highest,
    "shadow",
  );

  return {
    generatedAt,
    highestTrackMode,
    id: readinessId(input.tenantId, generatedAt),
    product: "1D3X Cortex",
    rollbackCount: tracks.filter((track) => track.rollbackReason !== null).length,
    tenantId: input.tenantId,
    tracks,
    visibility: "protected",
  };
}

export async function runCortexAutonomyReadinessMonitor(input: { tenantId?: string } = {}) {
  const tenantId = input.tenantId ?? getActiveIndexConfig().id;
  const results = await Promise.all(TRACKS.map((kind) => evaluateCortexEditorialPromotion({ kind, tenantId })));
  const previous = hasDatabaseUrl() ? await loadLatestSnapshot(tenantId) : null;
  const snapshot = buildCortexAutonomyReadinessSnapshot({
    policies: results.map((result) => result.policy),
    previous,
    tenantId,
  });

  if (hasDatabaseUrl()) {
    await ensureStorage();
    await persistSnapshot(snapshot);
  }

  return {
    skippedReason: hasDatabaseUrl() ? null : "database_not_configured",
    snapshot,
  };
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

function scoreLift(policy: CortexEditorialPromotionPolicy) {
  if (policy.averageOriginalScore === null || policy.averageRevisedScore === null) return null;
  return Number((policy.averageRevisedScore - policy.averageOriginalScore).toFixed(3));
}

function readinessId(tenantId: string, generatedAt: string) {
  return `cortex-autonomy-readiness:${tenantId}:${generatedAt.slice(0, 10)}`;
}

async function loadLatestSnapshot(tenantId: string) {
  await ensureStorage();
  const rows = await db.$queryRawUnsafe<ReadinessLedgerRow[]>(
    `SELECT "snapshotJson" FROM "CortexAutonomyReadinessLedger" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC LIMIT 1`,
    tenantId,
  );
  return rows[0]?.snapshotJson ?? null;
}

async function persistSnapshot(snapshot: CortexAutonomyReadinessSnapshot) {
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexAutonomyReadinessLedger" ("id", "tenantId", "highestTrackMode", "snapshotJson", "recordHash", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW()) ON CONFLICT ("id") DO UPDATE SET "highestTrackMode" = EXCLUDED."highestTrackMode", "snapshotJson" = EXCLUDED."snapshotJson", "recordHash" = EXCLUDED."recordHash", "updatedAt" = NOW()`,
    snapshot.id,
    snapshot.tenantId,
    snapshot.highestTrackMode,
    JSON.stringify(snapshot),
    createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
  );
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexAutonomyReadinessLedger" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "highestTrackMode" TEXT NOT NULL, "snapshotJson" JSONB NOT NULL, "recordHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CortexAutonomyReadinessLedger_pkey" PRIMARY KEY ("id"))`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexAutonomyReadinessLedger_tenant_updated_idx" ON "CortexAutonomyReadinessLedger"("tenantId", "updatedAt" DESC)`);
  })();
  await storageReady;
}
